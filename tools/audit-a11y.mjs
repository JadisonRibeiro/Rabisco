/**
 * Auditoria de acessibilidade com axe-core (regras WCAG 2.1 A e AA),
 * mais duas verificações que o axe não cobre bem numa página só:
 * ordem de tabulação e alcance do teclado.
 *
 *   node tools/audit-a11y.mjs [url]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const URL = process.argv[2] ?? 'http://localhost:4399/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(() => {
  for (const i of document.images) i.removeAttribute('loading');
});
await page.waitForTimeout(2000);
await page.addScriptTag({ path: AXE });

const resultado = await page.evaluate(async () => {
  // eslint-disable-next-line no-undef
  return axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    resultTypes: ['violations', 'incomplete'],
  });
});

console.log(`\n═══ axe-core — WCAG 2.1 A + AA ═══\n`);
if (!resultado.violations.length) {
  console.log('nenhuma violação');
} else {
  for (const v of resultado.violations) {
    console.log(`⚠ [${v.impact}] ${v.id} — ${v.help}  (${v.nodes.length} ocorrência(s))`);
    for (const n of v.nodes.slice(0, 4)) {
      console.log(`    ${n.target.join(' ')}`);
      const msg = (n.failureSummary ?? '').split('\n').filter(Boolean)[1];
      if (msg) console.log(`      ${msg.trim()}`);
    }
    if (v.nodes.length > 4) console.log(`    … +${v.nodes.length - 4}`);
  }
}

if (resultado.incomplete.length) {
  console.log(`\n─── precisa de conferência manual ───`);
  for (const v of resultado.incomplete) {
    console.log(`· ${v.id} — ${v.help} (${v.nodes.length})`);
  }
}

// ── Estrutura do documento ────────────────────────────────────────────────
const estrutura = await page.evaluate(() => {
  const niveis = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    nivel: Number(h.tagName[1]),
    texto: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 44),
  }));
  const pulos = [];
  for (let i = 1; i < niveis.length; i++) {
    if (niveis[i].nivel > niveis[i - 1].nivel + 1) {
      pulos.push(`h${niveis[i - 1].nivel} → h${niveis[i].nivel} em "${niveis[i].texto}"`);
    }
  }
  return {
    lang: document.documentElement.lang,
    h1: niveis.filter((n) => n.nivel === 1).length,
    total: niveis.length,
    pulos,
    marcos: {
      header: document.querySelectorAll('header').length,
      nav: document.querySelectorAll('nav').length,
      main: document.querySelectorAll('main').length,
      footer: document.querySelectorAll('footer').length,
    },
    imagensSemAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
    // ARIA redundante sobre HTML que já carrega o papel.
    ariaRedundante: [...document.querySelectorAll('[role]')]
      .filter((el) => {
        const nativo = {
          NAV: 'navigation',
          MAIN: 'main',
          HEADER: 'banner',
          FOOTER: 'contentinfo',
          BUTTON: 'button',
          A: 'link',
        };
        return nativo[el.tagName] === el.getAttribute('role');
      })
      .map((el) => `${el.tagName.toLowerCase()}[role=${el.getAttribute('role')}]`),
  };
});

console.log(`\n═══ estrutura ═══\n`);
console.log(`lang="${estrutura.lang}"  ·  ${estrutura.h1} h1  ·  ${estrutura.total} headings`);
console.log(
  `marcos: ${Object.entries(estrutura.marcos)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')}`,
);
console.log(`imagens sem atributo alt: ${estrutura.imagensSemAlt}`);
console.log(
  `ARIA redundante: ${estrutura.ariaRedundante.length ? estrutura.ariaRedundante.join(', ') : 'nenhum'}`,
);
if (estrutura.pulos.length) {
  for (const p of estrutura.pulos) console.log(`⚠ pulo de nível: ${p}`);
} else {
  console.log('hierarquia de headings sem pulos');
}

// ── Percurso por teclado ──────────────────────────────────────────────────
const foco = [];
for (let i = 0; i < 60; i++) {
  await page.keyboard.press('Tab');
  const atual = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      texto: (el.getAttribute('aria-label') || el.textContent || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 34),
      visivel: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden',
      // Anel de foco perceptível: outline real ou box-shadow desenhado.
      anel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
    };
  });
  if (!atual) break;
  foco.push(atual);
}

// Iframes de terceiros ficam de fora da contagem: ao tabular, o foco
// atravessa para o documento embutido, que é opaco, e o elemento hospedeiro
// nunca chega a casar :focus-within. Quem desenha o indicador ali dentro é o
// próprio embed. A regra de outline no host permanece para o caso de o foco
// parar nele (shift+tab, foco programático).
const semAnel = foco.filter((f) => f.visivel && !f.anel && f.tag !== 'iframe');
const iframes = foco.filter((f) => f.tag === 'iframe');
const invisiveis = foco.filter((f) => !f.visivel);
console.log(`\n═══ teclado ═══\n`);
console.log(`${foco.length} paradas de foco alcançadas`);
console.log(`sem anel de foco visível: ${semAnel.length}`);
for (const f of semAnel.slice(0, 6)) console.log(`  ⚠ ${f.tag} "${f.texto}"`);
if (iframes.length) {
  console.log(`iframes de terceiros (indicador é do embed): ${iframes.length}`);
}
console.log(`focáveis mas invisíveis: ${invisiveis.length}`);
for (const f of invisiveis.slice(0, 6)) console.log(`  ⚠ ${f.tag} "${f.texto}"`);

fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync('.work/a11y.json', JSON.stringify(resultado, null, 2));
await browser.close();

const falhou = resultado.violations.length > 0 || estrutura.pulos.length > 0 || semAnel.length > 0;
console.log(`\n${falhou ? 'há pendências' : 'sem pendências automatizadas'}`);
process.exit(falhou ? 1 : 0);
