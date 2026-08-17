/**
 * Converte o template do export em HTML semântico + CSS com classes e tokens.
 *
 * Migração one-shot, como unbundle.mjs: roda uma vez, o resultado em src/ é
 * código normal daí em diante. Fica versionado porque é a prova de que o
 * src/ deriva do export sem retoque manual escondido.
 *
 *   node tools/transpile.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { elementRole, BLOCKS, makeNamer } from './lib/naming.mjs';
import { tokenize, tokenizeWhole } from './lib/tokens.mjs';
import {
  groupRulesByBlock,
  writeComponentStyles,
  rewriteFontFaces,
  tokenizeGlobalCss,
} from './lib/emit.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const WORK = path.join(ROOT, '.work');

/** Valores das props resolvidos em build-time (o runtime fazia isto no cliente). */
const WHATSAPP = '5591991032292';
const PROPS = {
  motion: 'cinematico',
  accentColor: 'var(--accent)',
  showTicker: true,
  waLink: `https://wa.me/${WHATSAPP}`,
  mapsLink:
    'https://www.google.com/maps/search/?api=1&query=-2.99689229059232%2C-47.35176811287142',
  year: String(new Date().getFullYear()),
};

/** Texto alternativo das fotos. Vazio onde a imagem é decorativa ou onde o
 *  rótulo visível adjacente já nomeia a peça (alt redundante atrapalha). */
const ALT = {
  'rab-fachada': 'Fachada da Rabisco Papelaria: vitrine iluminada com o letreiro laranja da loja',
  'rab-arte': 'Vidros de tinta e pincéis sobre a bancada do ateliê',
  'rab-cat1': '',
  'rab-cat2': '',
  'rab-cat3': '',
  'rab-cat4': '',
  'rab-cat5': '',
  'rab-cat6': '',
  'rab-cat7': '',
  'rab-cat8': '',
  'rab-kit1': 'Caderno aberto com caneta-tinteiro apoiada sobre a página',
  'rab-kit2': 'Páginas de sketchbook cobertas de estudos de figura a grafite',
  'rab-kit3': 'Carimbo de mesa sobre bandeja preta',
  'rab-gal1': 'Canetas coloridas agrupadas em um porta-lápis de cerâmica',
  'rab-gal2': 'Cachorro deitado ao sol no muro de uma calçada arborizada',
  'rab-gal3': 'Gravura antiga emoldurada sobre fundo vermelho',
  'rab-gal4': 'Óculos de leitura apoiado ao lado de uma caneta sobre a mesa',
  'rab-gal5': 'Apostila aberta mostrando uma ilustração impressa',
};

/** Atributos camelCase que o runtime remontava a partir de sc-camel-*. */
const CAMEL = {
  'sc-camel-view-box': 'viewBox',
  'sc-camel-preserve-aspect-ratio': 'preserveAspectRatio',
  'sc-camel-path-length': 'pathLength',
};

const read = (f) => fs.readFileSync(path.join(WORK, f), 'utf8');

/** Resolve {{ expr }} contra as props já calculadas. */
function interpolate(text) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    if (key === 'true') return 'true';
    if (!(key in PROPS)) throw new Error(`interpolação não resolvida: ${m}`);
    return String(PROPS[key]);
  });
}

/** Divide um style="" em pares [prop, valor] preservando parênteses. */
function splitDeclarations(css) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of css) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    } else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.map((d) => {
    const i = d.indexOf(':');
    return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
  });
}

/** Declarações normalizadas + tokenizadas, prontas para virar regra CSS. */
function toRule(css) {
  return (
    splitDeclarations(css)
      .map(([prop, value]) => [prop, tokenize(tokenizeWhole(prop, value))])
      // `--accent: var(--accent)` sobrava da interpolação: o runtime injetava a
      // cor aqui, mas agora ela já vem de :root e a redeclaração é circular.
      .filter(([prop, value]) => !(prop.startsWith('--') && value === `var(${prop})`))
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n')
  );
}

