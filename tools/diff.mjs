/**
 * Compara duas pastas de screenshots pixel a pixel.
 *
 *   node tools/diff.mjs .baseline/original .baseline/atual
 *
 * Escreve um mapa de diferenças por viewport em .baseline/diff/ e devolve
 * código 1 se algum viewport passar do limiar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Critério de aprovação.
 *
 * Contagem de pixels divergentes não serve sozinha: trocar o
 * dimensionamento por JS do <image-slot> por object-fit produz a mesma
 * geometria, mas o Chrome reamostra a foto por um caminho ligeiramente
 * diferente. Isso pinta um número grande de pixels com desvio minúsculo —
 * invisível a olho, e concentrado no interior das fotos.
 *
 * Um deslocamento de layout tem assinatura oposta: poucos pixels com desvio
 * enorme, e altura total diferente. Por isso o portão é o desvio MÉDIO por
 * canal mais a igualdade de altura.
 */
const DELTA_MEDIO_MAX = 3; // de 0 a 255

function carregar(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

/** Recorta as duas imagens ao tamanho comum para poder comparar mesmo quando
 *  a altura muda; a diferença de altura é reportada à parte. */
function recortar(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, Math.min(width, png.width), Math.min(height, png.height), 0, 0);
  return out;
}

export function diffDirs(dirA, dirB, outDir = null) {
  const arquivos = fs
    .readdirSync(dirA)
    .filter((f) => f.endsWith('.png') && fs.existsSync(path.join(dirB, f)));
  if (outDir) fs.mkdirSync(outDir, { recursive: true });

  const resultados = [];
  for (const file of arquivos) {
    const a = carregar(path.join(dirA, file));
    const b = carregar(path.join(dirB, file));
    const width = Math.min(a.width, b.width);
    const height = Math.min(a.height, b.height);
    const ra = recortar(a, width, height);
    const rb = recortar(b, width, height);
    const saida = new PNG({ width, height });

    const divergentes = pixelmatch(ra.data, rb.data, saida.data, width, height, {
      threshold: 0.1,
      includeAA: false,
    });
    const fracao = divergentes / (width * height);
    if (outDir) fs.writeFileSync(path.join(outDir, file), PNG.sync.write(saida));

    let soma = 0;
    for (let i = 0; i < ra.data.length; i += 4) {
      soma += Math.max(
        Math.abs(ra.data[i] - rb.data[i]),
        Math.abs(ra.data[i + 1] - rb.data[i + 1]),
        Math.abs(ra.data[i + 2] - rb.data[i + 2]),
      );
    }
    const deltaMedio = soma / (width * height);

    resultados.push({
      viewport: file.replace('.png', ''),
      alturaA: a.height,
      alturaB: b.height,
      divergentes,
      fracao,
      deltaMedio,
      ok: deltaMedio <= DELTA_MEDIO_MAX && a.height === b.height,
    });
  }
  return resultados;
}

if (process.argv[1] && process.argv[1].endsWith('diff.mjs')) {
  const [dirA, dirB] = process.argv.slice(2);
  const resultados = diffDirs(dirA, dirB, '.baseline/diff');
  console.log('viewport              altura A   altura B   px difs      %   delta médio');
  console.log('─'.repeat(74));
  for (const r of resultados) {
    const pct = (r.fracao * 100).toFixed(2);
    const alturaDif = r.alturaA !== r.alturaB ? ` Δ${r.alturaB - r.alturaA}` : '';
    console.log(
      `${r.viewport.padEnd(20)} ${String(r.alturaA).padStart(9)} ${String(r.alturaB).padStart(10)}${alturaDif.padEnd(6)} ${String(r.divergentes).padStart(8)} ${pct.padStart(6)}% ${r.deltaMedio.toFixed(2).padStart(9)}  ${r.ok ? 'ok' : 'DIVERGE'}`,
    );
  }
  const pior = Math.max(...resultados.map((r) => r.deltaMedio));
  console.log(
    `\nlimiar: delta médio ≤ ${DELTA_MEDIO_MAX} e altura idêntica — pior caso ${pior.toFixed(2)}`,
  );
  process.exit(resultados.every((r) => r.ok) ? 0 : 1);
}
