// Generates a tiny base64 blur placeholder for every WebP under public/images,
// keyed by its public URL path (e.g. "/images/logodark.webp"), and writes them
// all to lib/blur-placeholders.json. Re-run after adding or re-converting images.
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const imagesRoot = path.resolve('public/images');
const outFile = path.resolve('lib/blur-placeholders.json');

async function walk(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (path.extname(entry.name).toLowerCase() === '.webp') {
      const urlPath = '/images/' + path.relative(imagesRoot, full).split(path.sep).join('/');
      const buf = await sharp(full)
        .resize(16, 16, { fit: 'inside' })
        .webp({ quality: 40 })
        .toBuffer();
      out[urlPath] = `data:image/webp;base64,${buf.toString('base64')}`;
    }
  }
}

const placeholders = {};
await walk(imagesRoot, placeholders);
await writeFile(outFile, JSON.stringify(placeholders, null, 2) + '\n');
console.log(`Wrote ${Object.keys(placeholders).length} blur placeholders to ${path.relative(process.cwd(), outFile)}`);
