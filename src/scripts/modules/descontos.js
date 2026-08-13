/**
 * Escada de descontos.
 *
 * O degrau atual é um atributo no elemento da seção; todo o resto — a troca
 * do número, a escada acendendo, a explosão — é CSS reagindo a ele. Este
 * módulo só responde a uma pergunta: qual dos cinco degraus está passando
 * pelo meio da tela agora.
 *
 * A resposta vem de um IntersectionObserver com a raiz espremida a uma linha.
 * As sentinelas ladrilham a trilha sem sobra nem sobreposição, então
 * exatamente uma cruza essa linha a cada instante: não há empate a
 * desempatar, nem posição a recalcular, nem listener de rolagem — que é o que
 * faria o dedo travar num aparelho fraco.
 *
 * A linha fica na altura em que o palco gruda, e não no meio da tela. É a
 * diferença entre a escada acompanhar a peça parada ou correr enquanto ela
 * ainda desliza: medida pelo centro, os primeiros degraus queimavam durante a
 * aproximação e o 50% chegava depois de a seção já ter se soltado.
 *
 * Sem JS a seção não fica quebrada: o HTML nasce com o último degrau, e o que
 * se perde é a descoberta, não a informação.
 */

const PRIMEIRO = '1';

export function initDescontos({ on, add }) {
  const secao = document.querySelector('[data-descontos]');
  if (!secao) return;

  const marcos = [...secao.querySelectorAll('[data-marco]')];
  if (!marcos.length) return;

  /*
   * Quem pediu menos movimento recebe a seção inteira de uma vez, com o 50%
   * já na tela — o CSS desmonta a trilha e o palco preso. Observar aqui só
   * criaria trabalho para trocar um número que ninguém veria mudar.
   */
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (semMovimento.matches) return;

  /*
   * O HTML vem no último degrau para o caso de o JS não chegar. Com ele
   * presente, a seção volta ao começo: senão o visitante veria o 50% já
   * gasto na aproximação e a escada não teria para onde subir.
   */
  secao.dataset.passo = PRIMEIRO;

  const aoCruzar = (entradas) => {
    for (const entrada of entradas) {
      if (entrada.isIntersecting) {
        secao.dataset.passo = entrada.target.dataset.marco;
      }
    }
  };

  let observador = null;

  /*
   * A linha de leitura mora onde o palco gruda — o mesmo --nav-h que o CSS
   * usa no `top` do sticky, lido de lá para os dois nunca discordarem.
   *
   * rootMargin encolhe a raiz pelos quatro lados: tirando --nav-h do topo e
   * todo o resto de baixo, sobra 1px de altura na altura exata da fixação.
   */
  const montar = () => {
    observador?.disconnect();

    const navH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    const base = Math.max(0, window.innerHeight - navH - 1);

    observador = new IntersectionObserver(aoCruzar, {
      rootMargin: `-${navH}px 0px -${base}px 0px`,
      threshold: 0,
    });

    for (const marco of marcos) observador.observe(marco);
  };

  montar();
  add(() => observador?.disconnect());

  /*
   * rootMargin é fixado na criação: girar o aparelho ou abrir a barra de
   * endereço muda innerHeight e a linha ficaria no lugar errado pelo resto da
   * sessão. Refazer o observador é barato — cinco elementos — e um quadro de
   * espera evita refazê-lo a cada pixel durante o arrasto da barra.
   */
  let agendado = 0;
  on(
    window,
    'resize',
    () => {
      cancelAnimationFrame(agendado);
      agendado = requestAnimationFrame(montar);
    },
    { passive: true },
  );
  add(() => cancelAnimationFrame(agendado));

  /*
   * A preferência pode mudar com a sessão aberta (o visitante liga "reduzir
   * movimento" no sistema). Aí a trilha deixa de existir por CSS e as
   * sentinelas somem: manter o observador apontado para elementos sem caixa
   * deixaria o degrau congelado onde estava, sobrescrevendo o estado final
   * que o CSS acabou de impor.
   */
  on(semMovimento, 'change', (e) => {
    if (e.matches) observador?.disconnect();
  });
}
