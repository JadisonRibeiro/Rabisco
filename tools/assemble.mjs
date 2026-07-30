/**
 * Monta src/index.html: cabeçalho autoral + markup vindo do transpiler,
 * com os ajustes estruturais que o export não tinha como fazer sozinho —
 * <main>, âncora #curadoria e remoção dos atributos só-de-editor.
 *
 * Também é one-shot. Depois disso, src/index.html é editado à mão.
 *
 *   node tools/assemble.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const body = fs.readFileSync(path.join(ROOT, '.work/body.html'), 'utf8');

/** Indenta um bloco já formatado para encaixar no documento. */
const indent = (text, pad) =>
  text
    .split('\n')
    .map((l) => (l.trim() ? pad + l : l))
    .join('\n');

let markup = body;

// data-screen-label era rótulo do editor; não tem função na página.
markup = markup.replace(/ data-screen-label="[^"]*"/g, '');

// A nav aponta para #curadoria em 11 lugares, mas nenhum elemento tinha o id.
// A seção do manifesto se chamava "Manifesto + Curadoria": a curadoria é a
// grade de cards dentro dela, que agora recebe a âncora.
const ANCORA = /<div( data-stack="1")? class="manifesto__grade-2"/;
if (!ANCORA.test(markup)) throw new Error('grade de curadoria não encontrada');
markup = markup.replace(ANCORA, '<div$1 id="curadoria" class="manifesto__grade-2"');

// O conteúdo entre a barra e o rodapé é o <main> — o export não tinha nenhum.
markup = markup.replace(
  /(<div data-mobilemenu[\s\S]*?<\/div>\n)(\s*)(<section id="top")/,
  (_, menu, ws, hero) => `${menu}\n${ws}<main id="conteudo">\n${ws}${hero}`,
);
markup = markup.replace(/(\n\s*)(<footer class="rodape__rodape">)/, '$1</main>\n$1$2');

const head = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rabisco Papelaria — Toda grande ideia começa com um rabisco</title>
    <meta
      name="description"
      content="Rabisco Papelaria — curadoria de papéis, canetas e cadernos no Centro de Paragominas, PA. Impressão, encadernação, personalização e presentes."
    />
    <link rel="stylesheet" href="/styles/main.css" />
    <script type="module" src="/scripts/main.js"></script>
  </head>
  <body>
    <a class="pular-para-conteudo" href="#conteudo">Pular para o conteúdo</a>
`;

const foot = `  </body>
</html>
`;

fs.writeFileSync(
  path.join(ROOT, 'src/index.html'),
  head + indent(markup.trimEnd(), '    ') + '\n' + foot,
);

console.log(`src/index.html escrito — ${markup.split('\n').length} linhas de markup`);
