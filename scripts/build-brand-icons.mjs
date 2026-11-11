// Собирает иконки брендов (simple-icons, CC0) в public/brand-icons:
//   index.json  — [{ s: slug, t: title, h: hex, a?: aliases }] для поиска в пикере
//   <slug>.svg  — сами иконки, грузятся лениво по одной
// Запускается автоматически перед dev/build (predev/prebuild).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pkgDir = join(process.cwd(), 'node_modules', 'simple-icons');
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const outDir = join(process.cwd(), 'public', 'brand-icons');
const stamp = join(outDir, '.version');

if (existsSync(stamp) && readFileSync(stamp, 'utf8') === version) {
  console.log(`[brand-icons] up to date (simple-icons ${version})`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
const data = JSON.parse(readFileSync(join(pkgDir, 'data', 'simple-icons.json'), 'utf8'));
const icons = Array.isArray(data) ? data : data.icons;

const index = [];
for (const icon of icons) {
  const src = join(pkgDir, 'icons', `${icon.slug}.svg`);
  if (!existsSync(src)) continue;
  copyFileSync(src, join(outDir, `${icon.slug}.svg`));
  const aka = icon.aliases?.aka;
  index.push(aka?.length ? { s: icon.slug, t: icon.title, h: icon.hex, a: aka } : { s: icon.slug, t: icon.title, h: icon.hex });
}

writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));
writeFileSync(stamp, version);
console.log(`[brand-icons] ${index.length} icons from simple-icons ${version}`);
