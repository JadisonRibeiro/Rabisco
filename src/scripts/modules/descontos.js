/**
 * Escada de descontos.
 *
 * Este módulo escreve três números na seção e sai: onde a fita do carrossel
 * está, o degrau atual e o avanço contínuo da rolagem. Todo o resto — a fita
 * andando, o realce mudando de cartão, a escada acendendo, o halo
 * esquentando, a explosão — é CSS reagindo a esses três.
 *
 * O avanço é MEDIDO na própria trilha, não inferido da janela: uma leitura de
 * `getBoundingClientRect` por quadro diz quanto dela já passou da linha em que
 * o palco gruda. Trilha, palco e linha são as mesmas três medidas que o CSS
 * usa para desenhar a seção, lidas de lá — não há o que sair de sincronia.
 *
 * A versão anterior perguntava o degrau a um IntersectionObserver com a raiz
 * espremida a uma linha, e calculava essa linha a partir de
 * `window.innerHeight`. Era o que tremia no celular: a geometria da seção é
 * svh e não se mexe, mas `innerHeight` encolhe e cresce enquanto a barra de
 * endereço entra e sai durante a rolagem. A linha de leitura escorregava sobre
 * uma página parada, e o observador ainda era refeito a cada `resize` — que o
 * celular dispara sem parar por causa da mesma barra. O mesmo ponto da página
 * valia degraus diferentes conforme a barra, e o número de 160px piscava para
 * frente e para trás. Medido na trilha, o avanço não tem como saber que a
 * barra existe.
 *
 * Sem JS a seção não fica quebrada: o HTML nasce com o último degrau, e o que
 * se perde é a descoberta, não a informação.
 */

const PASSOS = 5;

/*
 * Grão do avanço contínuo escrito no CSS. Cinquenta paradas ao longo da
 * seção: fino demais para o olho ver degrau no halo, e grosso o bastante para
 * o estilo não ser reavaliado a cada pixel de rolagem.
 */
const GRAO = 0.02;

/*
 * Quanto de cada faixa a fita passa ANDANDO. O resto ela passa parada, com o
 * cartão no meio da janela.
 *
 * Uma fita puramente linear é ilegível: o número fica entre dois valores a
 * maior parte do tempo e não há nada para ler. Um terço de deslize e dois de
 * repouso dá o compasso de carrossel — cada desconto pousa, é lido, e só então
 * o próximo entra.
 */
const DESLIZE = 0.34;

/* Aceleração e freio do deslize, sem depender de nenhuma curva do CSS: a fita
   é posicionada a cada quadro, então a suavidade tem de estar na conta. */
const suavizar = (t) => t * t * (3 - 2 * t);

export function initDescontos({ on, add }) {
  const secao = document.querySelector('[data-descontos]');
  if (!secao) return;

  const trilha = secao.querySelector('[data-descontos-trilha]');
  const palco = secao.querySelector('[data-descontos-palco]');
  if (!trilha || !palco) return;

  /*
   * As duas medidas que não dependem da rolagem: onde o palco gruda — o mesmo
   * `top` que o CSS declara, lido de lá — e quanto ele ocupa. Guardadas, para
   * que o quadro precise ler só a caixa da trilha.
   */
  let linha = 0;
  let alturaPalco = 0;

  const medir = () => {
    linha = parseFloat(getComputedStyle(palco).top) || 0;
    alturaPalco = palco.offsetHeight;
  };

  let quadro = 0;
  let passoEscrito = 0;
  let avancoEscrito = -1;
  let posicaoEscrita = '';

  const aplicar = () => {
    quadro = 0;

    const caixa = trilha.getBoundingClientRect();

    /*
     * O curso é o tanto de rolagem que acontece com o palco preso: a trilha
     * inteira menos a parte dela ocupada pelo próprio palco. Por construção,
     * são exatamente os cinco degraus.
     *
     * Com movimento reduzido o CSS desmonta a trilha e solta o palco; os dois
     * passam a ter a mesma altura e o curso zera. A seção fica no estado final
     * que o CSS impõe e este módulo não escreve nada — inclusive se a
     * preferência mudar com a sessão aberta, porque a conta é refeita a cada
     * quadro e não há estado a desfazer.
     */
    const curso = caixa.height - alturaPalco;
    if (curso < 1) return;

    const avanco = Math.min(1, Math.max(0, (linha - caixa.top) / curso));

    /*
     * Onde a fita está, em cartões: 0 no 10% e 4 no 50%.
     *
     * O curso é cortado em cinco faixas iguais. Dentro de cada uma a fita
     * espera os dois primeiros terços e desliza no último, então o número fica
     * parado e legível a maior parte do caminho e a troca acontece de uma vez.
     * A última faixa não tem para onde deslizar — é o 50% já em cena, e o
     * `min` a segura ali enquanto os fogos acontecem.
     */
    const escala = avanco * PASSOS;
    const cartao = Math.min(PASSOS - 1, Math.floor(escala));
    const dentro = escala - cartao;
    const deslize = dentro <= 1 - DESLIZE ? 0 : (dentro - (1 - DESLIZE)) / DESLIZE;
    const posicao = Math.min(PASSOS - 1, cartao + suavizar(deslize));

    /*
     * O degrau é o cartão mais perto do meio da janela, e não a faixa da
     * rolagem: assim o realce, a escada e o clímax trocam quando o número novo
     * CHEGA ao centro, na metade do deslize, e não quando ele começa a andar
     * lá da borda.
     */
    const passo = Math.round(posicao) + 1;

    /*
     * Só escreve o que mudou. Reescrever o mesmo valor não repintaria nada,
     * mas invalida estilo à toa — e isto roda a cada quadro de rolagem da
     * página inteira, não só desta seção.
     */
    if (passo !== passoEscrito) {
      passoEscrito = passo;
      secao.dataset.passo = String(passo);
    }

    const graduado = Math.round(avanco / GRAO) * GRAO;
    if (graduado !== avancoEscrito) {
      avancoEscrito = graduado;
      secao.style.setProperty('--avanco', graduado.toFixed(2));
    }

    /*
     * A fita, ao contrário do halo, precisa do valor cheio: ela anda uma
     * janela inteira por cartão, e arredondar aqui viraria degrau visível no
     * meio do deslize. Três casas bastam para o passo ficar abaixo do pixel em
     * qualquer tela.
     */
    const casas = posicao.toFixed(3);
    if (casas !== posicaoEscrita) {
      posicaoEscrita = casas;
      secao.style.setProperty('--carrossel', casas);
    }
  };

  /*
   * Um quadro por vez. O `scroll` do celular chega muitas vezes entre dois
   * quadros, e ler a caixa em todas elas seria pedir layout no meio do gesto —
   * que é o que faz o dedo travar em aparelho fraco.
   */
  const agendar = () => {
    if (!quadro) quadro = requestAnimationFrame(aplicar);
  };

  medir();
  aplicar();

  on(window, 'scroll', agendar, { passive: true });
  add(() => cancelAnimationFrame(quadro));

  /*
   * Girar o aparelho ou mudar o zoom muda as duas medidas guardadas. A barra
   * de endereço do celular também dispara `resize` — e aí medir de novo custa
   * duas leituras e devolve os mesmos dois números, porque ambos são svh. O
   * avanço continua vindo da trilha, e é por isso que a barra deixou de mexer
   * no degrau.
   */
  on(
    window,
    'resize',
    () => {
      medir();
      agendar();
    },
    { passive: true },
  );
}
