/**
 * Auditoria de responsividade.
 *
 * Verifica, em cada viewport: overflow horizontal, elementos que estouram a
 * largura, alvos de toque menores que 44×44 e texto que transborda a própria
 * caixa. Roda também em landscape e com zoom de 200%.
 *
 *   node tools/audit-responsive.mjs [url]
 */
import { chromium } from 'playwright-core';

const URL = process.argv[2] ?? 'http://localhost:4399/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// WCAG 2.2 SC 2.5.8 (AA) exige 24×24 CSS px — abaixo disso é falha.
// 44×44 é a recomendação de toque; entre os dois vira observação, não erro.
const ALVO_AA = 24;
const ALVO_IDEAL = 44;

const CENARIOS = [
  { nome: '320', width: 320, height: 640 },
  { nome: '375', width: 375, height: 812 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '1024', width: 1024, height: 768 },
  { nome: '1440', width: 1440, height: 900 },
  { nome: '1920', width: 1920, height: 1080 },
  { nome: 'landscape 740×360', width: 740, height: 360 },
  // Zoom de 200% num desktop 1440: sobra uma viewport CSS de 720.
  { nome: 'zoom 200% (1440 → 720 CSS px)', width: 720, height: 450, zoom: 2 },
  // WCAG 1.4.10 (Reflow, AA): conteúdo utilizável a 320 CSS px de largura,
  // que é 1280px com zoom de 400%.
  { nome: 'WCAG 1.4.10 — 400% (1280 → 320 CSS px)', width: 320, height: 256, zoom: 4 },
];

