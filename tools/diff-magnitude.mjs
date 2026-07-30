/** Mede a MAGNITUDE das diferenças, não só a contagem. Diferença de
 *  reamostragem de imagem produz muitos pixels com delta pequeno; um
 *  deslocamento de layout produz poucos pixels com delta grande.
 *
 *  node tools/diff-magnitude.mjs <a.png> <b.png> [y0] [altura] */
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [fileA, fileB, y0Arg, hArg] = process.argv.slice(2);
const a = PNG.sync.read(fs.readFileSync(fileA));
const b = PNG.sync.read(fs.readFileSync(fileB));
const w = Math.min(a.width, b.width);
const y0 = Number(y0Arg) || 0;
const y1 = Math.min(Number(hArg) ? y0 + Number(hArg) : Math.min(a.height, b.height), a.height, b.height);

const histograma = new Array(9).fill(0); // faixas de delta máximo por canal
let total = 0;
let soma = 0;
let maximo = 0;

for (let y = y0; y < y1; y++) {
  for (let x = 0; x < w; x++) {
    const i = (a.width * y + x) << 2;
    const j = (b.width * y + x) << 2;
    const d = Math.max(
      Math.abs(a.data[i] - b.data[j]),
      Math.abs(a.data[i + 1] - b.data[j + 1]),
      Math.abs(a.data[i + 2] - b.data[j + 2]),
    );
    total++;
    soma += d;
    if (d > maximo) maximo = d;
    histograma[Math.min(8, Math.floor(d / 32))]++;
  }
}

console.log(`faixa y ${y0}–${y1}, ${total.toLocaleString('pt-BR')} pixels`);
console.log(`delta médio ${(soma / total).toFixed(2)} | delta máximo ${maximo}\n`);
console.log('delta por canal      pixels        %');
for (let k = 0; k < 9; k++) {
  if (!histograma[k]) continue;
  const faixa = k === 0 ? '  0–31 (imperceptível)' : `${k * 32}–${k * 32 + 31}`.padStart(7) + '              ';
  const pct = (histograma[k] / total) * 100;
  console.log(`${faixa.padEnd(22)} ${String(histograma[k]).padStart(9)}  ${pct.toFixed(3).padStart(7)}%`);
}
