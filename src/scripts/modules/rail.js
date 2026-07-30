/**
 * Carrossel horizontal de categorias: setas, barra de progresso e arraste
 * com o mouse. O toque usa a rolagem nativa — só o ponteiro fino precisa de
 * ajuda, por isso o pointerdown ignora `touch`.
 */

const PASSO_MINIMO = 220;
const FRACAO_DA_LARGURA = 0.62;
const LARGURA_MINIMA_DA_BARRA = 14; // %
const TOLERANCIA_DE_ARRASTE = 3; // px antes de considerar que houve arraste

export function initRail({ on, add }) {
  const track = document.querySelector('[data-rail="track"]');
  if (!track) return;

  const bar = document.querySelector('[data-rail="bar"]');
  const passo = () => Math.max(PASSO_MINIMO, track.clientWidth * FRACAO_DA_LARGURA);
  const mover = (direcao) => track.scrollBy({ left: direcao * passo(), behavior: 'smooth' });

  const prev = document.querySelector('[data-rail="prev"]');
  const next = document.querySelector('[data-rail="next"]');
  if (prev) on(prev, 'click', () => mover(-1));
  if (next) on(next, 'click', () => mover(1));

  const sincronizarBarra = () => {
    if (!bar) return;
    const max = track.scrollWidth - track.clientWidth;
    const fracaoVisivel = track.clientWidth / track.scrollWidth;
    const percurso = (1 - fracaoVisivel) * 100;
    bar.style.width = `${Math.max(LARGURA_MINIMA_DA_BARRA, fracaoVisivel * 100)}%`;
    bar.style.transform = `translateX(${max > 0 ? (track.scrollLeft / max) * percurso : 0}%)`;
  };
  on(track, 'scroll', sincronizarBarra, { passive: true });
  on(window, 'resize', sincronizarBarra);
  sincronizarBarra();

  // ── arraste com ponteiro fino ───────────────────────────────────────────
  let arrastando = false;
  let xInicial = 0;
  let scrollInicial = 0;
  let houveMovimento = false;

  on(track, 'pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    arrastando = true;
    houveMovimento = false;
    xInicial = e.clientX;
    scrollInicial = track.scrollLeft;
    track.classList.add('rail__trilho--arrastando');
  });

  on(window, 'pointermove', (e) => {
    if (!arrastando) return;
    const delta = e.clientX - xInicial;
    if (Math.abs(delta) > TOLERANCIA_DE_ARRASTE) houveMovimento = true;
    track.scrollLeft = scrollInicial - delta;
  });

  on(window, 'pointerup', () => {
    if (!arrastando) return;
    arrastando = false;
    track.classList.remove('rail__trilho--arrastando');
  });

  // Um arraste que termina sobre um chip não deve navegar.
  on(
    track,
    'click',
    (e) => {
      if (!houveMovimento) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  add(() => track.classList.remove('rail__trilho--arrastando'));
}
