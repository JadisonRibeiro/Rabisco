/**
 * Abertura.
 *
 * A animação inteira é CSS e se retira sozinha — ver components/abertura.css.
 * Este módulo cuida apenas do que o CSS não alcança:
 *
 *  · marcar a sessão, para a cortina não voltar a cada recarregamento;
 *  · deixar o visitante pular, tocando ou apertando qualquer tecla;
 *  · devolver a rolagem, travada durante a cortina para que um arrasto
 *    impaciente não role a página por trás dela e o site apareça já no meio.
 *
 * Nada aqui é necessário para o site funcionar. Se este arquivo não carregar,
 * a cortina roda os 3,3s e sai; só o "uma vez por sessão" se perde.
 */

const CHAVE = 'rabisco:abertura';

export function initAbertura({ on, add }) {
  const cortina = document.querySelector('.abertura');
  if (!cortina) return;

  const raiz = document.documentElement;

  const marcar = () => {
    try {
      sessionStorage.setItem(CHAVE, '1');
    } catch {
      // Sem armazenamento a abertura repete. Não é motivo para quebrar nada.
    }
  };

  // Já vista nesta aba, ou movimento reduzido: o CSS não a exibe, e não há
  // rolagem a travar nem nada a pular.
  const jaVista = raiz.dataset.abertura === 'vista';
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (jaVista || semMovimento) {
    marcar();
    return;
  }

  const anterior = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  let encerrada = false;
  const encerrar = () => {
    if (encerrada) return;
    encerrada = true;
    document.body.style.overflow = anterior;
    raiz.dataset.abertura = 'vista';
    marcar();
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

  // Pular. Quem já viu o site não deve ter que ver a abertura de novo por
  // três segundos — e alguém apressado tocando a tela é exatamente esse caso.
  on(cortina, 'pointerdown', encerrar);
  on(window, 'keydown', encerrar);

  /*
   * Rede de segurança. Se o animationend não vier — aba em segundo plano no
   * momento certo, animação interrompida por um reflow —, a página não pode
   * ficar com a rolagem travada para sempre. Folga generosa sobre os 3,34s.
   */
  const resgate = setTimeout(encerrar, 5000);
  add(() => clearTimeout(resgate));
}
