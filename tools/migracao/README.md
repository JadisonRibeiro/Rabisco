# Ferramentas da migração — concluída

Estes oito scripts existiram para trazer o export original do design para o
código que está em `src/` hoje: `transpile` e `unbundle` desmontavam o HTML de
uma peça só, `assemble` remontava, `diff-locate` e `diff-magnitude`
comparavam o resultado com a referência, `crop-compare` recortava o trecho
divergente, `solve-contraste` resolvia os pares de cor que reprovavam a WCAG e
`audit-values` conferia se algum valor medido tinha sido arredondado no
caminho.

**A migração acabou.** Nenhum deles está ligado a um comando do
`package.json`, e rodar qualquer um agora reescreveria arquivos que já foram
revisados à mão desde então.

Ficam aqui por serem o registro de como o `src/` nasceu — e porque a próxima
migração, se houver, começa daqui em vez de do zero.

## O que continua vivo, um nível acima

`../verify-visual.mjs` (o único com script no `package.json`), mais
`../audit-a11y.mjs`, `../audit-responsive.mjs`, `../measure.mjs`,
`../shoot.mjs`, `../diff.mjs`, `../gerar-icones.mjs` e `../gerar-og.mjs`.

## Dependências

As bibliotecas pesadas que estes scripts usam — `sharp`, `playwright-core`,
`pixelmatch`, `pngjs`, `axe-core`, `node-html-parser` — entram junto com todo o
resto no `npm install`. Nenhuma serve ao site, só a estas ferramentas.

Elas chegaram a ficar em `optionalDependencies`, para o CI pular o download com
`npm ci --omit=optional`. Não funciona: a flag não escolhe quais optional
descartar, e o rolldown do Vite entrega a binária de plataforma exatamente por
esse canal — sem ela o `build` não roda. Separar de verdade pede um
`package.json` próprio aqui dentro.
