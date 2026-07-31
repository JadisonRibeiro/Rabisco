# Rabisco Papelaria

Landing page da Rabisco Papelaria — Rua Sete de Setembro, 36, Centro,
Paragominas/PA.

Página única, estática, sem framework de runtime.

## Stack

| Camada        | Escolha                                                        |
| ------------- | -------------------------------------------------------------- |
| Build         | Vite 7                                                         |
| Markup        | HTML semântico                                                 |
| Estilo        | CSS puro, BEM-lite, custom properties                          |
| Comportamento | JavaScript de módulos ES, sem dependências                     |
| Fontes        | Archivo e Caveat, self-hosted em woff2                         |
| Qualidade     | ESLint, Prettier, axe-core, Playwright (via `playwright-core`) |

Nenhuma dependência chega ao navegador: o JS de produção são 4 KB do próprio
site.

## Como rodar

Node 22 ou superior (veja `.nvmrc`).

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # gera dist/
npm run preview    # serve o dist/ gerado
```

### Scripts

| Comando                 | O que faz                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Vite em modo desenvolvimento                               |
| `npm run build`         | build de produção em `dist/`                               |
| `npm run preview`       | serve o `dist/`                                            |
| `npm run lint`          | ESLint                                                     |
| `npm run format`        | Prettier, escrevendo                                       |
| `npm run format:check`  | Prettier, só conferindo                                    |
| `npm run verify:visual` | compara o build com a referência visual do export original |

## Variáveis de ambiente

Só existe uma. Copie `.env.example` para `.env`:

```
VITE_SITE_URL=https://rabisco.pages.dev
```

Ela alimenta a canonical, as tags Open Graph, o bloco JSON-LD, o `robots.txt`
e o `sitemap.xml` — os dois últimos emitidos durante o build. Quando o
domínio definitivo existir, este é o único lugar a mudar.

## Estrutura

```
src/
  index.html            markup da página inteira
  assets/
    images/             fotos de conteúdo e arte da marca
    fonts/              Archivo e Caveat em woff2
  styles/
    tokens.css          custom properties: cor, tipografia, ritmo, sombras
    fonts.css           @font-face
    base.css            reset, foco, skip link
    animations.css      keyframes e o sistema de entrada por rolagem
    components/         um arquivo por bloco BEM
    interactions.css    estados que atravessam componentes
    alvos-de-toque.css  ampliação de área clicável
    responsive.css      as duas quebras globais
    main.css            ordem de importação — é a cascata
  scripts/
    main.js             ponto de entrada
    lib/listeners.js    escopo único de listeners
    modules/            um arquivo por comportamento
public/                 favicons, og-image, manifest — copiados sem alteração
tools/                  migração e auditoria; não entram no build
```

## Decisões arquiteturais

### O export não era HTML

O arquivo que veio do Claude Design tinha 3,16 MB e era um _bundle
auto-extraível_: a página real vivia serializada em JSON dentro de uma tag
`<script>` e só existia depois que 271 KB de JavaScript rodavam — React 18,
um runtime proprietário (`dc-runtime`) e um web component de editor
(`image-slot`) com shadow DOM, arrastar-e-soltar e botões de "Replace".

Esse runtime não fazia nada que um build não faça melhor. Tudo o que ele
resolvia em tempo de execução passou para tempo de build:

- `<image-slot>` virou `<img>` de verdade;
- `style-hover=""` virou regra `:hover`;
- `sc-camel-view-box` virou `viewBox`;
- `{{ waLink }}` e as outras interpolações foram resolvidas;
- 349 atributos `style` inline viraram 207 classes.

A página passou a renderizar sem JavaScript e o JS caiu de 271 KB para 4 KB.

A conversão está em `tools/unbundle.mjs`, `tools/transpile.mjs` e
`tools/assemble.mjs`. São scripts de migração de uso único, versionados como
prova de que `src/` deriva do export sem retoque manual escondido — não fazem
parte do build e não devem ser executados de novo.

### `object-fit` no lugar da matemática do componente

O `<image-slot>` posicionava a imagem em absoluto e recalculava
`left/top/width/height` em JavaScript a cada _resize_:

```
base = fit === 'contain' ? min(fw/iw, fh/ih) : max(fw/iw, fh/ih)
w = iw * base * s ; h = ih * base * s
left = (50 + x)% ; top = (50 + y)%   com translate(-50%, -50%)
```

Os 18 slots da página guardavam `s=1, x=0, y=0`. Nesse caso a fórmula
degenera exatamente em `object-fit` com `object-position: center`, que o
navegador resolve sozinho.

O detalhe que quase escapou: o `:host` do componente declarava
`aspect-ratio: 3/2`. Não era decoração. Nos cards do manifesto, cuja mídia
usa `height: 56%`, é essa razão que dimensiona a linha do grid na primeira
passada de layout. Sem ela o navegador cai na proporção intrínseca de cada
arquivo e a altura do card passa a depender da foto que estiver ali — foram
96 px por card até o `verify:visual` apontar. A regra está em
`src/styles/components/foto.css`, comentada.

### BEM-lite, e não utility-first

São 207 regras, quase todas únicas, numa landing de uma página só. Uma
abordagem utilitária geraria centenas de classes atômicas sem reuso real —
pior do que o inline que substituiu. O design é organizado por componente
(header, hero, rail, chip, card, kit, galeria, rodapé), então classes de
bloco mapeiam um para um com a estrutura que já existia.

As sete regras que aparecem em mais de um bloco foram promovidas a
utilitárias (`u-*`): batizá-las pelo bloco onde surgiram primeiro mentiria
sobre quem é o dono.

### Dois tokens de laranja

O laranja do export (`#E23A12`) dá 4,02:1 sobre o creme e reprova o mínimo de
4,5:1 da WCAG AA para texto normal. Não havia como corrigir pelo texto: o ink
sobre aquele laranja dá 4,37:1, também insuficiente. `#C7300C` sobe para
5,06:1 com o menor desvio de matiz que resolve.

