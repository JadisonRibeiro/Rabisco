/** Levanta os valores de design repetidos no template para virarem tokens.
 *  Uso: node tools/audit-values.mjs */
import fs from 'node:fs';
import path from 'node:path';

const t = fs.readFileSync(path.resolve(import.meta.dirname, '../.work/template.html'), 'utf8');

const tally = (label, re, transform = (m) => m[0]) => {
  const counts = {};
  for (const m of t.matchAll(re)) {
    const k = transform(m);
    if (k) counts[k] = (counts[k] || 0) + 1;
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log(`\n### ${label} — ${rows.length} distintos`);
  for (const [k, v] of rows) console.log(`${String(v).padStart(3)}x  ${k}`);
  return rows;
};

tally('cores hex', /#[0-9A-Fa-f]{6}\b/g, (m) => m[0].toUpperCase());
tally('rgba', /rgba\([^)]+\)/g);
tally('box-shadow', /box-shadow:([^;"]+)/g, (m) => m[1].trim());
tally('easing', /cubic-bezier\([^)]+\)/g);
tally('border-radius', /border-radius:([^;"]+)/g, (m) => m[1].trim());
tally('transition (duração)', /transition:[^;"]*?(\.\d+s|\d+(?:\.\d+)?s)/g, (m) => m[1]);
tally('font-weight', /font-weight:([^;"]+)/g, (m) => m[1].trim());
tally('font-stretch', /font-stretch:([^;"]+)/g, (m) => m[1].trim());
tally('letter-spacing', /letter-spacing:([^;"]+)/g, (m) => m[1].trim());
tally('clamp() repetidos', /clamp\([^)]+\)/g);
tally('font-family', /font-family:([^;"]+)/g, (m) => m[1].trim());
