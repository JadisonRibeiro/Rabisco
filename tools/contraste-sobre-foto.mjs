/**
 * Contraste real do texto que fica sobre fotografia.
 *
 * O axe desiste desses casos ("background could not be determined"): não há
 * cor de fundo declarada, há uma imagem arbitrária sob um véu em gradiente.
 * Aqui o fundo é amostrado dos pixels realmente pintados — o véu é
 * desenhado, a foto é a de produção, e a razão sai do que o olho vê.
 *
 *   node tools/contraste-sobre-foto.mjs [url]
 */
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const URL = process.argv[2] ?? 'http://localhost:4399/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SELETORES = ['.galeria__nome', '.galeria__texto-2', '.galeria__indice', '.rail__chip-nome'];

const lin = (c) => {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razao = (a, b) => {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(() => {
  for (const i of document.images) i.removeAttribute('loading');
  // Congela animações: um elemento a meio caminho da entrada tem opacidade
  // parcial e mediria um contraste que não existe em repouso.
  const s = document.createElement('style');
  s.textContent = '*{animation:none !important;transition:none !important;opacity:inherit}';
  document.head.append(s);
});
await page.waitForTimeout(2500);

console.log('elemento              cor do texto   fundo amostrado   razão   veredito');
console.log('─'.repeat(76));

let falhas = 0;
for (const sel of SELETORES) {
  const elementos = await page.$$(sel);
  for (const [i, el] of elementos.entries()) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);

    const info = await el.evaluate((node) => {
      const cs = getComputedStyle(node);
      const m = cs.color.match(/\d+/g).map(Number);
      const r = node.getBoundingClientRect();
      return {
        cor: m.slice(0, 3),
        tamanho: parseFloat(cs.fontSize),
        peso: cs.fontWeight,
        caixa: { x: r.x, y: r.y, w: r.width, h: r.height },
      };
    });
    if (info.caixa.w < 2 || info.caixa.h < 2) continue;

    // O fundo real vem de uma captura da MESMA região com o texto oculto.
    // Amostrar a região com o texto visível mediria as bordas suavizadas do
    // próprio glifo, que não são fundo nenhum.
    const clip = {
      x: Math.max(0, info.caixa.x),
      y: Math.max(0, info.caixa.y),
      width: Math.max(2, Math.min(info.caixa.w, 1440 - info.caixa.x)),
      height: Math.max(2, info.caixa.h),
    };
    // color:transparent e não visibility:hidden — esconder o elemento
    // levaria junto os pseudo-elementos, e é neles que mora o véu que
    // garante o contraste. Assim só os glifos somem.
    await el.evaluate((node) => {
      node.dataset.corAnterior = node.style.color;
      node.style.color = 'transparent';
      node.style.textShadow = 'none';
    });
    const buf = await page.screenshot({ clip });
    await el.evaluate((node) => {
      node.style.color = node.dataset.corAnterior ?? '';
      node.style.textShadow = '';
      delete node.dataset.corAnterior;
    });
    const png = PNG.sync.read(buf);

    let pior = Infinity;
    let piorPixel = null;
    for (let p = 0; p < png.data.length; p += 4) {
      const px = [png.data[p], png.data[p + 1], png.data[p + 2]];
      const rz = razao(info.cor, px);
      if (rz < pior) {
        pior = rz;
        piorPixel = px;
      }
    }
    if (!piorPixel) continue;

    // Texto grande (>=24px, ou >=18.66px em negrito) exige só 3:1.
    const grande = info.tamanho >= 24 || (info.tamanho >= 18.66 && Number(info.peso) >= 700);
    const alvo = grande ? 3 : 4.5;
    const passa = pior >= alvo;
    if (!passa) falhas++;

    console.log(
      `${(sel + ' #' + (i + 1)).padEnd(22)}` +
        `rgb(${info.cor.join(',')})`.padEnd(15) +
        `rgb(${piorPixel.join(',')})`.padEnd(18) +
        `${pior.toFixed(2).padStart(6)}  ` +
        `${passa ? 'ok' : 'FALHA'} (alvo ${alvo})`,
    );
  }
}

await browser.close();
console.log(
  `\n${falhas ? `${falhas} caso(s) abaixo do mínimo` : 'todo o texto sobre foto passa em AA'}`,
);
process.exit(falhas ? 1 : 0);
