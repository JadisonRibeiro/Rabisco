# Relatório de limpeza de código morto

Branch `chore/dead-code-cleanup`, a partir de `master` (`d16b5a2`).
Data: 31/07/2026.

---

## ⚠️ Antes de qualquer coisa: há trabalho seu guardado no stash

A Fase 0 encontrou 12 arquivos modificados e 5 não rastreados na árvore, e os
guardou conforme instruído:

```
stash@{0}: On master: pre-cleanup
```

São as alterações da sessão anterior — refatoração da seção de categorias,
troca da imagem do hero, remoção do selo "R", regeneração dos favicons e o
giro no hover. **Nada disso está nesta branch.** Para recuperar:

```bash
git stash pop            # na branch onde você quiser o trabalho de volta
```

**A limpeza foi feita sobre o código de `master`, não sobre esse trabalho.**
Duas consequências práticas:

1. Ao dar `pop`, espere conflitos em `src/styles/animations.css`,
   `src/styles/base.css` e `src/styles/tokens.css` — os três foram tocados
   pelos dois lados.
2. Um item foi classificado como INCERTO exatamente por causa disso
   (`--largura-max`, veja abaixo).

Se preferir o caminho sem atrito: dê `pop` primeiro, commite o trabalho da
sessão, e só então faça `git rebase` desta branch por cima.

---

## Linha de base (antes)

| Verificação | Resultado |
| --- | --- |
| `npm run build` | ✔ passa — 429 ms |
| `npx eslint .` | ✔ passa — 0 problemas |
| `npx prettier --check .` | ✘ falha em 7 arquivos — **pré-existente** |
| Suíte de testes | **não existe** — `package.json` não tem script `test` |

A falha do Prettier é de finais de linha, não de código: o `core.autocrlf` do
Git entrega os arquivos com CRLF no checkout e o `.prettierrc` exige
`endOfLine: "lf"`. Isso já falhava antes da limpeza e não foi mexido —
"consertar" reescreveria 7 arquivos inteiros por causa de invisíveis, ruído
que não pertence a este diff.

Como não há testes, o portão funcional de cada etapa foi
**build + eslint + `tools/audit-a11y.mjs` + `tools/audit-responsive.mjs`**.

---

## Removido

| Caminho | Tipo | Motivo | Commit |
| --- | --- | --- | --- |
| `src/styles/base.css` | regra CSS `[data-clipgrad]` | Nenhum elemento da página carrega o atributo. Veio do export e nunca encontrou marcação. | `1562050` |
| `src/styles/animations.css` | seletor `[data-pulse]` (2 ocorrências) | Idem. O pulso do WhatsApp é dirigido por `[data-wapulse]`, que permanece. | `1562050` |
| `src/styles/animations.css` | regra `[data-pd='1']` | Nenhum elemento carrega o atributo. | `1562050` |
| `src/styles/tokens.css` | token `--font-hand` | Declarado e nunca lido: os 5 pontos que usam a Caveat escrevem `font-family: Caveat, cursive` direto. | `1562050` |
| `package.json`, `package-lock.json` | dependência `sirv-cli` | Nenhum script e nenhum módulo o importa. A única menção está em `tools/BASELINE.md`, como `npx sirv-cli` — o npx resolve na hora, sem precisar da declaração. | `d621564` |
| `src/styles/animations.css` | 3 blocos `[data-motion='sutil']` | Feature flag permanentemente desligada: `data-motion` é escrito uma única vez, em `src/index.html`, com o valor `"cinematico"`. Nenhum JS reescreve o atributo e não há controle de interface que o alterne. | `660fa1c` |

Nenhuma etapa precisou de `git reset --hard`: build e lint passaram nas três.

### Etapas que não tinham o que remover

| Etapa prevista | Resultado |
| --- | --- |
| 1. Imports/variáveis sem uso | Nenhum — o `eslint` com `no-unused-vars` já passava limpo. |
| 3. Arquivos e pastas órfãos | Nenhum em `src/`: todos os 8 CSS e 4 módulos JS são alcançados a partir de `index.html` → `main.css`/`main.js`. |
| 4. Assets órfãos | Nenhum. Os 27 arquivos de `src/assets` e os 7 de `public/` têm referência (os ícones de app via `site.webmanifest`). |
| 6. Testes órfãos | Não há suíte de testes. |

