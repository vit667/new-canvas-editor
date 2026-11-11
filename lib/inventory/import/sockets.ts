import type { Parser } from './types';
import { DraftBuilder, isPrivateIp } from './util';

/**
 * Соединения хоста: Linux `ss -tunap` и Windows `netstat -ano` (+ `-b` для имён процессов).
 *  - слушающие порты → ПО на хосте (listenPorts);
 *  - установленные соединения → «общается с» (talks_to):
 *      входящее (удалённый → наш слушающий порт)  — клиент → этот хост, порт = наш;
 *      исходящее                                   — этот хост → сервер, порт = удалённый.
 * Хост выбирается при импорте (opts.hostEntityId); удалённые адреса сверка привяжет к
 * их владельцам в реестре, неизвестные частные адреса заведёт как IP «из ss/netstat».
 */

interface Sock {
  proto: 'tcp' | 'udp';
  state: string;
  local: { ip: string; port: number };
  remote: { ip: string; port: number } | null;
  proc?: string;
}

function splitAddr(s: string): { ip: string; port: number } | null {
  const m = s.match(/^\[?([^\]]*?)\]?(?:%\S+)?:(\d+|\*)$/);
  if (!m) return null;
  let ip = m[1].replace(/^::ffff:/i, '');
  if (ip === '*' || ip === '::' || ip === '0.0.0.0' || ip === '[::]' || ip === '') ip = '*';
  return { ip, port: m[2] === '*' ? 0 : Number(m[2]) };
}

function parseSs(text: string): Sock[] {
  const out: Sock[] = [];
  for (const line of text.split(/\r?\n/)) {
    // tcp   ESTAB  0  0  10.0.10.20:22  10.0.10.30:51234  users:(("sshd",pid=1,fd=3))
    const m = line.trim().match(/^(tcp|udp)\s+(\S+)\s+\d+\s+\d+\s+(\S+)\s+(\S+)(?:\s+users:\(\("([^"]+)")?/i);
    if (!m) continue;
    const local = splitAddr(m[3]);
    if (!local) continue;
    const remote = splitAddr(m[4]);
    out.push({ proto: m[1].toLowerCase() as 'tcp' | 'udp', state: m[2].toUpperCase(), local, remote: remote && remote.ip !== '*' ? remote : null, proc: m[5] });
  }
  return out;
}

function parseNetstat(text: string): Sock[] {
  const out: Sock[] = [];
  let pendingProc: Sock | null = null;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    // -b: имя процесса в квадратных скобках на следующей строке
    const bin = t.match(/^\[([^\]]+)\]$/);
    if (bin && pendingProc) {
      pendingProc.proc = bin[1].replace(/\.exe$/i, '');
      continue;
    }
    const m = t.match(/^(TCP|UDP)\s+(\S+)\s+(\S+)(?:\s+(LISTENING|ESTABLISHED|TIME_WAIT|CLOSE_WAIT|SYN_SENT|LISTEN|ESTAB))?\s+(\d+)\s*$/i);
    if (!m) continue;
    const local = splitAddr(m[2]);
    if (!local) continue;
    const remote = splitAddr(m[3]);
    const proto = m[1].toLowerCase() as 'tcp' | 'udp';
    const state = (m[4] ?? (proto === 'udp' ? 'UNCONN' : '')).toUpperCase().replace('LISTENING', 'LISTEN').replace('ESTABLISHED', 'ESTAB');
    const s: Sock = { proto, state, local, remote: remote && remote.ip !== '*' && remote.port !== 0 ? remote : null, proc: `pid ${m[5]}` };
    out.push(s);
    pendingProc = s;
  }
  return out;
}

const WELL_KNOWN: Record<number, string> = {
  22: 'SSH', 25: 'SMTP', 53: 'DNS', 80: 'HTTP', 88: 'Kerberos', 111: 'rpcbind', 123: 'NTP', 135: 'RPC', 139: 'NetBIOS', 161: 'SNMP',
  389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 514: 'Syslog', 636: 'LDAPS', 1433: 'MSSQL', 1521: 'Oracle', 2049: 'NFS', 3000: 'Grafana',
  3306: 'MySQL/MariaDB', 3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC', 5985: 'WinRM', 6379: 'Redis', 8006: 'Proxmox', 8080: 'HTTP-alt',
  8443: 'HTTPS-alt', 9090: 'Prometheus', 9100: 'node_exporter', 10050: 'Zabbix agent', 10051: 'Zabbix server', 27017: 'MongoDB',
};

