const { io } = require("socket.io-client");

function connect() {
  return io("http://localhost:4000", { transports: ["websocket"] });
}
function emit(socket, evt, payload) {
  return new Promise((resolve) => socket.emit(evt, payload, resolve));
}
function once(socket, evt) {
  return new Promise((resolve) => socket.once(evt, resolve));
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; }
  else console.log("ok:", msg);
}

// La pregunta 1 del banco (game-server/questions.js) es correcta con
// opcionId "b" (IF: "If it rains tomorrow, we ______ at home." -> "will stay").
const RESPUESTA_CORRECTA_PREGUNTA_1 = "b";
const RESPUESTA_INCORRECTA_PREGUNTA_1 = "a";

(async () => {
  const s1 = connect();
  const s2 = connect();
  await Promise.all([once(s1, "connect"), once(s2, "connect")]);

  const r1 = await emit(s1, "unirse", { nombre: "Carlos", color: "verde" });
  assert(r1.ok, "participante 1 se une con color verde");
  const j1id = r1.jugadorId;

  const rDup = await emit(s2, "unirse", { nombre: "Pedro", color: "verde" });
  assert(rDup.ok === false, "color repetido es rechazado: " + JSON.stringify(rDup));

  const r2 = await emit(s2, "unirse", { nombre: "Pedro", color: "azul" });
  assert(r2.ok, "participante 2 se une con color azul");

  assert(r1.config.totalPreguntas === 30, "el cuestionario tiene 30 preguntas");
  assert(r1.pregunta.opciones.length === 4, "cada pregunta tiene 4 opciones");
  assert(r1.pregunta.respuestaCorrecta === undefined, "el cliente no recibe la respuesta correcta (RNF-06)");

  // responder correctamente la pregunta 1
  const validadaPromise = once(s1, "respuesta_validada");
  const siguientePromise = once(s1, "pregunta_actualizada");
  const ackAcierto = await emit(s1, "responder", { preguntaId: r1.pregunta.id, opcionId: RESPUESTA_CORRECTA_PREGUNTA_1 });
  assert(ackAcierto.ok, "el servidor acepta la respuesta a la pregunta 1");
  const validada = await validadaPromise;
  assert(validada.correcta === true && validada.score === 1, "acierto en pregunta 1 suma 1 punto: score=" + validada.score);
  const siguiente = await siguientePromise;
  assert(siguiente.pregunta.id === r1.pregunta.id + 1, "avanza a la pregunta 2 tras responder");

  // responder la misma pregunta otra vez (ya avanzó) debe ser rechazado
  const ackRepetida = await emit(s1, "responder", { preguntaId: r1.pregunta.id, opcionId: RESPUESTA_CORRECTA_PREGUNTA_1 });
  assert(ackRepetida.ok === false, "no se puede volver a responder una pregunta ya contestada");

  // responder incorrectamente la pregunta 2
  const validadaPromise2 = once(s1, "respuesta_validada");
  await emit(s1, "responder", { preguntaId: siguiente.pregunta.id, opcionId: "a" });
  const validada2 = await validadaPromise2;
  // La pregunta 2 real (id 2) tiene respuesta correcta "c" (will pass); "a" es incorrecta.
  assert(validada2.correcta === false && validada2.score === 1, "desacierto en pregunta 2 no suma puntos: score=" + validada2.score);

  const observado = await emit(s2, "observar", {});
  assert(Array.isArray(observado.ranking), "observar devuelve un ranking (aunque esté vacío antes de finalizar)");
  assert(observado.ranking.length === 0, "el ranking no incluye participantes que no han finalizado (RF-24)");

  // reconexión: nueva conexión con el mismo jugadorId no debe crear un participante duplicado ni perder el progreso
  s1.disconnect();
  await sleep(50);
  const s1b = connect();
  await once(s1b, "connect");
  const r1b = await emit(s1b, "unirse", { nombre: "Carlos", color: "verde", jugadorId: j1id });
  assert(r1b.ok && r1b.jugadorId === j1id, "reconexión reclama el mismo jugadorId");
  assert(r1b.participante.score === 1, "el score se conserva tras la reconexión");
  assert(r1b.pregunta.id === siguiente.pregunta.id + 1, "el progreso (pregunta actual) se conserva tras la reconexión");

  console.log("\nTodas las verificaciones terminaron.");
  s1b.disconnect();
  s2.disconnect();
  process.exit();
})().catch((err) => {
  console.error("ERROR EN TEST:", err);
  process.exit(1);
});
