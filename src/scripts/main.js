/**
 * Ponto de entrada. Registra os módulos de interação num único escopo de
 * listeners e sai do caminho — a página é HTML estático e já está pintada
 * antes deste arquivo rodar.
 */
import { createListenerScope } from './lib/listeners.js';
import { initNavCondense } from './modules/nav-condense.js';
import { initMobileMenu } from './modules/mobile-menu.js';
import { initPointerEffects } from './modules/pointer-effects.js';
import { initLojaEstado } from './modules/loja-estado.js';

const scope = createListenerScope();

for (const init of [initNavCondense, initMobileMenu, initPointerEffects, initLojaEstado]) {
  init(scope);
}

// Vite troca módulos a quente em desenvolvimento; sem isto os listeners se
// acumulariam a cada salvamento.
if (import.meta.hot) import.meta.hot.dispose(() => scope.destroy());
