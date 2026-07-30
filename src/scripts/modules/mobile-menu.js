/**
 * Menu mobile em tela cheia.
 *
 * O estado mora num atributo do <html> porque o CSS do menu e a animação do
 * burger são selecionados a partir dele. Além do que o export fazia, aqui o
 * foco é preso no painel enquanto ele está aberto e devolvido ao botão no
 * fechamento — sem isso a tabulação escapa para a página atrás.
 */

const FOCAVEIS = 'a[href], button:not([disabled])';

export function initMobileMenu({ on, add }) {
  const burger = document.querySelector('[data-burger]');
  const painel = document.querySelector('[data-mobilemenu]');
  if (!burger || !painel) return;

  const raiz = document.documentElement;
  const estaAberto = () => raiz.hasAttribute('data-menu-open');

  const definir = (aberto) => {
    raiz.toggleAttribute('data-menu-open', aberto);
    burger.setAttribute('aria-expanded', String(aberto));
    burger.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    painel.setAttribute('aria-hidden', String(!aberto));
    document.body.style.overflow = aberto ? 'hidden' : '';
    if (aberto) painel.querySelector(FOCAVEIS)?.focus();
    else burger.focus();
  };

  on(burger, 'click', () => definir(!estaAberto()));
  for (const link of painel.querySelectorAll('a')) {
    on(link, 'click', () => definir(false));
  }

  on(window, 'keydown', (e) => {
    if (!estaAberto()) return;
    if (e.key === 'Escape') {
      definir(false);
      return;
    }
    if (e.key !== 'Tab') return;

    // Ciclo de foco: o painel cobre a tela inteira, então tabular para fora
    // dele levaria o foco para conteúdo visualmente escondido.
    const focaveis = [...painel.querySelectorAll(FOCAVEIS)];
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  });

  add(() => definir(false));
}