function main() {
  const template = read('template.html');
  const { assets } = JSON.parse(read('page.json'));
  const root = parse(interpolate(template), {
    lowerCaseTagName: false,
    comment: false,
    voidTag: { closingSlash: true },
    blockTextElements: { script: true, style: true },
  });

  // ── uuid → caminho do asset ──────────────────────────────────────────────
  const assetPath = (uuid) => {
    const a = assets[uuid];
    if (!a) throw new Error(`asset desconhecido: ${uuid}`);
    return `/assets/${a.dir}/${a.file}`;
  };

  // ── 1. <image-slot> vira <img> ────────────────────────────────────────────
  // O shadow DOM posicionava a imagem com left/top/width/height calculados em
  // JS: base = fit==='contain' ? min(fw/iw,fh/ih) : max(...), centrada em
  // (50+x)% / (50+y)%. Os 18 slots têm s=1, x=0, y=0 — exatamente o que
  // object-fit + object-position:center fazem em CSS puro.
  const slots = [];
  for (const slot of root.querySelectorAll('image-slot')) {
    const id = slot.getAttribute('id');
    const fit = slot.getAttribute('fit') || 'cover';
    const shape = slot.getAttribute('shape') || 'rect';
    if (!(id in ALT)) throw new Error(`slot sem alt definido: ${id}`);

    const img = parse('<img>').firstChild;
    img.setAttribute('src', assetPath(slot.getAttribute('src')));
    img.setAttribute('alt', ALT[id]);
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('class', `foto foto--${fit}`);
    // O dimensionamento vinha do style do slot (width/height 100%); segue
    // para o <img> e é extraído em classe junto com todo o resto.
    const styleDoSlot = slot.getAttribute('style');
    if (styleDoSlot) img.setAttribute('style', styleDoSlot);
    slot.replaceWith(img);
    slots.push({ id, fit, shape });
  }

  // ── 2. sc-camel-* → atributos SVG reais ───────────────────────────────────
  let camelFixed = 0;
  for (const [from, to] of Object.entries(CAMEL)) {
    for (const el of root.querySelectorAll(`[${from}]`)) {
      el.setAttribute(to, el.getAttribute(from));
      el.removeAttribute(from);
      camelFixed++;
    }
  }

  // ── 3. srcs remanescentes (imgs do markup) ────────────────────────────────
  for (const img of root.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (/^[0-9a-f-]{36}$/.test(src)) img.setAttribute('src', assetPath(src));
  }

  // ── 4. style="" e style-hover="" → classes ────────────────────────────────
  const namer = makeNamer();
  const rules = new Map(); // classe → { decls, hover, count }
  const byDecls = new Map(); // declarações idênticas → classe já criada
  let block = 'pagina';

  const walk = (node) => {
    if (node.nodeType !== 1) return;

    const sectionKey = node.getAttribute?.('id') ?? node.getAttribute?.('data-screen-label');
    if (sectionKey && BLOCKS[sectionKey]) block = BLOCKS[sectionKey];
    if (node.rawTagName === 'header') block = 'nav';
    if (node.rawTagName === 'footer') block = 'rodape';
    if (node.getAttribute?.('data-mobilemenu') != null) block = 'menu';

    const style = node.getAttribute?.('style');
    const hover = node.getAttribute?.('style-hover');
    if (style || hover) {
      const decls = style ? toRule(style) : '';
      const hoverDecls = hover ? toRule(hover) : '';
      const key = `${decls}||${hoverDecls}`;

      let klass = byDecls.get(key);
      if (klass) {
        // Mesmas declarações reaproveitadas em outro bloco: a regra não
        // pertence a nenhum deles, é utilitária. Registra para renomear.
        const dono = klass.split('__')[0].replace(/-\d+$/, '');
        if (dono !== block) rules.get(klass).compartilhada = true;
      } else {
        klass = namer(block, elementRole(node, decls)).klass;
        // Colisão de nome com declarações diferentes: numera.
        if (rules.has(klass)) {
          let n = 2;
          while (rules.has(`${klass}-${n}`)) n++;
          klass = `${klass}-${n}`;
        }
        rules.set(klass, { decls, hover: hoverDecls, count: 0, compartilhada: false });
        byDecls.set(key, klass);
      }
      rules.get(klass).count++;

      const existing = node.getAttribute('class');
      node.setAttribute('class', existing ? `${existing} ${klass}` : klass);
      node.removeAttribute('style');
      node.removeAttribute('style-hover');
    }

    for (const child of node.childNodes) walk(child);
  };
  walk(root);

  // ── 4b. regras usadas por mais de um bloco viram utilitárias ─────────────
  // Nomeá-las pelo bloco onde apareceram primeiro (`hero__bloco` dentro do
  // manifesto) mentiria sobre o dono da regra.
  const renomeadas = new Map();
  for (const [klass, rule] of [...rules]) {
    if (!rule.compartilhada) continue;
    const papel = klass.includes('__') ? klass.split('__')[1] : klass;
    const util = `u-${papel.replace(/-\d+$/, '')}`;
    if (rules.has(util)) continue;
    renomeadas.set(klass, util);
    rules.delete(klass);
    rules.set(util, rule);
  }
  if (renomeadas.size) {
    for (const el of root.querySelectorAll('[class]')) {
      const classes = el
        .getAttribute('class')
        .split(/\s+/)
        .map((c) => renomeadas.get(c) ?? c);
      el.setAttribute('class', classes.join(' '));
    }
  }

  // ── 5. desmonta os wrappers do runtime ────────────────────────────────────
  // <sc-if value="true"> mantém os filhos; <x-dc> e <helmet> eram só o
  // envelope que o runtime usava para achar o componente e o <head> dele.
  for (const el of root.querySelectorAll('sc-if')) el.replaceWith(el.innerHTML);

  // Os dois <style> do export moram dentro do <helmet>: o primeiro são as
  // @font-face, o segundo é o CSS global da página. Capturados antes de o
  // helmet ser descartado.
  const styleTags = root.querySelectorAll('style');
  if (styleTags.length !== 2) {
    throw new Error(`esperava 2 <style>, achei ${styleTags.length}`);
  }
  const fontCss = rewriteFontFaces(styleTags[0].innerHTML, assets);
  const globalCss = tokenizeGlobalCss(styleTags[1].innerHTML);

  const host = root.querySelector('x-dc');
  if (!host) throw new Error('<x-dc> não encontrado — o export mudou de formato');
  for (const el of host.querySelectorAll('helmet')) el.remove();
  fs.writeFileSync(path.join(WORK, 'body.html'), host.innerHTML.trim() + '\n');

  // ── 6. emite os arquivos ──────────────────────────────────────────────────
  const ruleList = [...rules].map(([k, v]) => ({ klass: k, ...v }));
  const groups = groupRulesByBlock(ruleList);
  writeComponentStyles(path.join(ROOT, 'src/styles/components'), groups, BLOCK_TITLES);

  fs.writeFileSync(path.join(ROOT, 'src/styles/fonts.css'), fontCss.trim() + '\n');
  fs.writeFileSync(path.join(WORK, 'global.css'), globalCss.trim() + '\n');

  fs.writeFileSync(path.join(WORK, 'transpiled.html'), root.toString());
  fs.writeFileSync(path.join(WORK, 'rules.json'), JSON.stringify(ruleList, null, 2));

  console.log(`image-slot → img : ${slots.length}`);
  console.log(`sc-camel-*       : ${camelFixed} atributos`);
  console.log(`classes geradas  : ${rules.size} (de 349 atributos style)`);
  console.log(`componentes CSS  : ${groups.size} arquivos em src/styles/components/`);
  console.log(`saída            : .work/transpiled.html, .work/rules.json`);
}

/** Cabeçalho de cada arquivo de componente. */
const BLOCK_TITLES = {
  utilitarias: 'Regras reaproveitadas por mais de um bloco',
  pagina: 'Raiz da página — variáveis de instância do tema',
  nav: 'Barra fixa do topo',
  menu: 'Menu mobile em tela cheia',
  hero: 'Hero — título, fachada e chamadas',
  rail: 'Carrossel horizontal de categorias',
  manifesto: 'Manifesto e cards de curadoria',
  servicos: 'Lista de serviços de balcão',
  presentes: 'Kits de presente',
  galeria: 'Galeria de produtos',
  loja: 'Endereço, horários e mapa',
  cta: 'Chamada final',
  rodape: 'Rodapé',
};

main();
