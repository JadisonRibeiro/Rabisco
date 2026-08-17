/**
 * Imagem Open Graph, 1200×630.
 *
 * Renderizada no Chrome, e não pelo rasterizador SVG do sharp, porque só o
 * navegador carrega a Archivo self-hosted do projeto — o sharp cai numa
 * fonte do sistema e o cartão sai com outra tipografia que não é a da marca.
 * De quebra, os tokens vêm do mesmo tokens.css que o site usa.
 *
 *   node tools/gerar-og.mjs
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const SAIDA = path.join(ROOT, 'public/og-image.png');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const asFileUrl = (p) => url.pathToFileURL(path.join(ROOT, p)).href;

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="${asFileUrl('src/styles/tokens.css')}">
<style>
  @font-face {
    font-family: Archivo;
    src: url("${asFileUrl('src/assets/fonts/archivo-latin.woff2')}") format('woff2');
    font-weight: 100 900;
    font-stretch: 62% 125%;
  }
  @font-face {
    font-family: Archivo;
    src: url("${asFileUrl('src/assets/fonts/archivo-latin-ext.woff2')}") format('woff2');
    font-weight: 100 900;
    font-stretch: 62% 125%;
    unicode-range: U+0100-02BA, U+1E00-1E9F, U+2020, U+20A0-20AB;
  }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: var(--accent); color: var(--cream);
    font-family: Archivo, sans-serif;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 88px; position: relative;
  }
  /* Mesma linguagem das seções laranja do site. */
  .textura {
    position: absolute; inset: 0; pointer-events: none;
    background-image: repeating-linear-gradient(
      104deg, rgb(var(--cream-rgb)/10%) 0 1px, rgb(var(--cream-rgb)/0%) 1px 96px);
    mask-image: linear-gradient(104deg,
      rgb(0 0 0 / 0%) 6%, rgb(0 0 0 / 90%) 58%, rgb(0 0 0 / 25%) 100%);
  }
  .halo {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(90% 130% at 86% 8%,
      rgb(var(--ember-suave-rgb)/34%), rgb(var(--ember-suave-rgb)/0%) 62%);
  }
  .marca {
    position: relative; font-size: 22px; font-weight: 800;
    letter-spacing: .34em; text-transform: uppercase; opacity: .82;
    margin-bottom: 38px;
  }
  h1 {
    position: relative; font-size: 78px; font-weight: 800; font-stretch: 78%;
    line-height: .96; letter-spacing: -.025em; max-width: 780px;
  }
  .sub {
    position: relative; margin-top: 40px; font-size: 27px; line-height: 1.5;
    color: rgb(var(--cream-rgb)/93%); max-width: 760px;
  }
  /* O R sangra pela direita, atrás do texto, como no hero do site. */
  .r {
    position: absolute; right: -70px; bottom: -120px; width: 520px;
    opacity: .17; pointer-events: none;
  }
</style></head>
<body>
  <div class="textura"></div>
  <div class="halo"></div>
  <img class="r" src="${asFileUrl('tools/marca/logo-rabisco.png')}" alt="">
  <div class="marca">Rabisco Papelaria</div>
  <h1>Toda grande ideia começa com um rabisco</h1>
  <p class="sub">
    Papéis, canetas e cadernos no Centro de Paragominas, PA.<br>
    Impressão · encadernação · personalização · presentes
  </p>
</body></html>`;

const tmp = path.join(ROOT, '.work/og.html');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, html);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(url.pathToFileURL(tmp).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({ path: SAIDA });
await browser.close();

console.log(`og-image.png  1200×630  ${(fs.statSync(SAIDA).size / 1024).toFixed(1)} KB`);
