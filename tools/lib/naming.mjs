/**
 * Nomeação BEM-lite das classes extraídas dos atributos style="" do export.
 *
 * O bloco vem da seção; o elemento, de um atributo data-* quando o design já
 * nomeou a peça, senão de uma tabela de papéis por seção. Só cai em contador
 * quando não há nada melhor — e nesse caso o nome aparece no relatório do
 * transpiler para ser revisado à mão.
 */

/** section id / data-screen-label → bloco BEM. */
export const BLOCKS = {
  top: 'hero',
  Categorias: 'rail',
  manifesto: 'manifesto',
  servicos: 'servicos',
  presentes: 'presentes',
  produtos: 'galeria',
  loja: 'loja',
  'CTA final': 'cta',
};

/**
 * data-* → elemento BEM. O export usa esses atributos como gancho de CSS e de
 * JS, então eles já marcam exatamente as peças que merecem nome próprio.
 */
export const BY_DATA_ATTR = {
  nav: 'barra',
  burger: 'burger',
  bl: 'burger-linha',
  navlink: 'link',
  underline: 'underline',
  cartbar: 'pedido',
  mobilemenu: 'painel',
  mobilelink: 'link',
  orb: 'orb',
  stack: 'grade',
  float: 'flutuante',
  'hide-sm': 'so-desktop',
  'hide-nav': 'menu',
  rail: '', // data-rail="prev|next|track|bar" — o valor já é o nome
  noscroll: 'trilho',
  chip: 'chip',
  chipimg: 'chip-foto',
  chiptxt: 'chip-nome',
  card: 'card',
  media: 'card-media',
  veil: 'card-veu',
  dot: 'card-seta',
  scribble: 'rabisco',
  clipgrad: 'gradiente',
  wafab: 'whatsapp-fab',
  wapulse: 'whatsapp-pulso',
  magnetic: 'magnetico',
  anim: null, // só animação, não identifica a peça
  in: null,
  d: null,
  id: null,
  sd: null,
  pd: null,
  pulse: null,
  motion: '@raiz', // o valor é o modo de animação, não parte do nome
  'screen-label': null,
};

/** Papéis por tag quando o data-* não resolve. */
export const BY_TAG = {
  h1: 'titulo',
  h2: 'titulo',
  h3: 'nome',
  p: 'texto',
  figure: 'card',
  figcaption: 'legenda',
  article: 'card',
  nav: 'menu',
  img: 'foto',
  svg: 'grafico',
  button: 'botao',
  iframe: 'mapa',
  footer: 'rodape',
  header: 'barra',
};

/**
 * Papel inferido das próprias declarações, para os div/span que o export
 * deixou sem gancho. As camadas decorativas do design se repetem com
 * assinaturas muito específicas (overlay com inset:0 + pointer-events:none,
 * régua de 1px, rótulo versalete com tracking largo), então a declaração
 * identifica a peça melhor do que a posição na árvore.
 *
 * Ordem importa: a primeira que casar vence.
 */
