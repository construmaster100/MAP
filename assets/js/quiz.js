/* ==========================================================================
   SENAEnglish — lógica del cuestionario (pages/quiz.html).
   Cada participante avanza de forma independiente: el servidor es la única
   autoridad sobre qué pregunta toca y si una respuesta es correcta (RNF-06 /
   RNF-07); esta página solo pide "responder" y pinta lo que el servidor
   confirma via "respuesta_validada" / "pregunta_actualizada".
   ========================================================================== */

const FEEDBACK_MS = 1200;
const LETRAS = ["A", "B", "C", "D"];

const progresoActualEl = document.getElementById("progreso-actual");
const progresoTextoEl = document.getElementById("progreso-texto");
const progresoCategoriaEl = document.getElementById("progreso-categoria");
const progressFillEl = document.getElementById("progress-fill");
const questionCategoryEl = document.getElementById("question-category");
const questionTextEl = document.getElementById("question-text");
const optionsGridEl = document.getElementById("options-grid");
const playerNameEl = document.getElementById("player-name");
const playerScoreEl = document.getElementById("player-score");
const playerColorDotEl = document.getElementById("player-color-dot");
const rankingBodyEl = document.getElementById("ranking-body");
const rankingCountEl = document.getElementById("ranking-count");

let paletaPorId = {};
let miColor = null;
let totalPreguntas = 30;
let respondiendo = false;

function colorHex(colorId) {
  return paletaPorId[colorId] || "#999";
}

function renderRanking(ranking) {
  rankingCountEl.textContent = ranking.length;
  rankingBodyEl.innerHTML = "";
  if (!ranking.length) {
    rankingBodyEl.innerHTML = '<tr><td colspan="5" class="lobby-empty">Todavía no hay resultados finalizados.</td></tr>';
    return;
  }
  ranking.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.nombre}</td>
      <td><span class="color-dot" style="background:${colorHex(p.color)}"></span></td>
      <td>${p.aciertos}</td>
      <td>${p.score}</td>`;
    rankingBodyEl.appendChild(tr);
  });
}

function renderProgreso(preguntaActual, categoria) {
  const numero = preguntaActual + 1;
  progresoActualEl.textContent = String(numero).padStart(2, "0");
  progresoTextoEl.textContent = `${String(numero).padStart(2, "0")} / ${totalPreguntas}`;
  progresoCategoriaEl.textContent = categoria || "—";
  progressFillEl.style.width = `${(preguntaActual / totalPreguntas) * 100}%`;
}

function crearOptionCard(opcion, letra) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "option-card";
  btn.dataset.opcionId = opcion.id;
  btn.innerHTML = `
    <div class="option-card-inner">
      <div class="option-face option-front">
        ${opcion.imagen ? `<div class="option-image" style="background-image:url('${opcion.imagen}')"></div>` : ""}
        <span class="option-letter">${letra}</span>
        <span class="option-text">${opcion.texto}</span>
      </div>
      <div class="option-face option-back">
        <span class="option-result-icon" data-role="icon"></span>
        <span class="option-result-label" data-role="label"></span>
      </div>
    </div>`;
  btn.addEventListener("click", () => onSeleccionar(opcion.id, btn));
  return btn;
}

function renderPregunta(pregunta, preguntaActual) {
  respondiendo = false;
  questionCategoryEl.textContent = pregunta.categoria;
  questionTextEl.textContent = pregunta.texto;
  renderProgreso(preguntaActual, pregunta.categoria);

  optionsGridEl.innerHTML = "";
  optionsGridEl.classList.remove("is-locked");
  pregunta.opciones.forEach((opcion, i) => {
    optionsGridEl.appendChild(crearOptionCard(opcion, LETRAS[i]));
  });
}

let preguntaId = null;

async function onSeleccionar(opcionId, btn) {
  if (respondiendo) return;
  respondiendo = true;
  optionsGridEl.classList.add("is-locked");
  btn.classList.add("is-selected");

  const ack = await SENAEnglish.responder(preguntaId, opcionId);
  if (!ack.ok) {
    respondiendo = false;
    optionsGridEl.classList.remove("is-locked");
    btn.classList.remove("is-selected");
    return;
  }
  // El resultado real llega por el evento "respuesta_validada".
}

function mostrarResultadoRespuesta({ opcionId, correcta, opcionCorrectaId, score }) {
  const seleccionada = optionsGridEl.querySelector(`[data-opcion-id="${opcionId}"]`);
  if (seleccionada) {
    seleccionada.classList.add("is-flipped", correcta ? "is-correct" : "is-incorrect");
    const icon = seleccionada.querySelector('[data-role="icon"]');
    const label = seleccionada.querySelector('[data-role="label"]');
    icon.textContent = correcta ? "✓" : "✕";
    label.textContent = correcta ? "Acierto +1" : "Desacierto 0";
  }
  if (!correcta) {
    const correctaCard = optionsGridEl.querySelector(`[data-opcion-id="${opcionCorrectaId}"]`);
    if (correctaCard) correctaCard.classList.add("is-correct-hint");
  }
  playerScoreEl.textContent = score;
}

async function iniciar() {
  if (!SENAEnglish.obtenerSesion()) {
    window.location.href = "../index.html";
    return;
  }

  const respuesta = await SENAEnglish.reclamarSesion();
  if (!respuesta.ok) {
    SENAEnglish.borrarSesion();
    window.location.href = "../index.html";
    return;
  }

  const { participante, pregunta, config, ranking } = respuesta;
  totalPreguntas = config.totalPreguntas;
  config.paleta.forEach((c) => { paletaPorId[c.id] = c.hex; });

  playerNameEl.textContent = participante.nombre;
  playerColorDotEl.style.background = colorHex(participante.color);
  playerScoreEl.textContent = participante.score;
  renderRanking(ranking);

  if (participante.finalizado) {
    window.location.href = "resultado.html";
    return;
  }

  preguntaId = pregunta.id;
  renderPregunta(pregunta, participante.preguntaActual);

  conectarEventos();
}

function conectarEventos() {
  SENAEnglish.socket.on("respuesta_validada", (payload) => {
    if (payload.preguntaId !== preguntaId) return;
    mostrarResultadoRespuesta(payload);
    setTimeout(() => {
      // Si la evaluación terminó, "evaluacion_finalizada" hace la redirección.
    }, 0);
  });

  SENAEnglish.socket.on("pregunta_actualizada", ({ pregunta, preguntaActual }) => {
    setTimeout(() => {
      preguntaId = pregunta.id;
      renderPregunta(pregunta, preguntaActual);
    }, FEEDBACK_MS);
  });

  SENAEnglish.socket.on("evaluacion_finalizada", () => {
    setTimeout(() => { window.location.href = "resultado.html"; }, FEEDBACK_MS);
  });

  SENAEnglish.socket.on("ranking_actualizado", (ranking) => renderRanking(ranking));

  SENAEnglish.socket.on("jugador_actualizado", () => {
    SENAEnglish.observar().then(({ ranking }) => renderRanking(ranking));
  });

  SENAEnglish.socket.on("estado_inicial", () => window.location.reload());
}

document.getElementById("btn-salir").addEventListener("click", () => {
  SENAEnglish.borrarSesion();
  window.location.href = "../index.html";
});

iniciar();
