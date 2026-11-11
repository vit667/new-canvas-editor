import { ciscoParser } from './cisco';
import { huaweiParser } from './huawei';
import { mikrotikParser } from './mikrotik';
import { proxmoxParser } from './proxmox';
import { socketsParser } from './sockets';
import type { Parser, ParserId } from './types';

export * from './types';

/** Порядок важен для равных оценок: более специфичные форматы раньше */
export const PARSERS: Parser[] = [proxmoxParser, mikrotikParser, huaweiParser, ciscoParser, socketsParser];

export const parserById = (id: ParserId) => PARSERS.find((p) => p.id === id)!;

/** Угадать формат текста. null — не похоже ни на один */
export function detectParser(text: string): { parser: Parser; score: number } | null {
  let best: { parser: Parser; score: number } | null = null;
  for (const p of PARSERS) {
    const score = p.detect(text);
    if (score > (best?.score ?? 0.25)) best = { parser: p, score };
  }
  return best;
}
