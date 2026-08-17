/**
 * Migração one-shot: abre o export self-extracting do Claude Design e escreve
 * os assets reais em src/assets/, além de um intermediário .work/page.json com
 * o template, os estilos inline e o mapa uuid→arquivo.
 *
 * NÃO faz parte do build. Roda uma vez; depois src/ é código normal.
 *
 *   node tools/unbundle.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'src');
const WORK = path.join(ROOT, '.work');

/** Lê o conteúdo cru de um <script type="__bundler/*"> do export. */
function readBundleTag(html, type) {
  const open = `<script type="__bundler/${type}">`;
  const i = html.indexOf(open);
  if (i < 0) throw new Error(`tag __bundler/${type} ausente`);
  const start = i + open.length;
  return html.slice(start, html.indexOf('</script>', start));
}

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'font/woff2': 'woff2',
  'text/javascript': 'js',
};

/**
 * Nomes de arquivo por uuid. Derivados do papel de cada asset na página —
 * lidos do template (id/placeholder dos image-slot, comentário do @font-face)
 * e não de heurística, para o mapa não silenciar se o export mudar.
 */
/** Os ids dos slots são posicionais (cat1, gal3…). O arquivo em disco leva o
 *  assunto, que é o que se procura ao abrir a pasta meses depois. */
const SLOT_NAMES = {
  'rab-fachada': 'fachada',
  'rab-arte': 'arte-fina',
  'rab-cat1': 'cat-canetas',
  'rab-cat2': 'cat-cadernos',
  'rab-cat3': 'cat-marca-textos',
  'rab-cat4': 'cat-planners',
  'rab-cat5': 'cat-arte-fina',
  'rab-cat6': 'cat-escolar',
  'rab-cat7': 'cat-escritorio',
  'rab-cat8': 'cat-novidades',
  'rab-kit1': 'kit-primeira-pagina',
  'rab-kit2': 'kit-estudio',
  'rab-kit3': 'kit-escritorio',
  'rab-gal1': 'gal-canetas-tecnicas',
  'rab-gal2': 'gal-cadernos-pontilhados',
  'rab-gal3': 'gal-aquarela',
  'rab-gal4': 'gal-planners',
  'rab-gal5': 'gal-mesa-de-teste',
};

function nameAssets(template, manifest) {
  const names = {};

  // image-slot: o id do slot amarra o arquivo ao seu lugar na página.
  for (const m of template.matchAll(/<image-slot\b[^>]*>/g)) {
    const tag = m[0];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (!id || !src) continue;
    const name = SLOT_NAMES[id];
    if (!name) throw new Error(`slot sem nome mapeado: ${id}`);
    names[src] = name;
  }

  // @font-face: o comentário anterior ao bloco nomeia o subset.
  for (const m of template.matchAll(
    /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{[^}]*?font-family:\s*'([^']+)'[^}]*?url\("([^"]+)"\)/gs,
  )) {
    const [, subset, family, uuid] = m;
    names[uuid] = `${family.toLowerCase()}-${subset}`;
  }

  // <img> soltos no markup: nomeados pelo alt quando houver, senão pelo papel.
  const IMG_ROLES = { Rabisco: 'logo-rabisco', '': 'r-marca' };
  for (const m of template.matchAll(/<img\b[^>]*>/g)) {
    const src = m[0].match(/\bsrc="([^"]+)"/)?.[1];
    const alt = m[0].match(/\balt="([^"]*)"/)?.[1];
    if (src && !names[src] && alt !== undefined) {
      names[src] = IMG_ROLES[alt] ?? IMG_ROLES[''];
    }
  }

  // Qualquer asset restante (runtime, react) fica fora de src/ — é descartado.
  const unnamed = Object.keys(manifest).filter((u) => !names[u]);
  return { names, unnamed };
}

function main() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const manifest = JSON.parse(readBundleTag(html, 'manifest'));
  const template = JSON.parse(readBundleTag(html, 'template'));

  const { names, unnamed } = nameAssets(template, manifest);

  const imagesDir = path.join(SRC, 'assets/images');
  const fontsDir = path.join(SRC, 'assets/fonts');
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(fontsDir, { recursive: true });
  fs.mkdirSync(WORK, { recursive: true });

  const assets = {};
  for (const [uuid, entry] of Object.entries(manifest)) {
    const name = names[uuid];
    if (!name) continue;
    let bytes = Buffer.from(entry.data, 'base64');
    if (entry.compressed) bytes = zlib.gunzipSync(bytes);
    const ext = EXT_BY_MIME[entry.mime];
    if (!ext) throw new Error(`mime sem extensão mapeada: ${entry.mime}`);
    const isFont = entry.mime.startsWith('font/');
    const file = `${name}.${ext}`;
    fs.writeFileSync(path.join(isFont ? fontsDir : imagesDir, file), bytes);
    assets[uuid] = {
      file,
      dir: isFont ? 'fonts' : 'images',
      mime: entry.mime,
      bytes: bytes.length,
    };
  }

  // Estilos inline, normalizados e agrupados — insumo para a extração em CSS.
  const norm = (s) =>
    s
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .sort()
      .join('; ');
  const groupStyles = (attr) => {
    const re = new RegExp(` ${attr}="([^"]*)"`, 'g');
    const counts = {};
    for (const m of template.matchAll(re)) {
      const k = norm(m[1]);
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([decls, count]) => ({ count, decls }));
  };

  fs.writeFileSync(
    path.join(WORK, 'page.json'),
    JSON.stringify(
      {
        template,
        assets,
        discarded: unnamed.map((u) => ({ uuid: u, mime: manifest[u].mime })),
        styles: groupStyles('style'),
        stylesHover: groupStyles('style-hover'),
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(WORK, 'template.html'), template);

  const kept = Object.values(assets).reduce((s, a) => s + a.bytes, 0);
  console.log(`assets escritos: ${Object.keys(assets).length} (${(kept / 1024).toFixed(0)} KB)`);
  console.log(
    `descartados: ${unnamed.length} — ${unnamed.map((u) => manifest[u].mime).join(', ')}`,
  );
  console.log(`intermediário: .work/page.json`);
}

main();
