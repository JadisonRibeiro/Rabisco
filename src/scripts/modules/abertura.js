/**
 * Abertura.
 *
 * A animação inteira é CSS e se retira sozinha — ver components/abertura.css.
 * Este módulo cuida apenas do que o CSS não alcança:
 *
 *  · deixar o visitante pular — clique, tecla, roda ou arrasto —, depois de
 *    uma carência curta que separa pressa de gesto reflexo;
 *  · devolver a rolagem, travada durante a cortina para que um arrasto
 *    impaciente não role a página por trás dela e o site apareça já no meio.
 *
 * A cortina roda em toda visita, e não uma vez por aba. Foi decisão de quem
 * assina o site: quatro segundos são curtos o bastante para a marca valer a
 * repetição. O `sessionStorage` que guardava o "já vista" saiu junto — sem
 * ninguém para ler a chave, guardá-la seria só lixo em disco.
 *
 * Nada aqui é necessário para o site funcionar. Se este arquivo não carregar,
 * a cortina roda os 4s e sai; só o pular e a trava de rolagem se perdem.
 */

export function initAbertura({ on, add }) {
  const cortina = document.querySelector('.abertura');
  if (!cortina) return;

  const raiz = document.documentElement;

  /*
   * Aqui havia uma saída antecipada para prefers-reduced-motion, par do
   * `display: none` que o CSS aplicava. A cortina passou a rodar para todo
   * mundo por decisão de quem assina o site — ver o comentário longo em
   * abertura.css, que explica o custo.
   *
   * A saída precisou sair junto, e não por simetria: sem ela a cortina
   * apareceria para quem pediu menos movimento e ninguém estaria escutando o
   * clique, a tecla ou o arrasto. Seria a única pessoa da página obrigada a
   * assistir aos 4s inteiros, sem escapatória — exatamente ao contrário do que
   * a preferência dela pedia.
   */
  const anterior = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  /*
   * O atributo continua existindo, mas agora só vale para esta carga: ele é o
   * que faz o CSS retirar a cortina do caminho do toque e zerar o atraso de
   * entrada do hero quando alguém pula. Nada dele sobrevive ao recarregamento.
   */
  let encerrada = false;
  const encerrar = () => {
    if (encerrada) return;
    encerrada = true;
    document.body.style.overflow = anterior;
    raiz.dataset.abertura = 'vista';
  };

  /*
   * O fim natural vem do animationend da própria cortina, e não de um
   * setTimeout com o mesmo número escrito de novo: a duração mora no CSS e
   * duplicá-la aqui garante que um dia os dois discordem.
   *
   * O filtro de target existe porque as animações dos traços lá dentro sobem
   * por borbulhamento e encerrariam a cortina no primeiro rabisco pronto.
   */
  on(cortina, 'animationend', (e) => {
    if (e.target === cortina) encerrar();
  });

  /*
   * Pular. Quem está apressado toca a tela e entra — mas só depois de uma
   * carência, e ela é o conserto de um defeito medido.
   *
   * Sem carência o desktop perdia a abertura por acidente. Clicar na janela
   * do navegador para lhe dar foco, ou apertar uma seta para rolar, são
   * gestos reflexos no primeiro segundo de uma página e não querem dizer
   * "pule" — mas a cortina cobre a tela inteira, então qualquer clique cai
   * nela, e o keydown não filtrava tecla nenhuma. Um clique aos 700ms matava
   * os 4s inteiros e o visitante caía direto no site.
   *
   * O viés para o desktop é o que fazia os dois parecerem sites diferentes:
   * tocar a tela durante a carga é bem menos automático do que clicar para
   * focar uma janela ou teclar para rolar.
   *
   * 900ms fica depois do gesto reflexo e bem antes de a impaciência ser real
   * — a essa altura o traço do "R" mal começou.
   */
  let podePular = false;
  const armar = setTimeout(() => {
    podePular = true;
  }, 900);
  add(() => clearTimeout(armar));

  const pular = () => {
    if (podePular) encerrar();
  };

  on(cortina, 'pointerdown', pular);
  on(window, 'keydown', pular);

  /*
   * Rolar também encerra — e também espera a carência.
   *
   * A rolagem entrou aqui porque a trava a engolia: o visitante empurrava, a
   * página não respondia, e quatro segundos sem resposta ao dedo leem como site
   * travado, não como cinema.
   *
   * Só que este par chegou ligado direto no `encerrar`, sem carência, com o
   * argumento de que rolar nunca é reflexo. No toque isso é verdade — arrastar
   * o dedo é deliberado. No mouse é o contrário: encostar na roda enquanto uma
   * página carrega é dos gestos mais automáticos que existem, e o `wheel`
   * dispara com delta de 1px. Medido: um tique aos 300ms matava a abertura
   * inteira. O monitor deixou de ver a cortina quase sempre, enquanto o celular
   * continuava vendo — a mesma animação, com uma porta de saída a mais.
   *
   * Passando por `pular`, os quatro gestos seguem a mesma regra: nos primeiros
   * 900ms nada encerra, depois disso qualquer um encerra. Quem quer o conteúdo
   * continua chegando nele; quem só esbarrou no mouse não perde mais a peça.
   *
   * `wheel` e `touchmove` porque o evento `scroll` nunca chega: o body está com
   * overflow hidden, então não há rolagem a observar. Estes dois disparam mesmo
   * com a rolagem travada, que é exatamente o caso.
   */
  on(window, 'wheel', pular, { passive: true });
  on(window, 'touchmove', pular, { passive: true });

  /*
   * Rede de segurança. Se o animationend não vier — aba em segundo plano no
   * momento certo, animação interrompida por um reflow —, a página não pode
   * ficar com a rolagem travada para sempre. Folga generosa sobre os 4,00s.
   */
  const resgate = setTimeout(encerrar, 6000);
  add(() => clearTimeout(resgate));
}