export const socketsParser: Parser = {
  id: 'sockets',
  label: 'ss / netstat',
  hint: 'Linux: ss -tunap · Windows: netstat -ano (или -anob)',
  detect(text) {
    const ss = (text.match(/^(tcp|udp)\s+(ESTAB|LISTEN|UNCONN|TIME-WAIT)\s/gim) || []).length;
    const ns = (text.match(/^\s*(TCP|UDP)\s+\S+:\d+\s+\S+:\S+\s+(LISTENING|ESTABLISHED|TIME_WAIT)?\s*\d+/gm) || []).length;
    return Math.min(1, (ss + ns) / 3);
  },
  parse(text, opts) {
    const b = new DraftBuilder('sockets');
    const isSs = /^(tcp|udp)\s+(ESTAB|LISTEN|UNCONN)/im.test(text);
    const socks = isSs ? parseSs(text) : parseNetstat(text);
    if (!opts.hostEntityId) {
      b.warnings.push('Выберите хост, с которого снят вывод — без него соединения не к чему привязать');
      return b.result('Соединения: хост не выбран');
    }
    const hostRef = `existing:${opts.hostEntityId}`;

    // Слушающие порты → ПО
    const listening = new Set<string>();
    const byProc = new Map<string, Set<string>>();
    for (const s of socks) {
      if (s.state !== 'LISTEN' && !(s.proto === 'udp' && s.state === 'UNCONN')) continue;
      if (s.local.ip === '127.0.0.1' || s.local.ip === '::1') continue;
      listening.add(`${s.proto}:${s.local.port}`);
      const name = s.proc ?? WELL_KNOWN[s.local.port] ?? `порт ${s.local.port}`;
      byProc.set(name, (byProc.get(name) || new Set()).add(`${s.local.port}/${s.proto}`));
    }
    for (const [proc, ports] of byProc) {
      const list = [...ports].sort((a, c) => parseInt(a) - parseInt(c));
      b.entity({
        key: `software:${opts.hostEntityId}:${proc}`,
        kind: 'software',
        name: proc,
        description: list.map((p) => WELL_KNOWN[parseInt(p)] ? `${p} (${WELL_KNOWN[parseInt(p)]})` : p).join(', '),
        attrs: { product: proc, listenPorts: list },
      });
      b.relate({ type: 'runs_on', from: `software:${opts.hostEntityId}:${proc}`, to: hostRef });
    }

    // Соединения → talks_to (агрегируем по направлению и порту)
    const flows = new Map<string, { from: string; to: string; port: number; proto: string; procs: Set<string>; count: number }>();
    let external = 0;
    const externalIps = new Map<string, number>();
    for (const s of socks) {
      if (s.state !== 'ESTAB' || !s.remote) continue;
      if (s.remote.ip.startsWith('127.') || s.remote.ip === '::1') continue;
      const inbound = listening.has(`${s.proto}:${s.local.port}`);
      if (!isPrivateIp(s.remote.ip)) {
        external++;
        externalIps.set(s.remote.ip, (externalIps.get(s.remote.ip) || 0) + 1);
        continue;
      }
      const peer = `ipowner:${s.remote.ip}`;
      const port = inbound ? s.local.port : s.remote.port;
      const [from, to] = inbound ? [peer, hostRef] : [hostRef, peer];
      const k = `${from}|${to}|${port}/${s.proto}`;
      const f = flows.get(k) ?? { from, to, port, proto: s.proto, procs: new Set<string>(), count: 0 };
      f.count++;
      if (s.proc) f.procs.add(s.proc);
      flows.set(k, f);
      b.entity({
        key: `ip:default:${s.remote.ip}`,
        kind: 'ipAddress',
        name: s.remote.ip,
        description: 'обнаружен по ss/netstat',
        attrs: { address: s.remote.ip },
      });
    }
    for (const f of flows.values()) {
      b.relate({
        type: 'talks_to',
        from: f.from,
        to: f.to,
        props: { port: f.port, protocol: f.proto, service: WELL_KNOWN[f.port], process: [...f.procs].join(', ') || undefined, count: f.count, observedBy: isSs ? 'ss' : 'netstat' },
      });
    }
    if (external) {
      const top = [...externalIps.entries()].sort((a, c) => c[1] - a[1]).slice(0, 5).map(([ip, n]) => `${ip} ×${n}`).join(', ');
      b.warnings.push(`Соединений с внешними адресами: ${external} (не импортируются как объекты): ${top}`);
    }
    const res = b.result(`Соединения (${isSs ? 'ss' : 'netstat'})`);
    res.stats = { 'слушающих сервисов': byProc.size, 'потоков внутри сети': flows.size, 'внешних соединений': external };
    return res;
  },
};
