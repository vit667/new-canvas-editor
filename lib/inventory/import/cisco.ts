import type { Parser } from './types';
import {
  DraftBuilder,
  addInterfaceIp,
  configBlocks,
  devKey,
  ifKey,
  ifaceTypeSpeed,
  maskToLen,
  normalizeIfName,
  parseVlanList,
  vlanKey,
  vrfKey,
} from './util';

/**
 * Cisco IOS / IOS-XE (и в основном NX-OS). Понимает в одном тексте:
 *   show running-config · show version · show inventory ·
 *   show cdp neighbors detail · show lldp neighbors detail
 */
export const ciscoParser: Parser = {
  id: 'cisco-ios',
  label: 'Cisco IOS / IOS-XE',
  hint: 'show running-config, show version, show inventory, show cdp/lldp neighbors detail',
  detect(text) {
    let score = 0;
    if (/^hostname\s+\S+/m.test(text)) score += 0.3;
    if (/^interface\s+(GigabitEthernet|TenGigabitEthernet|FastEthernet|Vlan|Port-channel|Ethernet)\S*/m.test(text)) score += 0.3;
    if (/switchport mode (access|trunk)|ip address \d+\.\d+\.\d+\.\d+ \d+\.\d+\.\d+\.\d+/m.test(text)) score += 0.2;
    if (/Cisco IOS|IOS-XE|NX-OS|Processor board ID|PID:\s*\S+\s*,\s*VID:/i.test(text)) score += 0.3;
    if (/^Device ID:/m.test(text)) score += 0.2;
    return Math.min(1, score);
  },
  parse(text) {
    const b = new DraftBuilder('cisco-ios');
    const hostname =
      text.match(/^hostname\s+(\S+)/m)?.[1] ??
      text.match(/^(\S+)\s+uptime is/m)?.[1] ??
      text.match(/^(\S+)[#>]\s*show/m)?.[1];
    if (!hostname) {
      b.warnings.push('Не найден hostname: добавьте строку «hostname …» из running-config или вывод show version');
      return b.result('Cisco: без имени');
    }
    const host = hostname;

    // ─── show version ───
    const version = text.match(/Cisco IOS[^,\n]*Software[^\n]*Version\s+([\w.()\-]+)/i)?.[1] ?? text.match(/^\s*system:\s+version\s+(\S+)/im)?.[1];
    const platform = /NX-OS|nxos/i.test(text) ? 'NX-OS' : /IOS[- ]XE/i.test(text) ? 'IOS-XE' : 'IOS';
    const model =
      text.match(/^Model [Nn]umber\s*:\s*(\S+)/m)?.[1] ??
      text.match(/^cisco\s+(\S+)\s+\(/im)?.[1] ??
      text.match(/^\*?\s*\d+\s+\d+\s+(\S+)\s+\S+\s+\S+/m)?.[1];
    const serial = text.match(/^System [Ss]erial [Nn]umber\s*:\s*(\S+)/m)?.[1] ?? text.match(/Processor board ID\s+(\S+)/)?.[1];

    // ─── Адрес управления: интерфейс с «ip address» в VRF Mgmt / Vlan управления / первый L3 ───
    b.entity({
      key: devKey(host),
      kind: 'device',
      name: host,
      attrs: { role: /^interface Vlan\d+/m.test(text) && /switchport/.test(text) ? 'switch' : undefined, vendor: 'Cisco', model, serial, platform: version ? `${platform} ${version}` : platform, hostname: host },
      match: { serial, hostname: host },
    });

    // ─── show inventory: члены стека, БП, модули, трансиверы ───
    const inv = [...text.matchAll(/NAME:\s*"([^"]+)",\s*DESCR:\s*"([^"]*)"\s*\r?\n\s*PID:\s*([^,]*?)\s*,\s*VID:\s*([^,]*?)\s*,\s*SN:\s*(\S*)/g)];
    let stackMembers = 0;
    for (const m of inv) {
      const [, name, descr, pid, , sn] = m;
      if (!sn) continue;
      if (/stack$/i.test(name)) continue;
      const member = name.match(/^Switch\s+(\d+)$/i);
      if (member) stackMembers++;
      b.entity({
        key: `module:${host.toLowerCase()}:${name}`,
        kind: 'module',
        name: member ? `${host} · член стека ${member[1]}` : `${host} · ${name}`,
        description: descr || undefined,
        attrs: { slot: name, model: pid || undefined, serial: sn },
        refs: { deviceId: devKey(host) },
        match: { serial: sn },
      });
    }
    if (stackMembers > 1) b.entity({ key: devKey(host), kind: 'device', name: host, attrs: { stack: { stackId: host, member: stackMembers } } });

    // ─── VLAN ───
    for (const blk of configBlocks(text, /^vlan\s+([\d,\-\s]+)$/)) {
      const vids = parseVlanList(blk.head[1]);
      const name = blk.body.find((l) => l.startsWith('name '))?.slice(5).trim();
      for (const vid of vids) b.entity({ key: vlanKey(vid), kind: 'vlan', name: vids.length === 1 && name ? name : `VLAN ${vid}`, attrs: { vid } });
    }

    // ─── Интерфейсы ───
    let ifaces = 0;
    for (const [i, blk] of configBlocks(text, /^interface\s+(\S+)/).entries()) {
      const name = normalizeIfName(blk.head[1]);
      const body = blk.body;
      const ts = ifaceTypeSpeed(name);
      const has = (re: RegExp) => body.find((l) => re.test(l));
      const desc = has(/^description\s/)?.replace(/^description\s+/, '');
      const modeLine = has(/^switchport mode\s/);
      const accessVlan = Number(has(/^switchport access vlan\s/)?.split(/\s+/).pop());
      const allowed = has(/^switchport trunk allowed vlan\s/)?.replace(/^switchport trunk allowed vlan\s+(add\s+)?/, '');
      const nativeVlan = Number(has(/^switchport trunk native vlan\s/)?.split(/\s+/).pop());
      const channel = has(/^channel-group\s/)?.match(/channel-group\s+(\d+)/)?.[1];
      const vrf = has(/^(ip )?vrf forwarding\s|^vrf member\s/)?.split(/\s+/).pop();
      const shutdown = body.includes('shutdown');
      const mode: 'access' | 'trunk' | 'routed' | undefined = modeLine?.endsWith('trunk')
        ? 'trunk'
        : modeLine?.endsWith('access') || accessVlan
          ? 'access'
          : body.some((l) => l === 'no switchport') || ts.mode === 'routed'
            ? 'routed'
            : undefined;
      const tagged = mode === 'trunk' && allowed && !/^all$/i.test(allowed) ? parseVlanList(allowed) : [];
      for (const v of [accessVlan, nativeVlan, ...tagged]) {
        if (Number.isInteger(v) && v > 0 && !b.entities.has(vlanKey(v))) b.entity({ key: vlanKey(v), kind: 'vlan', name: `VLAN ${v}`, attrs: { vid: v } });
      }
      const svi = name.match(/^Vlan(\d+)$/)?.[1];
      if (svi && !b.entities.has(vlanKey(svi))) b.entity({ key: vlanKey(svi), kind: 'vlan', name: `VLAN ${svi}`, attrs: { vid: Number(svi) } });
      if (vrf) b.entity({ key: vrfKey(vrf)!, kind: 'vrf', name: vrf, attrs: {} });

      b.entity({
        key: ifKey(host, name),
        kind: 'interface',
        name,
        description: desc,
        attrs: { type: ts.type, speed: ts.speed, mode, enabled: !shutdown, order: i },
        refs: {
          deviceId: devKey(host),
          ...(mode === 'access' && accessVlan ? { untaggedVlanId: vlanKey(accessVlan) } : {}),
          ...(mode === 'trunk' && nativeVlan ? { untaggedVlanId: vlanKey(nativeVlan) } : {}),
          ...(channel ? { lagId: ifKey(host, `Port-channel${channel}`) } : {}),
        },
      });
      if (tagged.length) b.entities.get(ifKey(host, name))!.attrs.taggedVlanKeys = tagged.map((v) => vlanKey(v));
      ifaces++;

      for (const l of body) {
        const ip = l.match(/^ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)(\s+secondary)?/) ?? l.match(/^ip address\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
        if (!ip) continue;
        const len = ip[2].includes('.') ? maskToLen(ip[2]) : Number(ip[2]);
        if (len === null) continue;
        addInterfaceIp(b, { host, iface: name, address: ip[1], len, vrf, vid: svi ? Number(svi) : undefined, hostname: host });
      }
    }

    // ─── Соседи: CDP / LLDP detail ───
    let neighbors = 0;
    const addNeighbor = (local?: string, remoteHost?: string, remotePort?: string, remoteIp?: string, remotePlatform?: string) => {
      if (!local || !remoteHost) return;
      const rh = remoteHost.replace(/\..*$/, ''); // без домена
      const lk = ifKey(host, local);
      if (!b.entities.has(lk)) b.entity({ key: lk, kind: 'interface', name: normalizeIfName(local), attrs: { ...ifaceTypeSpeed(local), enabled: true }, refs: { deviceId: devKey(host) } });
      b.entity({ key: devKey(rh), kind: 'device', name: rh, attrs: { hostname: rh, model: remotePlatform }, match: { hostname: rh, mgmtIp: remoteIp } });
      if (remotePort) {
        const rk = ifKey(rh, remotePort);
        b.entity({ key: rk, kind: 'interface', name: normalizeIfName(remotePort), attrs: { ...ifaceTypeSpeed(remotePort), enabled: true }, refs: { deviceId: devKey(rh) } });
        b.entity({ key: `cable:${[lk, rk].sort().join('|')}`, kind: 'cable', name: `${host} ${normalizeIfName(local)} ↔ ${rh} ${normalizeIfName(remotePort)}`, attrs: {}, refs: { aInterfaceId: lk, bInterfaceId: rk } });
      } else {
        b.relate({ type: 'connected_to', from: lk, to: devKey(rh), props: { kind: 'lldp' } });
      }
      neighbors++;
    };
    for (const chunk of text.split(/^-{5,}\s*$/m)) {
      const dev = chunk.match(/^Device ID:\s*(\S+)/m)?.[1];
      if (dev) {
        const local = chunk.match(/Interface:\s*([^,\s]+)/)?.[1];
        const port = chunk.match(/Port ID \(outgoing port\):\s*(\S+)/)?.[1];
        const ip = chunk.match(/IP(?:v4)? [Aa]ddress:\s*(\d+\.\d+\.\d+\.\d+)/)?.[1];
        const plat = chunk.match(/Platform:\s*(?:cisco\s+)?([^,]+),/i)?.[1]?.trim();
        addNeighbor(local, dev, port, ip, plat);
        continue;
      }
      const sys = chunk.match(/^System Name:\s*(\S+)/m)?.[1];
      if (sys) {
        const local = chunk.match(/^Local Intf:\s*(\S+)/m)?.[1];
        const port = chunk.match(/^Port id:\s*(\S+)/m)?.[1];
        const ip = chunk.match(/IP:\s*(\d+\.\d+\.\d+\.\d+)/)?.[1];
        addNeighbor(local, sys, port, ip);
      }
    }

    if (!ifaces && !inv.length && !neighbors) b.warnings.push('Не найдено ни интерфейсов, ни inventory, ни соседей — проверьте вывод');
    const res = b.result(`${host}${model ? ` (${model})` : ''}`);
    res.stats = { интерфейсов: ifaces, VLAN: [...b.entities.values()].filter((e) => e.kind === 'vlan').length, 'модулей с SN': inv.filter((m) => m[5]).length, соседей: neighbors };
    return res;
  },
};
