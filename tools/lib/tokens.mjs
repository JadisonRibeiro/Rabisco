/**
 * Mapa valor-literal → custom property. Aplicado sobre as declarações
 * extraídas do export para que nenhum magic number sobreviva no CSS final.
 *
 * As cores viram `rgb(var(--x-rgb) / a%)` para que uma única troca de token
 * mova todas as opacidades derivadas junto.
 */

export const COLOR_RGB = {
  '20,16,14': 'ink',
  '250,246,240': 'cream',
  '246,62,11': 'glow', // brilhos herdados do laranja original do design
  '255,180,120': 'ember',
  '255,196,146': 'ember-claro',
  '255,168,64': 'ember-quente',
  '255,185,128': 'ember-suave',
  '0,0,0': 'preto',
};

export const HEX = {
  '#FAF6F0': 'var(--cream)',
  '#14100E': 'var(--ink)',
  '#F1EAE1': 'var(--sand)',
  '#EFE7DC': 'var(--sand-deep)',
  '#FFFDFA': 'var(--paper)',
  '#E23A12': 'var(--accent)',
  // O export escrevia var(--accent,#F63E0B); o fallback nunca era usado
  // porque --accent está sempre definido na raiz do componente.
  '#F63E0B': 'var(--accent)',
};

export const EASING = {
  'cubic-bezier(.16,.84,.24,1)': 'var(--ease)',
  'cubic-bezier(.2,.7,.3,1)': 'var(--ease-pulso)',
};

export const RADIUS = {
  '50%': 'var(--r-circulo)',
  '999px': 'var(--r-pilula)',
  '26px': 'var(--r-xl)',
  '24px': 'var(--r-lg)',
  '20px': 'var(--r-md)',
  '16px': 'var(--r-sm)',
  '2px': 'var(--r-xs)',
};

export const SHADOW = {
  '0 14px 26px -20px rgb(var(--ink-rgb)/55%)': 'var(--sombra-chip)',
  '0 0 0 1px rgb(var(--ink-rgb)/9%)': 'var(--aro)',
  '0 40px 70px -50px rgb(var(--ink-rgb)/70%)': 'var(--sombra-media)',
  '0 60px 90px -50px rgb(var(--ink-rgb)/80%)': 'var(--sombra-alta)',
};

export const DURATION = {
  '.25s': 'var(--t-xs)',
  '.35s': 'var(--t-sm)',
  '.4s': 'var(--t-md)',
  '.45s': 'var(--t-md-2)',
  '.5s': 'var(--t-lg)',
  '.55s': 'var(--t-lg-2)',
  '.6s': 'var(--t-xl)',
  '.7s': 'var(--t-xl-2)',
  '.9s': 'var(--t-xxl)',
};

/** Gutter horizontal da página — o mesmo clamp em 15 lugares. */
export const SPACING = {
  'clamp(20px,4vw,64px)': 'var(--gutter)',
  'clamp(146px,12.4vw,186px)': 'var(--secao-y)',
  'clamp(96px,9vw,146px)': 'var(--gutter-nav)',
  'clamp(16px,3vw,48px)': 'var(--gap-md)',
  'clamp(14px,2vw,28px)': 'var(--gap-sm)',
  'clamp(22px,3vw,44px)': 'var(--pad-linha)',
};

/**
 * Reescreve uma lista de declarações CSS trocando literais por tokens.
 * Conservador de propósito: só troca o que está no mapa, byte a byte.
 */
export function tokenize(css) {
  let out = css;

  // rgba(r,g,b,a) → rgb(var(--x-rgb) / a%)
  out = out.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g, (m, r, g, b, a) => {
    const name = COLOR_RGB[`${r},${g},${b}`];
    if (!name) return m;
    const pct = +(parseFloat(a) * 100).toFixed(4);
    return `rgb(var(--${name}-rgb)/${pct}%)`;
  });

  // var(--accent,#F63E0B) → var(--accent): o fallback era código morto.
  out = out.replace(/var\(--accent\s*,\s*#F63E0B\)/gi, 'var(--accent)');

  for (const [hex, token] of Object.entries(HEX)) {
    out = out.replace(new RegExp(hex.replace('#', '#'), 'gi'), token);
  }
  for (const [literal, token] of Object.entries(EASING)) {
    out = out.split(literal).join(token);
  }
  for (const [literal, token] of Object.entries(SPACING)) {
    out = out.split(literal).join(token);
  }
  return out;
}

/** Trocas que só fazem sentido quando a declaração inteira é o valor. */
export function tokenizeWhole(prop, value) {
  const table =
    prop === 'border-radius'
      ? RADIUS
      : prop === 'box-shadow'
        ? SHADOW
        : null;
  return table?.[value.trim()] ?? value;
}
