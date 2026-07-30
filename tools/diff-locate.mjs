/** Aponta em que faixas verticais duas capturas divergem.
 *  node tools/diff-locate.mjs <a.png> <b.png> [faixa=50] */
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [fileA, fileB, faixaArg] = process.argv.slice(2);
const FAIXA = Number(faixaArg) || 50;

const a = PNG.sync.read(fs.readFileSync(fileA));
const b = PNG.sync.read(fs.readFileSync(fileB));
const width = Math.min(a.width, b.width);
const height = Math.min(a.height, b.height);

const px = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

console.log(`A ${a.width}x${a.height}   B ${b.width}x${b.height}   faixa=${FAIXA}px\n`);
console.log('  y inicial   % divergente   barra');

const faixas = [];
for (let y0 = 0; y0 < height; y0 += FAIXA) {
  let dif = 0;
  let total = 0;
  for (let y = y0; y < Math.min(y0 + FAIXA, height); y += 2) {
    for (let x = 0; x < width; x += 2) {
      const [r1, g1, b1] = px(a, x, y);
      const [r2, g2, b2] = px(b, x, y);
      total++;
      if (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) > 24) dif++;
    }
  }
  faixas.push({ y0, pct: (dif / total) * 100 });
}

for (const f of faixas) {
  if (f.pct < 1) continue;
  const barra = '█'.repeat(Math.min(40, Math.round(f.pct / 2.5)));
  console.log(`${String(f.y0).padStart(9)}   ${f.pct.toFixed(1).padStart(10)}%   ${barra}`);
}

const primeiro = faixas.find((f) => f.pct >= 1);
console.log(`\nprimeira divergência: y≈${primeiro ? primeiro.y0 : '(nenhuma)'}`);
