# Baseline de fidelidade visual

`npm run verify:visual` compara o build atual com capturas de referência em
`.baseline/original/`. A pasta é gerada, não versionada.

## Como regravar do zero

```bash
git show e70e778:index.html > /tmp/rabisco-orig/index.html
git show e70e778:.image-slots.state.json > /tmp/rabisco-orig/.image-slots.state.json
npx sirv-cli /tmp/rabisco-orig --port 4321 --quiet &
node tools/shoot.mjs http://localhost:4321/ .baseline/original
```

O commit `e70e778` é o export intacto do Claude Design, antes de qualquer
refatoração.

## Critério

Aprova quando, em cada viewport, a **altura total é idêntica** e o **desvio
médio de cor** fica em 3 ou menos (escala 0–255).

Contagem de pixels divergentes não serve sozinha. Trocar o dimensionamento
por JavaScript do `<image-slot>` por `object-fit` produz exatamente a mesma
geometria, mas o Chrome reamostra a foto por um caminho um pouco diferente:
muitos pixels mudam por uma fração imperceptível. Deslocamento de layout tem
a assinatura oposta — poucos pixels com desvio grande, e altura diferente.

## Divergências aceitas

Estas capturas de referência foram **substituídas de propósito**. Cada uma
corrige um defeito do export, não muda o design.

### `320.png` e `375.png` — texto cortado no hero e na seção da loja

O export definia `font-size: clamp(52px, 8.4vw, 142px)` no `h1` e
`clamp(32px, 4.6vw, 78px)` no `h2` da loja. Abaixo de ~620px o `vw` não
alcança o piso, então valia sempre o mínimo: "IDEIA COMEÇA" ocupava 347px de
largura numa viewport de 320px.

Como as linhas do título são `white-space: nowrap` e itens de grid nascem com
`min-width: auto`, o título arrastava a trilha inteira além da viewport — e
levava o parágrafo vizinho junto. O `overflow-x: hidden` do `body` escondia o
sintoma: não havia barra de rolagem, o conteúdo era simplesmente cortado.

Perdia-se, em 320px:

- `TODA GRANDE` → o **E** final
- `COM UM Rabisco` → **isco**
- o parágrafo inteiro, cortado à direita em todas as quatro linhas
- `Rua Sete de Setembro, 36` → parte do número

A correção baixa o piso do `clamp` apenas nas faixas onde ele não cabia
(`max-width: 620px` no hero, `max-width: 700px` na loja) e libera o
encolhimento das trilhas dentro do empilhamento (`max-width: 900px`). De
620px para cima os valores são byte a byte os do export — confirmado pelos
viewports 768, 1024, 1440, 1920 e landscape, que seguem batendo com a
referência original.
