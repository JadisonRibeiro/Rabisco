/** Barra do topo encolhe e ganha sombra depois dos primeiros 40px de rolagem. */

const LIMIAR = 40;

export function initNavCondense({ on }) {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  const sync = () => nav.classList.toggle('nav__barra--condensada', window.scrollY > LIMIAR);

  on(window, 'scroll', sync, { passive: true });
  sync();
}