---

## Método

`knip` e `ts-prune` não alcançam este stack: não há módulos TypeScript, e o
consumo real acontece por **classe de CSS no HTML** e por **atributo `data-*`
lido no JS** — ligações que essas ferramentas não seguem. Rodei `depcheck`
(que cobre bem o `package.json`) e escrevi um analisador de alcançabilidade
para o resto, partindo dos entrypoints declarados:

- `vite.config.js` (`root: 'src'`, `publicDir: '../public'`)
- `package.json` → `scripts` (`vite`, `eslint`, `tools/verify-visual.mjs`)
- `src/index.html` → `<link>` CSS, `<script type="module">`, `href`/`src`
- `@import` em cascata a partir de `styles/main.css`
- `import` relativo a partir de `scripts/main.js`

Sobre esse grafo, o analisador cruzou: classes CSS × `class=""` e strings do
JS; custom properties declaradas × lidas por `var()`; `@keyframes` × uso em
`animation`; seletores `[data-*]` × atributos presentes no HTML/JS; exports
JS × importadores; e nomes de arquivo de asset × todo o corpo de texto do
repositório.

Não havia `.github/`, Dockerfile, Procfile nem `serverless.yml` para
considerar.

---

## INCERTOS — não removidos

### 1. `--largura-max` (`src/styles/tokens.css`)

Sem nenhum `var(--largura-max)` no código de `master`. **Mas é lido 3 vezes
pelo trabalho guardado em `stash@{0}`**, na seção de categorias refatorada.
Removê-lo aqui quebraria o `pop`.

*Como validar:* depois de recuperar o stash e commitar, rode
`grep -rn "largura-max" src/`. Se as três leituras aparecerem, o token está
vivo e este item se resolve sozinho.

### 2. Cadeia de migração one-shot — `tools/unbundle.mjs`, `tools/transpile.mjs`, `tools/assemble.mjs`, `tools/lib/{naming,tokens,emit}.mjs`

Fora do grafo e **impossíveis de executar**: a entrada dos três é o export
self-extracting em `index.html` na raiz e o intermediário
`.work/page.json`, ambos ausentes e ignorados pelo `.gitignore`.

Mesmo assim ficam, porque o próprio `transpile.mjs` documenta a retenção:

> *"Fica versionado porque é a prova de que o src/ deriva do export sem
> retoque manual escondido."*

É uma decisão deliberada registrada em código. Remover apagaria a
proveniência do `src/` — o oposto do objetivo. `tools/lib/*` acompanha porque
só o `transpile.mjs` o consome.

*Como validar:* decida se a proveniência ainda importa para você. Se não
importar, `git rm tools/{unbundle,transpile,assemble}.mjs tools/lib/*.mjs` e
`npm pkg delete dependencies.node-html-parser` — o `transpile.mjs` é o único
consumidor dessa dependência, então ela cai junto (−1 dep de produção, a
única que o projeto tem).

### 3. Ferramentas de diagnóstico da migração — `tools/measure.mjs`, `tools/relatorio.mjs`, `tools/audit-values.mjs`, `tools/solve-contraste.mjs`, `tools/crop-compare.mjs`, `tools/diff-locate.mjs`, `tools/diff-magnitude.mjs`, `tools/contact-sheet.mjs`, `tools/contraste-sobre-foto.mjs`

Nenhuma é importada por nada nem citada em `scripts`. São utilitários de
linha de comando com uso documentado no cabeçalho, e várias já cumpriram seu
papel: `audit-values.mjs` levantou os valores que viraram os tokens,
`solve-contraste.mjs` calculou os tons que estão hoje em `tokens.css`.
`measure.mjs` compara o build atual com o build original, que não existe mais.

Enquadram-se em "código consumido apenas por CI, scripts de deploy ou infra"
da lista MANTER — são ferramenta de desenvolvimento, não peso morto do
produto. Removê-las tira capacidade de diagnóstico, não código inerte.