const BY_DECLARATIONS = [
  // Camadas decorativas em inset:0 — assinaturas inconfundíveis.
  [/position:\s*absolute[\s\S]*inset:\s*0[\s\S]*repeating-linear-gradient/, 'textura'],
  [/position:\s*absolute[\s\S]*inset:\s*0[\s\S]*radial-gradient[\s\S]*pointer-events:\s*none/, 'halo'],
  [/position:\s*absolute[\s\S]*inset:\s*0[\s\S]*linear-gradient\(180deg/, 'veu'],
  [/position:\s*absolute[\s\S]*inset:\s*0[\s\S]*linear-gradient[\s\S]*pointer-events:\s*none/, 'verniz'],
  [/stroke-dasharray/, 'traco'],
  [/animation:\s*rabCue/, 'cursor'],

  // Tipografia de marca e rótulos.
  [/font-family:\s*Caveat/, 'manuscrito'],
  [/font-weight:\s*800[\s\S]*letter-spacing:\s*\.16em[\s\S]*font-stretch/, 'marca'],
  [/letter-spacing:\s*\.(34|4|2|14)em[\s\S]*text-transform:\s*uppercase/, 'rotulo'],
  [/text-transform:\s*uppercase[\s\S]*letter-spacing:\s*\.(34|4|2|14)em/, 'rotulo'],
  [/font-weight:\s*800[\s\S]*text-transform:\s*uppercase[\s\S]*font-size:\s*clamp/, 'nome'],
  [/^\s*font-size:\s*22px;\s*opacity/, 'seta'],

  // Containers e listas.
  [/max-width:\s*(1560|1100)px[\s\S]*margin:[\s\S]*auto/, 'container'],
  [/text-align:\s*center[\s\S]*max-width:\s*820px[\s\S]*margin:\s*0 auto/, 'intro'],
  [/max-width:\s*1560px[\s\S]*border-top:[\s\S]*flex-wrap:\s*wrap/, 'creditos'],
  [/display:\s*grid[\s\S]*gap:\s*0/, 'lista'],
  [/display:\s*flex[\s\S]*justify-content:\s*space-between[\s\S]*border-top:[\s\S]*font-size/, 'linha'],
  [/display:\s*flex[\s\S]*flex-direction:\s*column[\s\S]*gap:\s*12px[\s\S]*font-size/, 'coluna'],
  [/display:\s*flex[\s\S]*flex-direction:\s*column[\s\S]*line-height:\s*1/, 'identidade'],

  // Réguas, molduras e mídia.
  [/display:\s*block[\s\S]*height:\s*1px[\s\S]*background/, 'regua'],
  [/height:\s*1px[\s\S]*flex:\s*1[\s\S]*background/, 'regua'],
  [/height:\s*2px[\s\S]*border-radius[\s\S]*overflow:\s*hidden/, 'barra-progresso'],
  [/aspect-ratio:\s*1\/1[\s\S]*min-height:\s*320px/, 'moldura'],
  [/border-radius[\s\S]*overflow:\s*hidden[\s\S]*box-shadow/, 'moldura'],
  [/border-radius[\s\S]*overflow:\s*hidden[\s\S]*border:/, 'moldura'],
  [/position:\s*relative[\s\S]*height:\s*(300px|56%)/, 'midia'],

  // Agrupamentos e posições.
  [/margin-top:[\s\S]*display:\s*flex[\s\S]*flex-wrap:\s*wrap/, 'acoes'],
  [/display:\s*flex[\s\S]*align-items:\s*center[\s\S]*gap[\s\S]*margin-bottom/, 'eyebrow'],
  [/display:\s*flex[\s\S]*justify-content:\s*space-between[\s\S]*align-items:\s*flex-start/, 'topo'],
  [/display:\s*flex[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*space-between/, 'topo'],
  [/position:\s*absolute[\s\S]*top:[\s\S]*left:[\s\S]*letter-spacing/, 'indice'],
  [/^\s*font-size:\s*12px;[\s\S]*letter-spacing:\s*\.2em/, 'indice'],
  [/padding:\s*0 clamp[\s\S]*margin-top:\s*auto/, 'rodape-card'],
  [/^\s*display:\s*flex;\s*align-items:\s*center;\s*gap:[^;]*;\s*$/, 'grupo'],
  [/position:\s*relative[\s\S]*display:\s*inline-block/, 'realce'],
  [/position:\s*relative[\s\S]*z-index:\s*2/, 'realce'],
  [/display:\s*block[\s\S]*position:\s*relative[\s\S]*white-space:\s*nowrap/, 'linha-titulo'],

  // Genéricos — só chegam aqui os que nada mais descreve.
  [/^\s*font-size:\s*0;\s*$/, 'sem-espaco'],
  [/^\s*display:\s*block;\s*$/, 'bloco'],
  [/^\s*display:\s*block;\s*position:\s*relative;\s*$/, 'bloco'],
  [/^\s*position:\s*relative;\s*$/, 'camada'],
  [/^\s*padding:\s*clamp\([^)]*\);\s*$/, 'corpo'],
  [/^\s*font-weight:\s*700;\s*$/, 'destaque'],
];

/** Nome do elemento a partir dos atributos e, se preciso, das declarações. */
export function elementRole(node, declarations = '') {
  for (const [attr, value] of Object.entries(node.attributes ?? {})) {
    if (!attr.startsWith('data-')) continue;
    const key = attr.slice(5);
    if (!(key in BY_DATA_ATTR)) continue;
    const role = BY_DATA_ATTR[key];
    if (role === '') return value || null;
    if (role?.startsWith('@')) return role.slice(1);
    if (role) return value && value !== '1' ? `${role}-${value}` : role;
  }
  if (node.rawTagName === 'a') return 'link';
  if (BY_TAG[node.rawTagName]) return BY_TAG[node.rawTagName];

  for (const [re, role] of BY_DECLARATIONS) {
    if (re.test(declarations)) return role;
  }
  return null;
}

/** `bloco__elemento`, com sufixo numérico só quando houver colisão real. */
export function makeNamer() {
  const used = new Map();
  return function name(block, role) {
    const base = role ? `${block}__${role}` : block;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return { klass: base, ordinal: n };
  };
}