/** Roda no browser. Devolve os problemas encontrados na página inteira. */
function auditar(alvoMinimo) {
  const doc = document.documentElement;
  const problemas = { overflowX: null, estouros: [], alvos: [], textoVazando: [] };

  if (doc.scrollWidth > doc.clientWidth) {
    problemas.overflowX = { scroll: doc.scrollWidth, cliente: doc.clientWidth };
  }

  const rotulo = (el) => {
    const cls =
      typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : '';
    const txt = (el.textContent || '').trim().slice(0, 24).replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${cls}${txt ? ` "${txt}"` : ''}`;
  };

  const limite = doc.clientWidth;

  /*
   * Um item dentro de um trilho horizontal fica fora da viewport por
   * definição: é o que significa "há mais para o lado". A regra antiga
   * isentava o rolador, mas não os filhos dele, então cada carrossel entrava
   * como dezenas de estouros — ruído que esconderia um estouro de verdade.
   *
   * O que continua sendo erro é a PÁGINA rolar na horizontal, e isso quem
   * mede é o teste de scrollWidth do documento, logo acima.
   */
  const dentroDeRoladorX = (el) => {
    for (let p = el.parentElement; p && p !== doc; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;

    // Estouro horizontal. Ignora o que sangra de propósito: camadas
    // decorativas, imagens sem alt (ornamento), trilhos roláveis e o link de
    // pular conteúdo, que fica fora da tela até receber foco.
    const decorativo =
      el.closest('[aria-hidden="true"]') ||
      el.hasAttribute('data-orb') ||
      el.hasAttribute('data-scribble') ||
      el.hasAttribute('data-float') ||
      (el.tagName === 'IMG' && el.getAttribute('alt') === '') ||
      el.classList.contains('pular-para-conteudo') ||
      cs.overflowX === 'auto' ||
      cs.overflowX === 'scroll' ||
      dentroDeRoladorX(el) ||
      el.closest('[data-noscroll]');
    if (!decorativo && (r.right > limite + 1 || r.left < -1)) {
      problemas.estouros.push({
        el: rotulo(el),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }

    // Alvos de toque. A área efetiva pode ser ampliada por um ::after sem
    // fluxo — o padrão usado aqui para crescer o alvo sem mover o layout —,
    // então a medição soma o pseudo-elemento quando ele existe.
    const clicavel = el.matches('a[href], button, [role="button"], input, select, textarea');
    if (clicavel && r.width && r.height) {
      const depois = getComputedStyle(el, '::after');
      const temArea = depois.content !== 'none' && depois.position === 'absolute';
      const alturaExtra = temArea ? parseFloat(depois.height) || 0 : 0;
      const larguraExtra = temArea ? parseFloat(depois.width) || 0 : 0;
      const w = Math.round(Math.max(r.width, larguraExtra));
      const h = Math.round(Math.max(r.height, alturaExtra));
      if (w < alvoMinimo || h < alvoMinimo) {
        problemas.alvos.push({ el: rotulo(el), w, h });
      }
    }

    // Texto transbordando a própria caixa (quebra impossível / nowrap).
    //
    // Medido por Range sobre o nó de texto, e não por scrollWidth: um
    // pseudo-elemento posicionado com inset negativo — o recurso usado aqui
    // para véus e áreas de toque — infla o scrollWidth sem que uma única
    // letra tenha saído do lugar.
    // Elementos inline não têm caixa de conteúdo própria — clientWidth é 0 e
    // o texto flui e quebra na caixa do pai. A pergunta só faz sentido para
    // quem gera bloco.
    const geraCaixa = cs.display !== 'inline' && el.clientWidth > 0;
    if (geraCaixa && el.children.length === 0 && (el.textContent || '').trim()) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const larguraDoTexto = range.getBoundingClientRect().width;
      range.detach?.();
      if (
        larguraDoTexto > el.clientWidth + 2 &&
        cs.overflow !== 'auto' &&
        cs.overflow !== 'scroll'
      ) {
        problemas.textoVazando.push({
          el: rotulo(el),
          conteudo: Math.round(larguraDoTexto),
          caixa: el.clientWidth,
        });
      }
    }
  }
  return problemas;
}

const browser = await chromium.launch({ executablePath: CHROME });
let falhas = 0;

for (const c of CENARIOS) {
  const ctx = await browser.newContext({
    viewport: { width: c.width, height: c.height },
    deviceScaleFactor: c.zoom ?? 1,
    locale: 'pt-BR',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => {
    for (const i of document.images) i.removeAttribute('loading');
  });
  await page.waitForTimeout(1500);

  const p = await page.evaluate(auditar, ALVO_IDEAL);

  const alvosUnicos = [...new Map(p.alvos.map((a) => [a.el + a.w + a.h, a])).values()];
  const estourosUnicos = [...new Map(p.estouros.map((e) => [e.el, e])).values()];
  const falhasAA = alvosUnicos.filter((a) => a.w < ALVO_AA || a.h < ALVO_AA);
  const abaixoDoIdeal = alvosUnicos.filter((a) => !falhasAA.includes(a));
  const ok = !p.overflowX && !estourosUnicos.length && !falhasAA.length && !p.textoVazando.length;
  if (!ok) falhas++;

  console.log(`\n### ${c.nome}${c.zoom ? ` (dpr ${c.zoom})` : ''}  ${ok ? '— sem problemas' : ''}`);
  if (p.overflowX) {
    console.log(
      `  ⚠ OVERFLOW-X: scrollWidth ${p.overflowX.scroll} > clientWidth ${p.overflowX.cliente}`,
    );
  }
  for (const e of estourosUnicos.slice(0, 6)) {
    console.log(`  ⚠ estoura a largura: ${e.el}  [${e.left}, ${e.right}]`);
  }
  if (estourosUnicos.length > 6) console.log(`    … +${estourosUnicos.length - 6}`);
  for (const a of falhasAA.slice(0, 10)) {
    console.log(`  ⚠ FALHA AA: alvo ${a.w}×${a.h} (mínimo ${ALVO_AA}): ${a.el}`);
  }
  if (falhasAA.length > 10) console.log(`    … +${falhasAA.length - 10}`);
  if (abaixoDoIdeal.length) {
    const quais = [...new Set(abaixoDoIdeal.map((a) => `${a.el.split(' ')[0]} (${a.w}×${a.h})`))];
    console.log(`  · passa em AA mas abaixo dos ${ALVO_IDEAL}px recomendados: ${quais.join(', ')}`);
  }
  for (const t of p.textoVazando.slice(0, 5)) {
    console.log(`  ⚠ texto vaza: ${t.el}  conteúdo ${t.conteudo}px em caixa ${t.caixa}px`);
  }

  await ctx.close();
}

await browser.close();
console.log(`\n${falhas ? `${falhas} cenário(s) com problemas` : 'todos os cenários limpos'}`);
process.exit(falhas ? 1 : 0);
