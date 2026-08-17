/**
 * Para cada texto que reprova o contraste, calcula a MENOR opacidade que
 * atinge 4.5:1 — menor opacidade significa menor desvio da aparência
 * desenhada. Também procura um tom de accent legível sobre o ink.
 *
 *   node tools/solve-contraste.mjs
 */
const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lin = (c) => {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razao = (a, b) => {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const misturar = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

const INK = hex('#14100E');
const CREAM = hex('#FAF6F0');
const ACCENT = hex('#C7300C');
const PAPER = hex('#FFFDFA');

/** Menor alpha, em passos de 1%, que atinge o alvo de contraste. */
function menorAlpha(fg, bg, alvo) {
  for (let a = 20; a <= 100; a++) {
    if (razao(misturar(fg, bg, a / 100), bg) >= alvo) return a / 100;
  }
  return null;
}

const CASOS = [
  ['.manifesto__texto — cream sobre accent', CREAM, ACCENT, 0.75],
  ['.presentes__texto-3 — cream sobre accent', CREAM, ACCENT, 0.75],
  ['.servicos__indice — cream sobre ink', CREAM, INK, 0.5],
  ['.rodape__rotulo — cream sobre ink', CREAM, INK, 0.45],
  ['rótulos do rodapé — cream sobre ink', CREAM, INK, 0.4],
  ['.u-rotulo — ink sobre paper', INK, PAPER, 0.45],
  ['.loja__rotulo — ink sobre paper', INK, PAPER, 0.5],
];

console.log('elemento                                    atual        →  mínimo AA');
console.log('─'.repeat(76));
for (const [nome, fg, bg, atual] of CASOS) {
  const agora = razao(misturar(fg, bg, atual), bg);
  const alvo = menorAlpha(fg, bg, 4.5);
  const depois = alvo ? razao(misturar(fg, bg, alvo), bg) : null;
  console.log(
    `${nome.padEnd(42)} ${atual.toFixed(2)} (${agora.toFixed(2)})  →  ` +
      (alvo ? `${alvo.toFixed(2)} (${depois.toFixed(2)})` : 'impossível nesta cor'),
  );
}

console.log('\n─── accent usado como TEXTO sobre o ink (#14100E) ───');
console.log(`#C7300C hoje: ${razao(ACCENT, INK).toFixed(2)} — precisa de 4.5`);
console.log('candidatos (precisam servir também sobre creme e papel):');
for (const c of ['#D9440F', '#E05A22', '#E8672E', '#EE7038', '#F07A45', '#F28A5C']) {
  const sobreInk = razao(hex(c), INK);
  console.log(
    `  ${c}: ink ${sobreInk.toFixed(2)}${sobreInk >= 4.5 ? ' ✓' : '  '} · ` +
      `creme ${razao(hex(c), CREAM).toFixed(2)} · papel ${razao(hex(c), PAPER).toFixed(2)}`,
  );
}
