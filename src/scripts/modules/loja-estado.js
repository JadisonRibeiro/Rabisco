/**
 * Diz se a loja está aberta agora.
 *
 * O relógio é o de Paragominas, não o do visitante: alguém consultando de
 * São Paulo veria "aberto" uma hora fora do horário real. America/Belem não
 * tem horário de verão, mas quem faz a conversão é o Intl, não uma conta de
 * fuso escrita à mão.
 *
 * O elemento nasce com [hidden] no HTML e só aparece aqui — sem JS, nada é
 * afirmado, e a tabela de horários logo abaixo continua respondendo.
 */

// 0 = domingo. Minutos desde a meia-noite.
const EXPEDIENTE = {
  1: [480, 1080],
  2: [480, 1080],
  3: [480, 1080],
  4: [480, 1080],
  5: [480, 1080],
  6: [480, 780],
};

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const FUSO = 'America/Belem';

/** Dia da semana e minutos do dia, lidos no fuso da loja. */
function agoraNaLoja() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const campo = (t) => partes.find((p) => p.type === t)?.value;
  const semana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(campo('weekday'));
  // 24 aparece à meia-noite em alguns motores com hour12:false.
  const hora = Number(campo('hour')) % 24;
  return { dia: semana, minutos: hora * 60 + Number(campo('minute')) };
}

const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}h`;

/** Próximo dia com expediente, a partir de (e sem incluir) `dia`. */
function proximaAbertura(dia) {
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    if (EXPEDIENTE[d]) return { dia: d, distancia: i, abre: EXPEDIENTE[d][0] };
  }
  return null;
}

function frase() {
  const { dia, minutos } = agoraNaLoja();
  const hoje = EXPEDIENTE[dia];

  if (hoje && minutos >= hoje[0] && minutos < hoje[1])
    return { aberto: true, texto: `Aberto agora · fecha às ${hhmm(hoje[1])}` };

  if (hoje && minutos < hoje[0])
    return { aberto: false, texto: `Fechado · abre hoje às ${hhmm(hoje[0])}` };

  const prox = proximaAbertura(dia);
  if (!prox) return { aberto: false, texto: 'Fechado' };
  const quando = prox.distancia === 1 ? 'amanhã' : DIAS[prox.dia];
  return { aberto: false, texto: `Fechado · abre ${quando} às ${hhmm(prox.abre)}` };
}

export function initLojaEstado() {
  const alvo = document.querySelector('[data-loja-estado]');
  const texto = document.querySelector('[data-loja-estado-texto]');
  if (!alvo || !texto) return;

  const { aberto, texto: rotulo } = frase();
  texto.textContent = rotulo;
  alvo.dataset.aberto = aberto ? 'sim' : 'nao';
  alvo.hidden = false;
}
