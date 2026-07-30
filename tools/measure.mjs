/** Mede caixas equivalentes nos dois builds para achar de onde vem a
 *  diferença de altura. node tools/measure.mjs <urlOriginal> <urlNovo> */
import { chromium } from 'playwright-core';

const [urlA, urlB] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Roda no browser: descreve as caixas de interesse de forma comparável
 *  entre a versão com shadow DOM e a versão em HTML puro. */
function coletar() {
  const desc = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: cs.display,
      aspect: cs.aspectRatio,
      objectFit: cs.objectFit,
      height: cs.height,
    };
  };

  const cards = [...document.querySelectorAll('article')].map((a) => ({
    texto: a.textContent.trim().slice(0, 24).replace(/\s+/g, ' '),
    caixa: desc(a),
    // a foto pode estar no light DOM (novo) ou dentro do image-slot (antigo)
    midia: desc(a.querySelector('image-slot, img')),
    midiaInterna: desc(a.querySelector('image-slot')?.shadowRoot?.querySelector('img')),
  }));

  const secao = (sel) => desc(document.querySelector(sel));

  return {
    cards,
    hero: secao('#top'),
    heroMoldura: desc(
      document.querySelector('#top image-slot, #top img[src*="fachada"]')?.parentElement,
    ),
    heroFoto: desc(document.querySelector('#top image-slot, #top img[src*="fachada"]')),
    rail: secao('#top + section, .rail'),
    manifesto: secao('#manifesto'),
    presentes: secao('#presentes'),
    galeria: secao('#produtos'),
    loja: secao('#loja'),
    total: document.body.scrollHeight,
  };
}

const browser = await chromium.launch({ executablePath: CHROME });
const medir = async (url) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const dados = await page.evaluate(coletar);
  await page.close();
  return dados;
};

const a = await medir(urlA);
const b = await medir(urlB);
await browser.close();

const linha = (rotulo, x, y) => {
  const av = x ? `${x.w}×${x.h}` : '—';
  const bv = y ? `${y.w}×${y.h}` : '—';
  const delta = x && y ? y.h - x.h : 0;
  console.log(
    `${rotulo.padEnd(22)} ${av.padStart(12)} ${bv.padStart(12)}  ${delta ? (delta > 0 ? '+' : '') + delta : ''}`,
  );
};

console.log('caixa                      original      refatorado   Δaltura');
console.log('─'.repeat(64));
for (const k of ['hero', 'rail', 'manifesto', 'presentes', 'galeria', 'loja']) {
  linha(k, a[k], b[k]);
}
linha('hero: moldura', a.heroMoldura, b.heroMoldura);
linha('hero: foto', a.heroFoto, b.heroFoto);
console.log('');
console.log('cards <article>');
console.log('─'.repeat(64));
for (let i = 0; i < Math.max(a.cards.length, b.cards.length); i++) {
  const ca = a.cards[i];
  const cb = b.cards[i];
  linha(`  ${(cb ?? ca)?.texto ?? i}`, ca?.caixa, cb?.caixa);
  linha('    └ mídia', ca?.midiaInterna ?? ca?.midia, cb?.midia);
}
console.log('');
console.log(
  `altura total: ${a.total} → ${b.total} (${b.total - a.total > 0 ? '+' : ''}${b.total - a.total})`,
);
