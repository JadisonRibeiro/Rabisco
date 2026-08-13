/**
 * Trilhos horizontais com encaixe.
 *
 * A rolagem em si é do navegador: o CSS declara `overflow-x: auto` e
 * `scroll-snap-type`, e o dedo faz o resto com a inércia e a borracha de ponta
 * do próprio sistema. Este módulo não move nada por conta própria — ele lê
 * onde o trilho parou e mantém três coisas em dia: as setas, a barra de
 * avanço e qual item está em foco.
 *
 * Por isso o carrossel continua funcionando com o JS desligado ou ainda não
 * carregado. O que se perde são os atalhos, não o conteúdo.
 */

const MOBILE = '(max-width: 900px)';

/** Índice do item cuja borda esquerda está mais perto do início visível. */
function itemAtual(itens, trilho) {
  const inicio = trilho.scrollLeft;
  let melhor = 0;
  let menorDistancia = Infinity;

  itens.forEach((item, i) => {
    const distancia = Math.abs(item.offsetLeft - trilho.offsetLeft - inicio);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = i;
    }
  });

  return melhor;
}

function montar(raiz, { on, add }) {
  const trilho = raiz.querySelector('[data-trilho]');
  if (!trilho) return;

  const itens = [...trilho.children];
  const controles = raiz.querySelector('[data-carrossel-controles]');
  const anterior = raiz.querySelector('[data-anterior]');
  const proximo = raiz.querySelector('[data-proximo]');
  const progresso = raiz.querySelector('[data-progresso]');
  if (!itens.length) return;

  // Nascem escondidos no HTML: só existem se houver quem os opere.
  if (controles) controles.hidden = false;

  /** Passo entre dois itens, medido — o gap é token e muda com a viewport. */
  const passo = () => {
    if (itens.length < 2) return itens[0].offsetWidth;
    return itens[1].offsetLeft - itens[0].offsetLeft;
  };

  /**
   * Avança quase uma tela, mas em número inteiro de itens: parar no meio de
   * um card desalinha o encaixe e o trilho corrige sozinho depois, o que lê
   * como se o botão tivesse errado o alvo. O item que fica é intencional —
   * mantém uma âncora do que o usuário acabou de ver.
   */
  const salto = () => {
    const p = passo();
    if (!p) return trilho.clientWidth;
    return Math.max(1, Math.round(trilho.clientWidth / p) - 1) * p;
  };

  let pendente = false;
  const sincronizar = () => {
    pendente = false;

    const max = trilho.scrollWidth - trilho.clientWidth;
    const pos = trilho.scrollLeft;

    // 1px de folga: o scrollLeft de um trilho encaixado costuma parar em
    // frações, e comparar com o extremo exato deixaria a seta acesa no fim.
    if (anterior) anterior.disabled = pos <= 1;
    if (proximo) proximo.disabled = pos >= max - 1;

    if (progresso && trilho.scrollWidth > 0) {
      const fatia = (trilho.clientWidth / trilho.scrollWidth) * 100;
      // Em porcentagem da própria largura da barra — ver o cálculo no CSS.
      const avanco = trilho.clientWidth ? (pos / trilho.clientWidth) * 100 : 0;
      progresso.style.setProperty('--carrossel-fatia', `${fatia}%`);
      progresso.style.setProperty('--carrossel-avanco', `${avanco}%`);
    }

    const atual = itemAtual(itens, trilho);
    itens.forEach((item, i) => {
      item.toggleAttribute('data-atual', i === atual);
    });
  };

  // A rolagem dispara dezenas de vezes por gesto; um quadro por vez basta e
  // mantém o trabalho fora do caminho do dedo.
  const agendar = () => {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(sincronizar);
  };

  on(trilho, 'scroll', agendar, { passive: true });

  const mover = (direcao) => {
    trilho.scrollBy({
      left: direcao * salto(),
      // A preferência de movimento reduzido é do sistema e o CSS já zera o
      // scroll-behavior do trilho; aqui o 'smooth' respeita esse zeramento.
      behavior: 'smooth',
    });
  };

  if (anterior) on(anterior, 'click', () => mover(-1));
  if (proximo) on(proximo, 'click', () => mover(1));

  const mq = window.matchMedia(MOBILE);

  // Fora do mobile o trilho volta a ser grade: sem largura rolável, os valores
  // medidos não querem dizer nada e os itens não devem carregar estado.
  const avaliar = () => {
    if (mq.matches) {
      sincronizar();
    } else {
      for (const item of itens) item.removeAttribute('data-atual');
    }
  };

  on(mq, 'change', avaliar);
  on(window, 'resize', agendar, { passive: true });

  // As fotos entram depois e mudam a largura do trilho; sem reavaliar, a barra
  // de avanço nasceria com a proporção errada e ficaria assim.
  const ro = new ResizeObserver(agendar);
  ro.observe(trilho);
  add(() => ro.disconnect());

  avaliar();
}

export function initCarrossel(scope) {
  for (const raiz of document.querySelectorAll('[data-carrossel]')) {
    montar(raiz, scope);
  }
}
