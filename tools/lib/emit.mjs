/** Escrita dos arquivos finais em src/ a partir do resultado do transpiler. */
import fs from 'node:fs';
import path from 'node:path';
import { tokenize } from './tokens.mjs';

/** Cabeçalho padrão dos arquivos de componente. */
const banner = (titulo) => `/* ${titulo} */\n\n`;

/** Agrupa as regras por bloco BEM — um arquivo por componente. */
export function groupRulesByBlock(rules) {
  const groups = new Map();
  for (const rule of rules) {
    const block = rule.klass.startsWith('u-')
      ? 'utilitarias'
      : rule.klass.split('__')[0].replace(/-\d+$/, '');
    if (!groups.has(block)) groups.set(block, []);
    groups.get(block).push(rule);
  }
  return groups;
}

/** Serializa uma regra (base + :hover) em CSS. */
export function renderRule({ klass, decls, hover }) {
  let out = `.${klass} {\n${decls}\n}\n`;
  if (hover) out += `\n.${klass}:hover {\n${hover}\n}\n`;
  return out;
}

export function writeComponentStyles(dir, groups, titles) {
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [block, rules] of groups) {
    const file = `${block}.css`;
    const body = rules.map(renderRule).join('\n');
    fs.writeFileSync(path.join(dir, file), banner(titles[block] ?? block) + body);
    files.push(file);
  }
  return files;
}

/** Reescreve as urls de fonte do bloco @font-face para os arquivos em disco. */
export function rewriteFontFaces(css, assets) {
  return css.replace(/url\("([0-9a-f-]{36})"\)/g, (m, uuid) => {
    const a = assets[uuid];
    if (!a) throw new Error(`fonte desconhecida: ${uuid}`);
    return `url("/assets/fonts/${a.file}")`;
  });
}

/** Aplica tokens ao CSS global herdado do export. */
export function tokenizeGlobalCss(css) {
  return tokenize(css)
    .replace(/var\(--accent\s*,\s*var\(--accent\)\)/g, 'var(--accent)')
    .replace(/^\s{2}/gm, '');
}
