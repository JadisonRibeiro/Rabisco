# Rabisco Papelaria — Landing Page

Site de página única da Rabisco Papelaria (Rua Sete de Setembro, 36 — Centro, Paragominas/PA).

## Como rodar

Abra `index.html` com duplo clique. É só isso — o arquivo é autossuficiente
(fontes, imagens e scripts estão todos embutidos) e funciona sem internet.

Para publicar, suba a pasta inteira em qualquer hospedagem estática
(Netlify, Vercel, GitHub Pages, cPanel). O `index.html` é servido
automaticamente na raiz do domínio.

## Estrutura

| Arquivo                   | O que é                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `index.html`              | O site. Único arquivo necessário para funcionar.                                                               |
| `.image-slots.state.json` | Estado das imagens do editor. O site funciona sem ele, mas mantê-lo evita um erro 404 no console.              |
| `marca/`                  | Arte-fonte da marca em alta resolução. **Não é usada pelo site** — é arquivo de referência para futuras peças. |

### marca/

- `arte-oficial-rabisco.png` — lockup oficial "Rabisco" com o R da identidade
- `logo-R-1254px.png` — o R da marca, 1254px, fundo branco
- `logo-R-823px.png` — o R da marca, 823px, fundo branco

## Observações

- O "R" da palavra _Rabisco_ no título principal é o R oficial da marca,
  desenhado em SVG inline: acompanha a cor de destaque e escala sem perder nitidez.
- As imagens de produtos e galeria ainda são fotos genéricas de banco de imagens.
  Para trocá-las é preciso reabrir o projeto na ferramenta que o gerou — os
  arquivos-fonte editáveis (`.dc.html`) não estão mais nesta pasta.
