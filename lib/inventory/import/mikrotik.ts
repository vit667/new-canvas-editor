import type { Parser } from './types';
import { DraftBuilder, addInterfaceIp, devKey, ifKey, parseVlanList, vlanKey } from './util';

/** RouterOS: разбить «key=value key2="value с пробелами"» */
function kv(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w.-]+)=("(?:[^"\\]|\\.)*"|\S+)/g)) out[m[1]] = m[2].replace(/^"|"$/g, '');
  const find = s.match(/\[\s*find\s+([^\]]+)\]/);
  if (find) Object.assign(out, Object.fromEntries(Object.entries(kv(find[1])).map(([k, v]) => [`find:${k}`, v])));
  return out;
}

const ifType = (name: string) =>
  /^(sfp|qsfp)/i.test(name) ? { type: /^qsfp/i.test(name) ? 'qsfp' : 'sfp+' } : /^ether/i.test(name) ? { type: 'rj45' } : /^(vlan|bridge|lo|wg|ovpn|pppoe)/i.test(name) ? { type: 'virtual' } : {};

/** MikroTik RouterOS: /export (опционально + /system routerboard print) */
export const mikrotikParser: Parser = {
  id: 'mikrotik',
  label: 'MikroTik RouterOS',
  hint: '/export (можно добавить /system routerboard print)',
  detect(text) {
    let score = 0;
    if (/^\/(interface|ip|system)\b/m.test(text)) score += 0.5;
    if (/by RouterOS|software id =|default-name=ether\d/i.test(text)) score += 0.4;
    if (/^\s*(add|set)\s+.*=/m.test(text)) score += 0.1;
    return Math.min(1, score);
  },
  parse(text) {
    const b = new DraftBuilder('mikrotik');
    // Склеить переносы «\» в конце строки
    const lines = text.replace(/\\\r?\n\s*/g, '').split(/\r?\n/);
    let section = '';
    const sections: { section: string; cmd: string; args: Record<string, string> }[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const sec = line.match(/^(\/[\w\- /]+?)(?:\s+(add|set)\s+(.*))?$/);
      if (sec && line.startsWith('/')) {
        section = sec[1].trim();
        if (sec[2]) sections.push({ section, cmd: sec[2], args: kv(sec[3]) });
        continue;
      }
      const cmd = line.match(/^(add|set)\s+(.*)$/);
      if (cmd) sections.push({ section, cmd: cmd[1], args: kv(cmd[2]) });
    }
    const of = (s: string) => sections.filter((x) => x.section === s);

    const host = of('/system identity')[0]?.args.name ?? text.match(/^\s*name:\s*(\S+)/m)?.[1];
    if (!host) {
      b.warnings.push('Не найдено имя: в /export нет «/system identity set name=…»');
      return b.result('MikroTik: без имени');
    }
    const model = text.match(/^#\s*model\s*=\s*(.+)$/m)?.[1]?.trim() ?? text.match(/^\s*model:\s*(.+)$/m)?.[1]?.trim();
    const serial = text.match(/^#\s*serial number\s*=\s*(\S+)/m)?.[1] ?? text.match(/^\s*serial-number:\s*(\S+)/m)?.[1];
    const version = text.match(/by RouterOS\s+(\S+)/)?.[1] ?? text.match(/^\s*current-firmware:\s*(\S+)/m)?.[1];
    b.entity({
      key: devKey(host),
      kind: 'device',
      name: host,
      attrs: { vendor: 'MikroTik', model: model ? `MikroTik ${model}` : undefined, serial, platform: version ? `RouterOS ${version}` : 'RouterOS', hostname: host },
      match: { serial, hostname: host },
    });

    // Физические порты: «set [ find default-name=ether1 ] name=… comment=…»
    const names = new Map<string, string>(); // default-name → name
    let order = 0;
    for (const e of [...of('/interface ethernet'), ...of('/interface ethernet switch port')]) {
      const def = e.args['find:default-name'] ?? e.args['default-name'];
      if (!def) continue;
      const name = e.args.name ?? def;
      names.set(def, name);
      b.entity({
        key: ifKey(host, name),
        kind: 'interface',
        name,
        description: e.args.comment,
        attrs: { ...ifType(def), enabled: e.args.disabled !== 'yes', order: order++ },
        refs: { deviceId: devKey(host) },
      });
    }

    // VLAN-интерфейсы
    for (const v of of('/interface vlan')) {
      const vid = Number(v.args['vlan-id']);
      if (!vid) continue;
      b.entity({ key: vlanKey(vid), kind: 'vlan', name: v.args.comment ?? `VLAN ${vid}`, attrs: { vid } });
      b.entity({ key: ifKey(host, v.args.name), kind: 'interface', name: v.args.name, attrs: { type: 'virtual', mode: 'routed', enabled: true }, refs: { deviceId: devKey(host) } });
    }

    // Порты моста: pvid → access-VLAN
    for (const p of of('/interface bridge port')) {
      const iface = p.args.interface;
      if (!iface) continue;
      const pvid = Number(p.args.pvid);
      const k = ifKey(host, iface);
      if (!b.entities.has(k)) b.entity({ key: k, kind: 'interface', name: iface, attrs: { ...ifType(iface), enabled: true, order: order++ }, refs: { deviceId: devKey(host) } });
      if (pvid && pvid !== 1) {
        if (!b.entities.has(vlanKey(pvid))) b.entity({ key: vlanKey(pvid), kind: 'vlan', name: `VLAN ${pvid}`, attrs: { vid: pvid } });
        b.entity({ key: k, kind: 'interface', name: iface, attrs: { mode: 'access' }, refs: { untaggedVlanId: vlanKey(pvid) } });
      }
    }
    // Таблица VLAN моста: tagged-порты → trunk
    for (const v of of('/interface bridge vlan')) {
      const vids = parseVlanList(v.args['vlan-ids'] ?? '');
      for (const vid of vids) if (!b.entities.has(vlanKey(vid))) b.entity({ key: vlanKey(vid), kind: 'vlan', name: `VLAN ${vid}`, attrs: { vid } });
      for (const iface of (v.args.tagged ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
        const k = ifKey(host, iface);
        const e = b.entities.get(k);
        if (!e || e.attrs.type === 'virtual') continue;
        e.attrs.mode = 'trunk';
        e.attrs.taggedVlanKeys = [...new Set([...((e.attrs.taggedVlanKeys as string[]) ?? []), ...vids.map(vlanKey)])];
      }
    }

    // Адреса
    for (const a of of('/ip address')) {
      const m = a.args.address?.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
      if (!m) continue;
      const iface = a.args.interface;
      const vlanIf = of('/interface vlan').find((v) => v.args.name === iface);
      if (iface && !b.entities.has(ifKey(host, iface))) b.entity({ key: ifKey(host, iface), kind: 'interface', name: iface, attrs: { type: 'virtual', enabled: true }, refs: { deviceId: devKey(host) } });
      addInterfaceIp(b, { host, iface: iface ?? 'unknown', address: m[1], len: Number(m[2]), vid: vlanIf ? Number(vlanIf.args['vlan-id']) : undefined, hostname: host });
    }

    const res = b.result(`${host}${model ? ` (${model})` : ''}`);
    res.stats = {
      портов: [...b.entities.values()].filter((e) => e.kind === 'interface' && e.attrs.type !== 'virtual').length,
      VLAN: [...b.entities.values()].filter((e) => e.kind === 'vlan').length,
      адресов: of('/ip address').length,
    };
    if (names.size === 0) b.warnings.push('В выводе нет /interface ethernet — порты взяты из таблицы моста');
    return res;
  },
};
