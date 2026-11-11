import type { Parser } from './types';
import { DraftBuilder } from './util';

interface PveResource {
  type: 'node' | 'qemu' | 'lxc' | 'storage' | 'sdn' | 'pool';
  id?: string;
  node?: string;
  name?: string;
  vmid?: number;
  status?: string;
  maxcpu?: number;
  maxmem?: number;
  maxdisk?: number;
  disk?: number;
  storage?: string;
  template?: number;
  tags?: string;
}

/** Proxmox VE: `pvesh get /cluster/resources --output-format json` */
export const proxmoxParser: Parser = {
  id: 'proxmox',
  label: 'Proxmox VE',
  hint: 'pvesh get /cluster/resources --output-format json',
  detect(text) {
    const t = text.trim();
    if (!t.startsWith('[')) return 0;
    return /"type"\s*:\s*"(qemu|lxc|node)"/.test(t) ? 0.95 : 0;
  },
  parse(text, opts) {
    const b = new DraftBuilder('proxmox');
    let rows: PveResource[];
    try {
      rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error('не массив');
    } catch (e) {
      b.warnings.push(`Не удалось разобрать JSON: ${(e as Error).message}`);
      return b.result('Proxmox: ошибка');
    }
    const cluster = opts.clusterName?.trim() || 'Proxmox';
    const ck = `cluster:${cluster.toLowerCase()}`;
    b.entity({ key: ck, kind: 'cluster', name: cluster, attrs: { type: 'proxmox' } });

    const hostKey = (node: string) => `host:${cluster.toLowerCase()}:${node}`;
    const gib = (bytes?: number) => (bytes ? Math.round((bytes / 1024 ** 3) * 10) / 10 : undefined);
    let vms = 0;
    let cts = 0;
    for (const r of rows.filter((x) => x.type === 'node' && x.node)) {
      b.entity({ key: hostKey(r.node!), kind: 'host', name: r.node!, attrs: { hypervisor: 'Proxmox VE' }, match: { hostname: r.node } });
      b.relate({ type: 'contains', from: ck, to: hostKey(r.node!) });
    }
    for (const r of rows) {
      if ((r.type !== 'qemu' && r.type !== 'lxc') || !r.node || r.template) continue;
      if (!b.entities.has(hostKey(r.node))) {
        b.entity({ key: hostKey(r.node), kind: 'host', name: r.node, attrs: { hypervisor: 'Proxmox VE' } });
        b.relate({ type: 'contains', from: ck, to: hostKey(r.node) });
      }
      const isCt = r.type === 'lxc';
      const key = `${isCt ? 'ct' : 'vm'}:${cluster.toLowerCase()}:${r.vmid}`;
      const name = r.name || `${isCt ? 'CT' : 'VM'} ${r.vmid}`;
      b.entity({
        key,
        kind: isCt ? 'container' : 'vm',
        name,
        attrs: isCt
          ? { runtime: 'lxc', vmid: `CT ${r.vmid}` }
          : { vmid: `VM ${r.vmid}`, vcpu: r.maxcpu, ramMb: r.maxmem ? Math.round(r.maxmem / 1024 ** 2) : undefined },
        description: r.tags ? `теги: ${r.tags.replace(/;/g, ', ')}` : undefined,
      });
      b.entities.get(key)!.attrs.status = r.status === 'running' ? 'active' : 'maintenance';
      b.relate({ type: 'contains', from: hostKey(r.node), to: key });
      if (isCt) cts++;
      else vms++;
    }
    for (const r of rows.filter((x) => x.type === 'storage' && x.node && x.storage)) {
      const key = `ds:${cluster.toLowerCase()}:${r.node}:${r.storage}`;
      b.entity({ key, kind: 'datastore', name: `${r.storage} @ ${r.node}`, attrs: { capacityGb: gib(r.maxdisk), usedGb: gib(r.disk) } });
      b.relate({ type: 'contains', from: hostKey(r.node!), to: key });
    }
    const res = b.result(`Кластер ${cluster}`);
    res.stats = { нод: rows.filter((x) => x.type === 'node').length, ВМ: vms, контейнеров: cts, хранилищ: rows.filter((x) => x.type === 'storage').length };
    return res;
  },
};
