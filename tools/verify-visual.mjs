/**
 * Portão de fidelidade visual.
 *
 * Sobe o build atual, captura os viewports de auditoria e compara com a
 * baseline do export original. Falha se alguma altura mudar ou se o desvio
 * médio de cor passar do limiar.
 *
 *   npm run verify:visual
 *
 * A baseline vive em .baseline/original e foi capturada do bundle antes de
 * qualquer refatoração (commit e70e778). Para regravá-la:
 *   git show e70e778:index.html > /tmp/orig/index.html && node tools/shoot.mjs …
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { shoot } from './shoot.mjs';
import { diffDirs } from './diff.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORTA = 4399;
const BASELINE = path.join(ROOT, '.baseline/original');
const ATUAL = path.join(ROOT, '.baseline/atual');

if (!fs.existsSync(BASELINE)) {
  console.error('baseline ausente em .baseline/original — veja o cabeçalho deste arquivo');
  process.exit(2);
}

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, shell: true, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} saiu com ${code}`))));
  });

async function esperarServidor(url, tentativas = 40) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('servidor de preview não respondeu');
}

console.log('› build');
await run('npx', ['vite', 'build', '--logLevel', 'warn']);

console.log('› preview');
const server = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], {
  cwd: ROOT,
  shell: true,
  stdio: 'ignore',
  detached: false,
});

let codigo;
try {
  await esperarServidor(`http://localhost:${PORTA}/`);
  console.log('› captura');
  await shoot(`http://localhost:${PORTA}/`, ATUAL);

  console.log('\n› comparação com o export original\n');
  const resultados = diffDirs(BASELINE, ATUAL, path.join(ROOT, '.baseline/diff'));
  console.log('viewport              altura   px difs      %   delta médio');
  console.log('─'.repeat(64));
  for (const r of resultados) {
    const altura = r.alturaA === r.alturaB ? String(r.alturaA) : `${r.alturaA}→${r.alturaB}`;
    console.log(
      `${r.viewport.padEnd(20)} ${altura.padStart(11)} ${String(r.divergentes).padStart(8)}` +
        ` ${(r.fracao * 100).toFixed(2).padStart(6)}% ${r.deltaMedio.toFixed(2).padStart(9)}` +
        `  ${r.ok ? 'ok' : 'DIVERGE'}`,
    );
  }
  codigo = resultados.every((r) => r.ok) ? 0 : 1;
  console.log(codigo ? '\nfidelidade visual QUEBRADA' : '\nfidelidade visual mantida');
} finally {
  server.kill();
}

if (codigo === undefined) {
  codigo = 1;
}

process.exit(codigo);
