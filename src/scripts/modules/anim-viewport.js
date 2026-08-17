/**
 * Ociosidade por viewport.
 *
 * A página tem 23 animações `infinite` rodando ao mesmo tempo, e nenhuma delas
 * parava ao sair da tela: os rabiscos do hero continuavam repintando enquanto o
 * visitante lia o rodapé, e os dois orbs de 720px com `blur(30px)` continuavam
 * sendo compostos a cada quadro. Num celular intermediário isso aparece como
 * rolagem que engasga e bateria drenando — e competia por orçamento de quadro
 * justamente com a seção de descontos, que já lê `getBoundingClientRect` por
 * quadro.
 *
 * Aqui a correção é um observer só, sobre as seções, alternando `data-ocioso`.
 * Quem pausa de fato é o CSS (animations.css) — este módulo não sabe o nome de
 * nenhuma animação, então uma animação em laço criada amanhã entra no regime
 * sem tocar neste arquivo.
 *
 * A margem de 20% faz a seção "acordar" antes de encostar na borda: retomar uma
 * animação exatamente no pixel em que ela aparece deixaria o primeiro quadro
 * visível parado.
 *
 * Se o IntersectionObserver não existir, nada acontece e tudo roda como antes —
 * é otimização, não requisito.
 */

const MARGEM = '20% 0px 20% 0px';

export function initAnimViewport({ add }) {
  if (!('IntersectionObserver' in window)) return;

  const secoes = document.querySelectorAll('main > section');
  if (!secoes.length) return;

  const observer = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        entrada.target.toggleAttribute('data-ocioso', !entrada.isIntersecting);
      }
    },
    { rootMargin: MARGEM },
  );

  for (const secao of secoes) observer.observe(secao);

  add(() => {
    observer.disconnect();
    for (const secao of secoes) secao.removeAttribute('data-ocioso');
  });
}
