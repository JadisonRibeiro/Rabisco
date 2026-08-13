/**
 * Efeitos que seguem o ponteiro: paralaxe dos orbs do hero e atração
 * magnética dos botões principais.
 *
 * Ambos só existem com ponteiro fino e movimento permitido — quem navega no
 * toque ou pediu prefers-reduced-motion nunca paga por este módulo.
 */

const SUAVIZACAO = 0.06;
const AMPLITUDE_X = 46;
const AMPLITUDE_Y = 34;
const CONTRA_ORB = -0.62; // o segundo orb anda no contrafluxo do primeiro
const IMA_X = 12;
const IMA_Y = 9;
const IMA_ESCALA = 1.035;

/** Orbs do hero perseguindo o ponteiro com atraso. */
function initOrbs({ on, add }) {
  const orbs = [...document.querySelectorAll('[data-orb]')];
  if (!orbs.length) return;

  const alvo = { x: 0, y: 0 };
  const atual = { x: 0, y: 0 };
  let frame = 0;

  const passo = () => {
    atual.x += (alvo.x - atual.x) * SUAVIZACAO;
    atual.y += (alvo.y - atual.y) * SUAVIZACAO;
    orbs.forEach((orb, i) => {
      const fator = i === 0 ? 1 : CONTRA_ORB;
      orb.style.translate = `${atual.x * AMPLITUDE_X * fator}px ${atual.y * AMPLITUDE_Y * fator}px`;
    });
    frame = requestAnimationFrame(passo);
  };

  on(
    window,
    'pointermove',
    (e) => {
      alvo.x = (e.clientX / window.innerWidth) * 2 - 1;
      alvo.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  frame = requestAnimationFrame(passo);
  add(() => cancelAnimationFrame(frame));
}

/** Botões [data-magnetic] inclinam na direção do ponteiro. */
function initMagnetico({ on, add }) {
  for (const el of document.querySelectorAll('[data-magnetic]')) {
    on(el, 'pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${(dx * IMA_X).toFixed(2)}px,${(dy * IMA_Y).toFixed(2)}px) scale(${IMA_ESCALA})`;
    });
    on(el, 'pointerleave', () => {
      el.style.transform = '';
    });
    add(() => {
      el.style.transform = '';
    });
  }
}

export function initPointerEffects(scope) {
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // any-pointer e não pointer: a segunda descreve só a entrada primária, que
  // num notebook com touchscreen é o toque. O mouse ligado ao lado ficava sem
  // paralaxe nem ímã por causa disso.
  const ponteiroFino = window.matchMedia('(any-pointer: fine)').matches;
  if (movimentoReduzido || !ponteiroFino) return;

  initOrbs(scope);
  initMagnetico(scope);
}
