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
import { initCarrossel } from './modules/carrossel.js';
import { initAbertura } from './modules/abertura.js';
import { initDescontos } from './modules/descontos.js';
import { initAnimViewport } from './modules/anim-viewport.js';
import { initMapa } from './modules/mapa.js';

const scope = createListenerScope();

for (const init of [
  initAbertura,
  initNavCondense,
  initMobileMenu,
  initPointerEffects,
  initLojaEstado,
  initCarrossel,
  initDescontos,
  initAnimViewport,
  initMapa,
]) {
  init(scope);
}

// Vite troca módulos a quente em desenvolvimento; sem isto os listeners se
// acumulariam a cada salvamento.
if (import.meta.hot) import.meta.hot.dispose(() => scope.destroy());
