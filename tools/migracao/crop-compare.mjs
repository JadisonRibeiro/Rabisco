/** Recorta a mesma faixa das duas capturas e empilha para comparação visual.
 *  node tools/crop-compare.mjs <a.png> <b.png> <y> <altura> [saida.png] */
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [fileA, fileB, yArg, hArg, out = '.work/compare.png'] = process.argv.slice(2);
const y = Number(yArg);
const h = Number(hArg);

const a = PNG.sync.read(fs.readFileSync(fileA));
const b = PNG.sync.read(fs.readFileSync(fileB));
const w = Math.min(a.width, b.width);
const SEPARADOR = 6;

const dest = new PNG({ width: w, height: h * 2 + SEPARADOR });
dest.data.fill(255);
PNG.bitblt(a, dest, 0, y, w, Math.min(h, a.height - y), 0, 0);
PNG.bitblt(b, dest, 0, y, w, Math.min(h, b.height - y), 0, h + SEPARADOR);

// Faixa magenta separando: em cima o original, embaixo o refatorado.
for (let row = h; row < h + SEPARADOR; row++) {
  for (let x = 0; x < w; x++) {
    const i = (dest.width * row + x) << 2;
    dest.data[i] = 255;
    dest.data[i + 1] = 0;
    dest.data[i + 2] = 255;
    dest.data[i + 3] = 255;
  }
}

fs.writeFileSync(out, PNG.sync.write(dest));
console.log(`${out} — original em cima, refatorado embaixo (y=${y}, ${h}px)`);