*Como validar:* `node tools/<nome>.mjs` em cada uma. As que exigirem a
baseline do export original (`measure.mjs`, `relatorio.mjs`) vão falhar por
falta de entrada — essas são as candidatas mais fortes a sair, se você não
pretende mais comparar com o export.

### 4. `tools/shoot.mjs`, `tools/diff.mjs`, `tools/verify-visual.mjs`, `tools/audit-a11y.mjs`, `tools/audit-responsive.mjs`, `tools/gerar-icones.mjs`, `tools/gerar-og.mjs`

**Vivos, listados aqui só para fechar o inventário de `tools/`.**
`verify-visual.mjs` está em `scripts` e importa `shoot.mjs` e `diff.mjs`; os
demais geram assets versionados ou auditam a página, e foram usados nesta
própria sessão.

### 5. `--font-hand` — removido, mas com uma alternativa

Removi por ser um token sem leitura, que é o critério da tarefa. A outra
saída seria **ligar** o token nos 5 pontos que hoje escrevem
`font-family: Caveat, cursive` na mão. Isso é refatoração, não limpeza, então
não fiz. Se preferir esse caminho, reverta o `1562050` parcialmente e troque
as 5 declarações.

---

## Métricas — antes × depois

| Métrica | Antes | Depois | Δ |
| --- | ---: | ---: | ---: |
| Arquivos versionados | 97 | 97 | 0 |
| LOC (`src/` + `tools/`, texto) | 6806 | 6777 | **−29** |
| Linhas removidas no total | — | — | **−182** |
| Dependências | 1 prod + 12 dev | 1 prod + **11 dev** | **−1** |
| CSS no bundle | 41 972 B | **41 613 B** | **−359 B** |
| `node_modules/` | 123 MB | 123 MB | 0 * |
| Tempo de build | 429 ms | **238–277 ms** | ** |
| Nº de testes | 0 | 0 | 0 |

\* `sirv-cli` saiu do `package.json` e do lock (−152 linhas), mas os arquivos
só desaparecem do disco após `npm ci` ou `rm -rf node_modules && npm install`.

\*\* A queda no tempo de build é ruído de cache do Vite, não efeito da
limpeza — 359 bytes de CSS não movem o ponteiro. Registrado por honestidade
com a medição, não como ganho.

### Verificações finais

| Verificação | Resultado |
| --- | --- |
| `npm run build` | ✔ passa |
| `npx eslint .` | ✔ passa |
| `tools/audit-a11y.mjs` | ✔ axe-core WCAG 2.1 A+AA — nenhuma violação |
| `tools/audit-responsive.mjs` | ✔ 9 de 9 cenários limpos |
| `npx depcheck` | ✔ nenhuma dependência sem uso |
| `npx prettier --check .` | ✘ falha — a mesma falha de CRLF de antes |

---

## Rollback

Desfazer a limpeza inteira e voltar ao ponto de partida:

```bash
git checkout master
git branch -D chore/dead-code-cleanup
git stash pop                       # devolve o trabalho da sessão à árvore
```

Desfazer só um dos commits, mantendo os outros:

```bash
git revert 660fa1c    # modo "sutil"
git revert d621564    # sirv-cli  (rode npm install depois)
git revert 1562050    # seletores e token sem consumidor
```

Inspecionar tudo o que saiu, sem desfazer:

```bash
git diff master..chore/dead-code-cleanup
```

---

## Leitura honesta do resultado

O repositório já estava enxuto. A limpeza rendeu **182 linhas e uma
dependência** — não há aqui a faxina de milhares de linhas que o pedido
antecipava, e inflar o número exigiria remover as ferramentas de `tools/`,
que são capacidade de diagnóstico e proveniência, não código morto.

O achado de maior valor não é volumétrico: os três blocos `[data-motion='sutil']`
eram um **caminho de código que nunca executou** desde o export — havia um
modo de movimento alternativo inteiro estilizado, sem nenhum controle que o
ligasse. Esse tipo de coisa engana quem lê o CSS procurando entender o
comportamento da página.
