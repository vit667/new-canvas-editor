import type { Parser } from './types';
import { DraftBuilder, addInterfaceIp, configBlocks, devKey, ifKey, ifaceTypeSpeed, maskToLen, normalizeIfName, parseVlanList, vlanKey, vrfKey } from './util';

/**
 * Huawei VRP: display current-configuration · display version ·
 * display elabel / display device manuinfo (BarCode) · display lldp neighbor brief
 */
export const huaweiParser: Parser = {
  id: 'huawei-vrp',
  label: 'Huawei VRP',
  hint: 'display current-configuration, display version, display elabel, display lldp neighbor brief',
  detect(text) {
    let score = 0;
    if (/^\s*sysname\s+\S+/m.test(text)) score += 0.4;
    if (/port link-type (access|trunk)|port default vlan|Vlanif\d+|vlan batch/m.test(text)) score += 0.3;
    if (/HUAWEI|VRP \(R\) software|BarCode=/i.test(text)) score += 0.3;
    if (/^#\s*$/m.test(text)) score += 0.1;
    return Math.min(1, score);
  },
  parse(text) {
    const b = new DraftBuilder('huawei-vrp');
    const host = text.match(/^\s*sysname\s+(\S+)/m)?.[1] ?? text.match(/^<(\S+)>/m)?.[1];
    if (!host) {
      b.warnings.push('Не найден sysname: добавьте display current-configuration');
      return b.result('Huawei: без имени');
    }
    const version = text.match(/VRP \(R\) software,\s*Version\s+([^\n]+)/)?.[1]?.trim();
    const model = text.match(/^HUAWEI\s+(\S+)\s+.*uptime/m)?.[1] ?? text.match(/^BoardType=(\S+)/m)?.[1];
    const serials = [...text.matchAll(/^BarCode=(\S+)/gm)].map((m) => m[1]);

    b.entity({
      key: devKey(host),
      kind: 'device',
      name: host,
      attrs: { vendor: 'Huawei', model, serial: serials[0], platform: version ? `VRP ${version}` : 'VRP', hostname: host },
      match: { serial: serials[0], hostname: host },
    });
    serials.slice(1).forEach((sn, i) =>
      b.entity({ key: `module:${host.toLowerCase()}:${sn}`, kind: 'module', name: `${host} · модуль ${i + 2}`, attrs: { serial: sn }, refs: { deviceId: devKey(host) }, match: { serial: sn } })
    );

    // VLAN: «vlan batch 10 20 30 to 40» и блоки «vlan 10 / name|description»
    for (const m of text.matchAll(/^vlan batch\s+(.+)$/gm)) for (const vid of parseVlanList(m[1])) b.entity({ key: vlanKey(vid), kind: 'vlan', name: `VLAN ${vid}`, attrs: { vid } });
    for (const blk of configBlocks(text, /^vlan\s+(\d+)$/)) {
      const vid = Number(blk.head[1]);
      const name = blk.body.find((l) => /^(name|description)\s/.test(l))?.replace(/^(name|description)\s+/, '');
      b.entity({ key: vlanKey(vid), kind: 'vlan', name: name ?? `VLAN ${vid}`, attrs: { vid } });
    }

    let ifaces = 0;
    for (const [i, blk] of configBlocks(text, /^interface\s+(\S+)/).entries()) {
      const name = normalizeIfName(blk.head[1]);
      const body = blk.body;
      const ts = ifaceTypeSpeed(name);
      const has = (re: RegExp) => body.find((l) => re.test(l));
      const linkType = has(/^port link-type\s/)?.split(/\s+/).pop();
      const pvid = Number(has(/^port default vlan\s/)?.split(/\s+/).pop());
      const allow = has(/^port trunk allow-pass vlan\s/)?.replace(/^port trunk allow-pass vlan\s+/, '');
      const trunkPvid = Number(has(/^port trunk pvid vlan\s/)?.split(/\s+/).pop());
      const lag = has(/^eth-trunk\s+\d+/)?.split(/\s+/).pop();
      const vrf = has(/^ip binding vpn-instance\s/)?.split(/\s+/).pop();
      const shutdown = body.includes('shutdown');
      const mode: 'access' | 'trunk' | 'routed' | undefined =
        linkType === 'trunk' ? 'trunk' : linkType === 'access' || pvid ? 'access' : ts.mode === 'routed' || has(/^undo portswitch/) ? 'routed' : undefined;
      const tagged = mode === 'trunk' && allow && !/^all$/i.test(allow) ? parseVlanList(allow) : [];
      for (const v of [pvid, trunkPvid, ...tagged]) if (Number.isInteger(v) && v > 0 && !b.entities.has(vlanKey(v))) b.entity({ key: vlanKey(v), kind: 'vlan', name: `VLAN ${v}`, attrs: { vid: v } });
      const svi = name.match(/^Vlanif(\d+)$/)?.[1];
      if (vrf) b.entity({ key: vrfKey(vrf)!, kind: 'vrf', name: vrf, attrs: {} });

      b.entity({
        key: ifKey(host, name),
        kind: 'interface',
        name,
        description: has(/^description\s/)?.replace(/^description\s+/, ''),
        attrs: { type: ts.type, speed: ts.speed, mode, enabled: !shutdown, order: i },
        refs: {
          deviceId: devKey(host),
          ...(mode === 'access' && pvid ? { untaggedVlanId: vlanKey(pvid) } : {}),
          ...(mode === 'trunk' && trunkPvid ? { untaggedVlanId: vlanKey(trunkPvid) } : {}),
          ...(lag ? { lagId: ifKey(host, `Eth-Trunk${lag}`) } : {}),
        },
      });
      if (tagged.length) b.entities.get(ifKey(host, name))!.attrs.taggedVlanKeys = tagged.map((v) => vlanKey(v));
      ifaces++;
      for (const l of body) {
        const ip = l.match(/^ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+|\d+)/);
        if (!ip) continue;
        const len = ip[2].includes('.') ? maskToLen(ip[2]) : Number(ip[2]);
        if (len !== null) addInterfaceIp(b, { host, iface: name, address: ip[1], len, vrf, vid: svi ? Number(svi) : undefined, hostname: host });
      }
    }

    // LLDP brief: «GE0/0/1  core-sw  GE1/0/1  104»
    let neighbors = 0;
    const lldp = text.split(/Local Intf\s+Neighbor Dev\s+Neighbor Intf/i)[1];
    if (lldp) {
      for (const line of lldp.split(/\r?\n/)) {
        const m = line.trim().match(/^(\S+)\s+(\S+)\s+(\S+)\s+\d+\s*$/);
        if (!m) continue;
        const [, local, rh, rport] = m;
        const lk = ifKey(host, local);
        const rk = ifKey(rh, rport);
        if (!b.entities.has(lk)) b.entity({ key: lk, kind: 'interface', name: normalizeIfName(local), attrs: { ...ifaceTypeSpeed(local), enabled: true }, refs: { deviceId: devKey(host) } });
        b.entity({ key: devKey(rh), kind: 'device', name: rh, attrs: { hostname: rh }, match: { hostname: rh } });
        b.entity({ key: rk, kind: 'interface', name: normalizeIfName(rport), attrs: { ...ifaceTypeSpeed(rport), enabled: true }, refs: { deviceId: devKey(rh) } });
        b.entity({ key: `cable:${[lk, rk].sort().join('|')}`, kind: 'cable', name: `${host} ${normalizeIfName(local)} ↔ ${rh} ${normalizeIfName(rport)}`, attrs: {}, refs: { aInterfaceId: lk, bInterfaceId: rk } });
        neighbors++;
      }
    }

    const res = b.result(`${host}${model ? ` (${model})` : ''}`);
    res.stats = { интерфейсов: ifaces, VLAN: [...b.entities.values()].filter((e) => e.kind === 'vlan').length, 'серийных номеров': serials.length, соседей: neighbors };
    return res;
  },
};
