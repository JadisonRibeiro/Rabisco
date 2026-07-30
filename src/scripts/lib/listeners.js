/**
 * Registro centralizado de listeners.
 *
 * Cada módulo recebe um `on` e nunca chama addEventListener direto, de forma
 * que todo listener da página tem um ponto único de remoção. Herdado do
 * componentDidMount do export, que já fazia isso com um array de cleanups.
 */
export function createListenerScope() {
  const cleanups = [];

  return {
    /** Registra um listener e devolve a função que o remove. */
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      const off = () => target.removeEventListener(type, handler, options);
      cleanups.push(off);
      return off;
    },

    /** Enfileira qualquer outro trabalho de limpeza (rAF, observers…). */
    add(cleanup) {
      cleanups.push(cleanup);
    },

    /** Desfaz tudo que foi registrado. */
    destroy() {
      while (cleanups.length) cleanups.pop()();
    },
  };
}
