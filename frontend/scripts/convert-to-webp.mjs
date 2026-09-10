import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'public/images');
const exts = new Set(['.png', '.jpg', '.jpeg']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      const outPath = full.replace(/\.(png|jpe?g)$/i, '.webp');
      const before = (await stat(full)).size;
      await sharp(full).webp({ quality: 80 }).toFile(outPath);
      const after = (await stat(outPath)).size;
      const pct = (100 * (1 - after / before)).toFixed(1);
      console.log(
        `${path.relative(root, full)} -> ${path.basename(outPath)}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%)`
      );
    }
  }
}

await walk(root);
