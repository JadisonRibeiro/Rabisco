/**
 * Captura screenshots full-page em todos os viewports de auditoria.
 * Usa o Chrome do sistema (playwright-core não baixa navegador).
 *
 *   node tools/shoot.mjs <url> <dir-de-saida> [--sections]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

export const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
  { name: 'landscape-740x360', width: 740, height: 360 },
];

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Neutraliza tudo que varia entre execuções: animações, orbs, blur, scroll. */
const FREEZE_CSS = `
  *, *::before, *::after {
    animation-play-state: paused !important;
    animation-delay: -1s !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
`;

export async function shoot(url, outDir, { viewports = VIEWPORTS } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
        locale: 'pt-BR',
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

      // 'load' e não 'networkidle': o iframe do Google Maps mantém conexões
      // abertas e a rede nunca fica ociosa.
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      // O runtime do bundle monta em duas etapas; espera o conteúdo real existir.
      await page.waitForSelector('header, [data-nav]', { timeout: 30000 }).catch(() => {});
      await page.addStyleTag({ content: FREEZE_CSS });
      // A captura precisa da página completa; loading="lazy" deixaria de fora
      // tudo que não passou pela viewport durante a varredura.
      await page.evaluate(() => {
        for (const img of document.images) img.removeAttribute('loading');
      });
      // Percorre a página inteira para disparar lazy-loading e animações de entrada.
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 16));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1200);
      // Imagens com loading="lazy" que ficaram fora da viewport nunca
      // completam — a espera precisa de teto para não travar aqui.
      // decode() além de load: numa página muito alta o Chrome adia a
      // decodificação do que está longe da viewport e a captura sai em branco.
      await page.evaluate(() => {
        const prontas = [...document.images].map((i) => i.decode().catch(() => {}));
        return Promise.race([Promise.all(prontas), new Promise((r) => setTimeout(r, 20000))]);
      });
      await page.screenshot({ path: `${outDir}/${vp.name}.png`, fullPage: true });

      const metrics = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        height: document.body.scrollHeight,
      }));
      console.log(
        `${vp.name.padEnd(20)} ${String(metrics.height).padStart(6)}px alto` +
          `${metrics.scrollW > metrics.clientW ? `  ⚠ OVERFLOW-X (${metrics.scrollW} > ${metrics.clientW})` : ''}` +
          `${errors.length ? `  ⚠ ${errors.length} erro(s): ${errors[0].slice(0, 80)}` : ''}`,
      );
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith('shoot.mjs') &&
  process.argv[1].endsWith('shoot.mjs')
) {
  const [url, outDir] = process.argv.slice(2);
  if (!url || !outDir) {
    console.error('uso: node tools/shoot.mjs <url> <dir>');
    process.exit(1);
  }
  await shoot(url, outDir);
}