O caminho inverso pede outro tom: o laranja das superfícies claras cai para
3,47:1 quando vira texto sobre o ink. Daí `--accent-claro` (`#E05A22`).

Os brilhos e halos do design foram desenhados sobre um laranja mais claro que
a superfície (`#F63E0B`) e continuam num token próprio, `--glow-rgb`.
Amarrá-los ao `--accent` mudaria a aparência das seções laranja.

### Fidelidade visual como portão

`npm run verify:visual` builda, sobe o preview, captura sete viewports e
compara com a referência capturada do export antes de qualquer refatoração.
Aprova quando a altura de cada viewport é idêntica e o desvio médio de cor
fica em 3 ou menos, numa escala de 0 a 255.

O critério não é contagem de pixels divergentes. Trocar o dimensionamento por
JavaScript por `object-fit` produz a mesma geometria, mas o Chrome reamostra
a foto por um caminho ligeiramente diferente: muitos pixels mudam por uma
fração imperceptível. Deslocamento de layout tem a assinatura oposta — poucos
pixels com desvio grande, e altura diferente.

As duas divergências aceitas de propósito estão documentadas em
`tools/BASELINE.md`, com o motivo de cada uma.

## Ferramentas de auditoria

Todas esperam um preview em `http://localhost:4399`
(`npx vite preview --port 4399`).

```bash
node tools/audit-a11y.mjs           # axe-core WCAG 2.1 AA + estrutura + teclado
node tools/audit-responsive.mjs     # overflow, alvos de toque, reflow a 400%
node tools/contraste-sobre-foto.mjs # contraste de texto sobre fotografia
node tools/gerar-icones.mjs         # favicons e ícones de app
node tools/gerar-og.mjs             # imagem Open Graph
node tools/relatorio.mjs            # números de antes e depois
```

`tools/contraste-sobre-foto.mjs` existe porque o axe desiste desses casos
("background could not be determined"): não há cor de fundo declarada, há uma
foto arbitrária sob um véu em gradiente. A ferramenta captura a região com o
texto em `color: transparent` — assim os pseudo-elementos que garantem o
contraste seguem pintados — e mede o pior pixel de fundo real.

## Fora do escopo desta entrega

Performance e deploy não foram executados. O `dist/` é estático e serve em
qualquer hospedagem, mas falta:

- converter as imagens para AVIF/WebP com fallback, declarar `width`/`height`
  e marcar o LCP com `fetchpriority="high"`;
- reduzir os subsets de fonte (hoje carrega cirílico e vietnamita num site em
  português);
- redimensionar `logo-rabisco.png` — 532 KB para um ícone de 19 px na nav;
- configurar o provedor de hospedagem e os headers de segurança (CSP,
  X-Content-Type-Options, Referrer-Policy).

As fotos de produtos e galeria ainda são de banco de imagens, e algumas não
correspondem ao rótulo que o site dá a elas. A lista está no relatório de
entrega.
