/**
 * Escada de descontos.
 *
 * Este módulo escreve quatro números na seção e sai: as duas rodas do
 * odômetro, o degrau atual e o avanço contínuo da rolagem. Todo o resto — as
 * rodas girando, a escada acendendo, o halo esquentando, a explosão — é CSS
 * reagindo a esses quatro.
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
 * Sem JS a seção não fica quebrada: as reservas do CSS deixam as rodas em 5 e
 * 0, e o que se perde é a descoberta, não a informação.
 */

/* A faixa que o número percorre. O odômetro vai de 10 a 50, então são 40 de
   curso — e é este par que define tudo o mais, inclusive quantos degraus a
   escada tem. */
const INICIO = 10;
const FIM = 50;
const PASSOS = 5;

/*
 * Grão do avanço contínuo escrito no CSS. Cinquenta paradas ao longo da
 * seção: fino demais para o olho ver degrau no halo, e grosso o bastante para
 * o estilo não ser reavaliado a cada pixel de rolagem.
 */
const GRAO = 0.02;

/*
 * Quanto de cada UNIDADE a roda passa pousada, antes de girar para a próxima.
 *
 * A fita que existia antes tinha um repouso parecido, mas por DEZENA: ela
 * andava no último terço de cada faixa e ficava parada nos outros dois. Como só
 * havia cinco faixas em toda a seção, o resultado eram cinco saltos com nada
 * entre eles — a troca seca que esta reescrita veio desfazer.
 *
 * Aqui o mesmo compasso vale por unidade, e são quarenta delas: cerca de 41px
 * de rolagem cada, num monitor. O olho não tem como ler quarenta pousos como
 * uma escada — lê como um contador mecânico preciso, que é o efeito.
 *
 * O repouso não é enfeite, é legibilidade. Sem ele o mapa fica puramente linear
 * e, ao parar a rolagem, metade das posições cai no meio de um giro: o número
 * mostra meio dígito sobre meio dígito. Um odômetro de carro pode fazer isso; um
 * "50% OFF" de vitrine, não. Com 0,55 de repouso, parar quase sempre pousa num
 * número inteiro e legível, e os 0,45 restantes entregam a virada.
 *
 * O que NÃO muda com isso: a peça continua amarrada 1:1 à posição da rolagem,
 * sem inércia e sem animação correndo por conta própria. Subir a página desfaz
 * o giro pelo mesmo caminho, na mesma velocidade.
 */
const REPOUSO = 0.55;

/* Aceleração e freio do giro, sem depender de nenhuma curva do CSS: as rodas
   são posicionadas a cada quadro, então a suavidade tem de estar na conta. */
const suavizar = (t) => t * t * (3 - 2 * t);

