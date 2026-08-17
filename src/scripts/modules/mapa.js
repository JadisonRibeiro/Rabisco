/**
 * Mapa sob demanda.
 *
 * A seção da loja mostra uma fachada com o endereço; o embed do Google só é
 * criado quando alguém clica. Enquanto isso a página não pede 700 KB–1 MB de
 * JavaScript de terceiro nem deixa gravar cookie de outro domínio.
 *
 * O botão nasce `hidden` no HTML e este módulo o revela — sem JS não haveria
 * quem o operasse, e um botão que não faz nada é pior que botão nenhum. O
 * endereço e o "Traçar rota" da seção continuam lá dos dois jeitos.
 */

export function initMapa({ on }) {
  const fachada = document.querySelector('[data-mapa]');
  if (!fachada) return;

  const botao = fachada.querySelector('[data-mapa-abrir]');
  const src = fachada.dataset.mapaSrc;
  if (!botao || !src) return;

  botao.hidden = false;

  on(botao, 'click', () => {
    const iframe = document.createElement('iframe');
    iframe.title = fachada.dataset.mapaTitulo ?? 'Mapa';
    iframe.src = src;
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.className = 'loja__mapa';

    fachada.replaceWith(iframe);

    /*
     * O foco estava no botão que acabou de sair do documento; sem devolvê-lo a
     * algum lugar ele volta para o <body> e quem navega por teclado perde a
     * posição na página. O iframe é o destino certo — é o que o clique pediu.
     */
    iframe.focus();
  });
}
