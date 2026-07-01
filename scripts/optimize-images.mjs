/**
 * Optimización de imágenes (una sola vez / cuando se añadan nuevas).
 * Redimensiona y recomprime en el sitio, conservando nombres y formatos,
 * así no hay que tocar ningún import ni referencia.
 * Guarda copia de los originales en _img_originals/ (ignorado por git).
 *
 * Uso:  node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupRoot = path.join(root, '_img_originals');

// Reglas por carpeta: borde largo máximo y calidad.
const rules = [
  { dir: 'src/assets/editorial', maxEdge: 1600, quality: 80 },
  { dir: 'src/assets/products', maxEdge: 1400, quality: 80 },
  { dir: 'src/assets/models', maxEdge: 1500, quality: 80 },
  { dir: 'src/assets/story', maxEdge: 1500, quality: 80 },
  { dir: 'src/assets/impact', maxEdge: 1500, quality: 80 },
  { dir: 'src/assets/packaging', maxEdge: 1400, quality: 80 },
  { dir: 'src/assets/logo', maxEdge: 900, quality: 90 },
  { dir: 'public', maxEdge: 512, quality: 82 },
];

// PNG que no conviene tocar (iconos pequeños, favicon).
const skip = new Set(['favicon-16x16.png', 'favicon-32x32.png']);

let savedBytes = 0;
let count = 0;

async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(full));
    else if (/\.(jpe?g|png|webp)$/i.test(e.name)) files.push(full);
  }
  return files;
}

async function optimize(file, rule) {
  const name = path.basename(file);
  if (skip.has(name)) return;
  const ext = path.extname(file).toLowerCase();
  const rel = path.relative(root, file);

  const before = (await fs.stat(file)).size;
  const input = await fs.readFile(file);
  const img = sharp(input, { failOn: 'none' });
  const meta = await img.metadata();

  // Redimensionar si supera el borde largo (sin ampliar).
  let pipeline = img.rotate();
  if (meta.width && meta.height && Math.max(meta.width, meta.height) > rule.maxEdge) {
    pipeline = pipeline.resize({
      width: meta.width >= meta.height ? rule.maxEdge : undefined,
      height: meta.height > meta.width ? rule.maxEdge : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true, quality: 90, effort: 8 });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: rule.quality, effort: 5 });
  } else {
    pipeline = pipeline.jpeg({ quality: rule.quality, mozjpeg: true, progressive: true });
  }

  const output = await pipeline.toBuffer();
  if (output.length >= before) return; // no empeorar

  // Copia de seguridad del original (solo la primera vez).
  const backup = path.join(backupRoot, rel);
  await fs.mkdir(path.dirname(backup), { recursive: true });
  try { await fs.access(backup); } catch { await fs.copyFile(file, backup); }

  await fs.writeFile(file, output);
  savedBytes += before - output.length;
  count += 1;
  const pct = Math.round((1 - output.length / before) * 100);
  console.log(`  ${rel}  ${(before / 1024).toFixed(0)}KB -> ${(output.length / 1024).toFixed(0)}KB (-${pct}%)`);
}

for (const rule of rules) {
  const files = await walk(path.join(root, rule.dir));
  for (const f of files) {
    try { await optimize(f, rule); } catch (e) { console.warn(`  ! ${path.relative(root, f)}: ${e.message}`); }
  }
}

console.log(`\nOptimizadas ${count} imágenes. Ahorro total: ${(savedBytes / 1024 / 1024).toFixed(2)} MB.`);
