/**
 * Gera favicons e ícones de app a partir da arte da marca. Roda sob demanda,
 * não no build — os arquivos ficam versionados em public/ porque não mudam
 * entre deploys. A imagem Open Graph sai de gerar-og.mjs, que precisa do
 * navegador para usar a fonte da marca.
 *
 *   node tools/gerar-icones.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

/*
 * Duas artes do mesmo R, uma por superfície. O R laranja sobre o fundo
 * laranja dava 1,2:1 — o ícone lia como um quadrado laranja sem desenho.
 * A regra é simples: fundo laranja pede o R creme, fundo creme pede o R
 * laranja. Ambas as combinações ficam em 5,06:1.
 */
const MARCA_LARANJA = path.join(ROOT, 'src/assets/images/logo-rabisco.png');
const MARCA_CREME = path.join(ROOT, 'src/assets/images/r-marca.png');

const CREME = { r: 250, g: 246, b: 240, alpha: 1 };
const ACCENT = { r: 199, g: 48, b: 12, alpha: 1 };

fs.mkdirSync(PUBLIC, { recursive: true });

/** O R da marca centrado num quadrado, com respiro proporcional. */
async function icone(tamanho, fundo, arquivo, marcaArte = MARCA_CREME) {
  const respiro = Math.round(tamanho * 0.18);
  const marca = await sharp(marcaArte)
    .resize(tamanho - respiro * 2, tamanho - respiro * 2, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: fundo },
  })
    .composite([{ input: marca, gravity: 'center' }])
    .png()
    .toFile(path.join(PUBLIC, arquivo));

  const kb = (fs.statSync(path.join(PUBLIC, arquivo)).size / 1024).toFixed(1);
  console.log(`${arquivo.padEnd(24)} ${tamanho}×${tamanho}  ${kb} KB`);
}

/**
 * .ico com 16, 32 e 48px. Escrito à mão: sharp não emite ICO, e o formato é
 * só um cabeçalho de diretório seguido dos PNGs concatenados.
 */
async function favicon() {
  const tamanhos = [16, 32, 48];
  const pngs = [];
  for (const t of tamanhos) {
    const respiro = Math.max(1, Math.round(t * 0.12));
    const marca = await sharp(MARCA_CREME)
      .resize(t - respiro * 2, t - respiro * 2, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();
    pngs.push(
      await sharp({ create: { width: t, height: t, channels: 4, background: ACCENT } })
        .composite([{ input: marca, gravity: 'center' }])
        .png()
        .toBuffer(),
    );
  }

  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0); // reservado
  cabecalho.writeUInt16LE(1, 2); // 1 = ícone
  cabecalho.writeUInt16LE(tamanhos.length, 4);

  let deslocamento = 6 + tamanhos.length * 16;
  const entradas = tamanhos.map((t, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(t === 256 ? 0 : t, 0);
    e.writeUInt8(t === 256 ? 0 : t, 1);
    e.writeUInt8(0, 2); // paleta
    e.writeUInt8(0, 3); // reservado
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(deslocamento, 12);
    deslocamento += pngs[i].length;
    return e;
  });

  const ico = Buffer.concat([cabecalho, ...entradas, ...pngs]);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico);
  console.log(`favicon.ico              16/32/48  ${(ico.length / 1024).toFixed(1)} KB`);
}

await favicon();
await icone(180, ACCENT, 'apple-touch-icon.png');
await icone(192, ACCENT, 'icon-192.png');
await icone(512, ACCENT, 'icon-512.png');
await icone(512, CREME, 'icon-512-maskable.png', MARCA_LARANJA);
