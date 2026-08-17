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

/*
 * Abaixo deste resto a interpolação já não move pixel nenhum: a amplitude maior
 * é 46px, então 0,0005 de diferença vale 0,02px. Continuar iterando a partir
 * daqui é gastar um quadro para escrever o mesmo valor.
 */
const REPOUSO = 0.0005;

/**
 * Orbs do hero perseguindo o ponteiro com atraso.
 *
 * O laço não é permanente. Antes ele chamava requestAnimationFrame para sempre,
 * mesmo com o ponteiro parado e mesmo com o hero fora da tela — e cada quadro
 * escrevia `style.translate` em duas camadas de 720px com desfoque, que é das
 * coisas mais caras que a página faz. Agora ele roda enquanto há distância a
 * percorrer, dorme ao alcançar o alvo, e acorda no próximo movimento.
 */
function initOrbs({ on, add }) {
  const orbs = [...document.querySelectorAll('[data-orb]')];
  if (!orbs.length) return;

  const alvo = { x: 0, y: 0 };
  const atual = { x: 0, y: 0 };
  let frame = 0;
  // O hero começa na tela; se não houver observer, fica valendo sempre.
  let visivel = true;

  const pintar = () => {
    orbs.forEach((orb, i) => {
      const fator = i === 0 ? 1 : CONTRA_ORB;
      orb.style.translate = `${atual.x * AMPLITUDE_X * fator}px ${atual.y * AMPLITUDE_Y * fator}px`;
    });
  };

  const passo = () => {
    const dx = alvo.x - atual.x;
    const dy = alvo.y - atual.y;

    // Chegou: encosta no alvo, pinta o quadro final uma vez e solta o laço.
    if (Math.abs(dx) < REPOUSO && Math.abs(dy) < REPOUSO) {
      atual.x = alvo.x;
      atual.y = alvo.y;
      pintar();
      frame = 0;
      return;
    }

    atual.x += dx * SUAVIZACAO;
    atual.y += dy * SUAVIZACAO;
    pintar();
    frame = requestAnimationFrame(passo);
  };

  const acordar = () => {
    if (!frame && visivel) frame = requestAnimationFrame(passo);
  };

  on(
    window,
    'pointermove',
    (e) => {
      alvo.x = (e.clientX / window.innerWidth) * 2 - 1;
      alvo.y = (e.clientY / window.innerHeight) * 2 - 1;
      acordar();
    },
    { passive: true },
  );

  /*
   * Fora da tela o laço nem chega a acordar: um paralaxe que ninguém vê não
   * vale um quadro. Ao voltar, o orb reencontra o ponteiro suavemente, porque
   * `alvo` continuou sendo atualizado pelo listener.
   */
  if ('IntersectionObserver' in window) {
    const hero = orbs[0].closest('section');
    if (hero) {
      const observer = new IntersectionObserver(
        ([entrada]) => {
          visivel = entrada.isIntersecting;
          if (visivel) acordar();
          else if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        },
        { rootMargin: '10% 0px 10% 0px' },
      );
      observer.observe(hero);
      add(() => observer.disconnect());
    }
  }

  add(() => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });
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
