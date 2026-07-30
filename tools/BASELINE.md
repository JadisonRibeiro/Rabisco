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

### todos os viewports — contraste WCAG AA

Segunda substituição, de natureza puramente cromática: a altura de cada
viewport continua idêntica à do export, o que confirma que nada se moveu.

O laranja da marca passou de `#E23A12` para `#C7300C`. O tom original dá
4.02:1 sobre o creme e reprova o mínimo de 4.5:1 para texto normal — e não
havia saída pelo texto: `#14100E` sobre aquele laranja dá 4.37:1, também
insuficiente. Só escurecendo o próprio laranja.

Um segundo token, `--accent-claro` (`#E05A22`), atende o caso inverso: o
laranja das superfícies claras cai para 3.47:1 quando vira texto sobre o
ink, no card escuro dos presentes.

Sete textos secundários tiveram a opacidade elevada ao mínimo que atinge
4.5:1 — nada foi arredondado para um número "bonito", cada valor é o menor
que passa:

| elemento              | antes | depois |
| --------------------- | ----- | ------ |
| `.manifesto__texto`   | 86%   | 93%    |
| `.presentes__texto-3` | 86%   | 93%    |
| `.servicos__indice`   | 0.5   | 0.62   |
| `.rodape__rotulo`     | 0.45  | 0.6    |
| `.u-rotulo`           | 0.45  | 0.6    |
| `.loja__rotulo`       | 0.5   | 0.62   |
| `.rodape__rotulo-2`   | 40%   | 55%    |

Os números `01`–`05` da galeria ganharam um véu radial local. Eles ficavam
sobre a foto, acima do gradiente que só escurece a base do card: sobre a
foto clara das canetas a razão era **1.00** — o número não aparecia. Um véu
no topo dos cinco cards resolveria, mas escureceria as cinco fotos; o
gradiente local cobre apenas o canto e se dissolve antes da área útil.
