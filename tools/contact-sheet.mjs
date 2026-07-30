/** Folha de contato das fotos de conteúdo — para conferir se cada imagem
 *  corresponde ao rótulo que o site dá a ela. Uso: node tools/contact-sheet.mjs */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const DIR = path.resolve(import.meta.dirname, '../src/assets/images');
const files = fs.readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

const page = `<body style="margin:0;background:#1b1b1b;display:grid;
  grid-template-columns:repeat(5,200px);gap:6px;padding:6px;
  font:11px/1.4 sans-serif;color:#eee">${files
    .map(
      (f) => `<figure style="margin:0"><img src="${f}"
        style="width:200px;height:150px;object-fit:cover;display:block;background:#333">
        <figcaption>${f}</figcaption></figure>`,
    )
    .join('')}</body>`;

const tmp = path.join(DIR, '_contact.html');
fs.writeFileSync(tmp, page);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const p = await browser.newPage({ viewport: { width: 1040, height: 600 } });
await p.goto(url.pathToFileURL(tmp).href);
await p.screenshot({
  path: path.resolve(import.meta.dirname, '../.work/contact.png'),
  fullPage: true,
});
await browser.close();
fs.unlinkSync(tmp);
console.log(`folha de contato: .work/contact.png (${files.length} imagens)`);