export function initDescontos({ on, add }) {
  const secao = document.querySelector('[data-descontos]');
  if (!secao) return;

  const trilha = secao.querySelector('[data-descontos-trilha]');
  const palco = secao.querySelector('[data-descontos-palco]');
  if (!trilha || !palco) return;

  /*
   * As medidas que não dependem da rolagem: onde o palco gruda — o mesmo `top`
   * que o CSS declara, lido de lá —, quanto ele ocupa, e que fatia do curso é
   * de contagem. Guardadas, para que o quadro precise ler só a caixa da trilha.
   */
  let linha = 0;
  let alturaPalco = 0;
  let util = 1;

  const medir = () => {
    linha = parseFloat(getComputedStyle(palco).top) || 0;
    alturaPalco = palco.offsetHeight;

    /*
     * A fatia do curso em que o número ainda está subindo.
     *
     * O CSS monta a trilha com `passos + remate` degraus de altura: os cinco
     * primeiros contam de 10 a 50, o último segura o 50 em cena antes de a peça
     * soltar. Aqui os dois números vêm DE LÁ, e não repetidos como constante —
     * são propriedades sem unidade, então o valor computado é o próprio número.
     *
     * É o mesmo princípio que já governava `linha` e `alturaPalco`: quem
     * desenha a seção é o CSS, e este módulo só lê. Alguém que decida segurar o
     * 50% por dois passos mexe num lugar e as duas pontas acompanham.
     */
    const estilo = getComputedStyle(secao);
    const passos = parseFloat(estilo.getPropertyValue('--passos')) || PASSOS;
    const remate = parseFloat(estilo.getPropertyValue('--remate')) || 0;
    util = passos / (passos + remate);
  };

  let quadro = 0;
  let passoEscrito = 0;
  let avancoEscrito = -1;
  let dezenaEscrita = '';
  let unidadeEscrita = '';

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

    /*
     * O avanço da CONTAGEM, e não o da seção: dividir por `util` faz o número
     * chegar a 1 ao fim dos cinco degraus, e o `min` o segura ali durante o
     * remate — que é rolagem real, com o palco ainda preso, mostrando 50%.
     *
     * O halo usa este mesmo valor de propósito: ele fecha no máximo junto com o
     * número e fica aceso durante a espera, em vez de continuar esquentando
     * depois que já não há o que contar.
     */
    const avanco = Math.min(1, Math.max(0, (linha - caixa.top) / curso / util));

    /* O valor cru, linear: 10,000 na entrada e 50,000 no fim. */
    const cru = INICIO + avanco * (FIM - INICIO);

    /*
     * O mesmo valor, com o compasso de pouso e giro aplicado por unidade. A
     * curva é aplicada UMA vez, aqui, e tudo o que vem depois — as duas rodas e
     * o degrau — deriva deste número: assim a dezena não tem como sair de
     * sincronia com a unidade, que seria o defeito clássico de suavizar cada
     * roda por conta própria.
     */
    const inteiro = Math.floor(cru);
    const fracao = cru - inteiro;
    const giro = fracao <= REPOUSO ? 0 : (fracao - REPOUSO) / (1 - REPOUSO);
    const valor = Math.min(FIM, inteiro + suavizar(giro));

    /*
     * A dezena corrente e o quanto já se andou dentro dela.
     *
     * `base` vai de 1 a 5 e `dentro` de 0 a quase 10. No exato 50 os dois
     * pousam em 5 e 0, que é o estado final — e é o mesmo par que as reservas
     * do CSS entregam quando não há JS.
     */
    const base = Math.floor(valor / 10);
    const dentro = valor - base * 10;

    /*
     * A roda das unidades gira a casa inteira: 0 a 9, e a décima primeira casa
     * da tira é outro 0.
     *
     * É esse 0 repetido que faz a virada funcionar. Sem ele, ao sair do 19 a
     * roda teria de voltar do 9 até o 0 percorrendo os dez dígitos ao
     * contrário — um rebobinado visível bem no momento em que a dezena troca.
     * Com ele, `dentro` chega a 9,99 sobre o último 0 e recomeça no 0 do topo,
     * que é o mesmo desenho: a emenda não existe para o olho.
     */
    const unidade = dentro;

    /*
     * A dezena não acompanha o valor — ela vira SÓ enquanto a unidade
     * atravessa o 9.
     *
     * Amarrá-la a `valor / 10` faria a roda da esquerda deslizar o tempo todo,
     * e um contador cuja dezena nunca pousa não lê como contador: lê como duas
     * listas escorregando. `max(0, dentro - 9)` a deixa parada em nove décimos
     * do percurso e entrega a virada inteira no décimo restante, encaixada
     * exatamente na passagem do 9 para o 0 ao lado. É o que a engrenagem de um
     * odômetro mecânico faz, e o motivo de ele parecer preciso.
     */
    const dezena = base - 1 + Math.max(0, dentro - 9);

    /*
     * O degrau é a dezena inteira já alcançada: 1 no 10%, 5 quando o 50 fecha.
     * Continua sendo ele quem acende a escada, esquenta o halo e dispara a
     * explosão — nada disso mudou de contrato ao trocar a fita pelas rodas.
     */
    const passo = Math.min(PASSOS, Math.max(1, base));

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
     * As rodas, ao contrário do halo, precisam do valor cheio: elas andam uma
     * casa inteira por dígito, e arredondar aqui viraria degrau visível no meio
     * do giro. Três casas bastam para o passo ficar abaixo do pixel em qualquer
     * tela.
     */
    const d = dezena.toFixed(3);
    if (d !== dezenaEscrita) {
      dezenaEscrita = d;
      secao.style.setProperty('--dezena', d);
    }

    const u = unidade.toFixed(3);
    if (u !== unidadeEscrita) {
      unidadeEscrita = u;
      secao.style.setProperty('--unidade', u);
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
