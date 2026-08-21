const crypto = require("crypto");
const { PREGUNTAS, sanitizarPregunta, TOTAL_PREGUNTAS } = require("./questions");
const { conectarMongo } = require("./db");
const Participante = require("./models/Participante");

const RANKING_VISIBLE = 20;
const MS_ANTES_DE_LIBERAR_COLOR = 8000;

const PALETA = [
  { id: "rojo", nombre: "Rojo", hex: "#e63946" },
  { id: "azul", nombre: "Azul", hex: "#2f6a8f" },
  { id: "verde", nombre: "Verde", hex: "#2f9e44" },
  { id: "amarillo", nombre: "Amarillo", hex: "#f4b400" },
  { id: "naranja", nombre: "Naranja", hex: "#ef6c1a" },
  { id: "morado", nombre: "Morado", hex: "#7b4fd6" },
  { id: "rosa", nombre: "Rosa", hex: "#e0559c" },
  { id: "cian", nombre: "Cian", hex: "#17a2b8" },
  { id: "blanco", nombre: "Blanco", hex: "#f5f5f5" },
  { id: "negro", nombre: "Negro", hex: "#1c1c1c" },
];
const PALETA_IDS = new Set(PALETA.map((c) => c.id));

class EvaluationState {
  constructor() {
    this.participantes = new Map(); // participanteId -> participante
    this.timersDesconexion = new Map(); // participanteId -> Timeout
    this.persistenciaActiva = false;
  }

  // Restaura participantes guardados en MongoDB (si hay MONGODB_URI y Atlas
  // responde) para que el ranking sobreviva a un reinicio del proceso (por
  // ejemplo el spin-down de Render por inactividad). Si no hay persistencia
  // disponible, el servidor sigue funcionando solo en memoria (RNF-17).
  async cargarDesdeMongo() {
    this.persistenciaActiva = await conectarMongo();
    if (!this.persistenciaActiva) return;

    const docs = await Participante.find({}).lean();
    for (const doc of docs) {
      this.participantes.set(doc.id, {
        id: doc.id,
        nombre: doc.nombre,
        color: doc.color,
        preguntaActual: doc.preguntaActual,
        respuestas: doc.respuestas || [],
        aciertos: doc.aciertos,
        desaciertos: doc.desaciertos,
        score: doc.score,
        finalizado: doc.finalizado,
        finalizadoEn: doc.finalizadoEn,
        conectado: false,
        socketId: null,
        ultimaAccion: Date.now(),
      });
    }
    console.log(`SENAEnglish: ${docs.length} participante(s) restaurado(s) desde MongoDB.`);
  }

  // Guarda el estado actual de un participante en MongoDB. Se llama "fire
  // and forget" (sin await) desde unirse()/responder(): la respuesta al
  // socket no debe esperar a Atlas (RNF-13), y un fallo de persistencia no
  // debe romper la partida en curso.
  async _guardarParticipante(participante) {
    if (!this.persistenciaActiva) return;
    try {
      await Participante.findOneAndUpdate(
        { id: participante.id },
        {
          id: participante.id,
          nombre: participante.nombre,
          color: participante.color,
          preguntaActual: participante.preguntaActual,
          respuestas: participante.respuestas,
          aciertos: participante.aciertos,
          desaciertos: participante.desaciertos,
          score: participante.score,
          finalizado: participante.finalizado,
          finalizadoEn: participante.finalizadoEn,
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("SENAEnglish: error guardando participante en MongoDB:", err.message);
    }
  }

  colorEnUso(colorId, excluirId) {
    for (const p of this.participantes.values()) {
      if (p.id === excluirId) continue;
      if (p.conectado && p.color === colorId) return true;
    }
    return false;
  }

  participantesConectados() {
    return [...this.participantes.values()].filter((p) => p.conectado).length;
  }

  serializarParticipante(p) {
    const { id, nombre, color, preguntaActual, aciertos, desaciertos, score, finalizado, conectado, ultimaAccion } = p;
    return { id, nombre, color, preguntaActual, totalPreguntas: TOTAL_PREGUNTAS, aciertos, desaciertos, score, finalizado, conectado, ultimaAccion };
  }

  preguntaActualDe(p) {
    return sanitizarPregunta(PREGUNTAS[p.preguntaActual] || null);
  }

  serializarEstado() {
    return {
      config: { paleta: PALETA, totalPreguntas: TOTAL_PREGUNTAS, rankingVisible: RANKING_VISIBLE },
      participantes: [...this.participantes.values()].map((p) => this.serializarParticipante(p)),
      ranking: this.ranking(),
    };
  }

  ranking() {
    return [...this.participantes.values()]
      .filter((p) => p.finalizado)
      .slice()
      .sort((a, b) => b.score - a.score || b.aciertos - a.aciertos || (a.finalizadoEn || 0) - (b.finalizadoEn || 0))
      .slice(0, RANKING_VISIBLE)
      .map((p) => ({ id: p.id, nombre: p.nombre, color: p.color, aciertos: p.aciertos, score: p.score }));
  }

  unirse({ nombre, color, jugadorId, socketId }) {
    if (jugadorId && this.participantes.has(jugadorId)) {
      const participante = this.participantes.get(jugadorId);
      const timer = this.timersDesconexion.get(jugadorId);
      if (timer) {
        clearTimeout(timer);
        this.timersDesconexion.delete(jugadorId);
      }
      participante.conectado = true;
      participante.socketId = socketId;
      participante.ultimaAccion = Date.now();
      return { ok: true, participante, esNuevo: false };
    }

    const nombreLimpio = String(nombre || "").trim().slice(0, 20);
    if (!nombreLimpio) return { ok: false, motivo: "Ingresa un nombre de usuario." };
    if (!PALETA_IDS.has(color)) return { ok: false, motivo: "Elige un color válido." };
    if (this.colorEnUso(color)) return { ok: false, motivo: "Ese color ya está en uso por otro participante conectado." };

    const participante = {
      id: crypto.randomUUID(),
      nombre: nombreLimpio,
      color,
      preguntaActual: 0,
      respuestas: [],
      aciertos: 0,
      desaciertos: 0,
      score: 0,
      finalizado: false,
      finalizadoEn: null,
      conectado: true,
      socketId,
      ultimaAccion: Date.now(),
    };
    this.participantes.set(participante.id, participante);
    this._guardarParticipante(participante);
    return { ok: true, participante, esNuevo: true };
  }

  // Solo desconecta si "socketId" sigue siendo la conexión activa de ese
  // participante (evita marcar como desconectado a alguien que ya reclamó
  // su sesión en una conexión nueva antes de que llegara el "disconnect"
  // tardío de la conexión vieja).
  desconectar(participanteId, socketId) {
    const participante = this.participantes.get(participanteId);
    if (!participante) return;
    if (socketId && participante.socketId !== socketId) return;
    participante.conectado = false;
    participante.ultimaAccion = Date.now();
    const timer = setTimeout(() => {
      this.timersDesconexion.delete(participanteId);
    }, MS_ANTES_DE_LIBERAR_COLOR);
    this.timersDesconexion.set(participanteId, timer);
  }

  responder(participanteId, preguntaId, opcionId) {
    const participante = this.participantes.get(participanteId);
    if (!participante || !participante.conectado) return { ok: false, motivo: "Participante no encontrado." };
    if (participante.finalizado) return { ok: false, motivo: "La evaluación ya fue finalizada." };

    const pregunta = PREGUNTAS[participante.preguntaActual];
    if (!pregunta || pregunta.id !== Number(preguntaId)) {
      return { ok: false, motivo: "Esa pregunta ya fue respondida o no es la actual." };
    }
    const opcionValida = pregunta.opciones.some((o) => o.id === opcionId);
    if (!opcionValida) return { ok: false, motivo: "Opción inválida." };

    const correcta = pregunta.respuestaCorrecta === opcionId;
    if (correcta) participante.aciertos += 1;
    else participante.desaciertos += 1;
    participante.score = participante.aciertos;
    participante.respuestas.push({ preguntaId: pregunta.id, opcionId, correcta });
    participante.preguntaActual += 1;
    participante.ultimaAccion = Date.now();

    const finalizadaAhora = participante.preguntaActual >= TOTAL_PREGUNTAS;
    if (finalizadaAhora && !participante.finalizado) {
      participante.finalizado = true;
      participante.finalizadoEn = Date.now();
    }

    this._guardarParticipante(participante);

    return {
      ok: true,
      participante,
      correcta,
      opcionCorrectaId: pregunta.respuestaCorrecta,
      siguientePregunta: finalizadaAhora ? null : this.preguntaActualDe(participante),
      finalizado: participante.finalizado,
    };
  }

  resultadoFinal(participanteId) {
    const participante = this.participantes.get(participanteId);
    if (!participante) return { ok: false, motivo: "Participante no encontrado." };
    if (!participante.finalizado) return { ok: false, motivo: "Aún faltan preguntas por responder." };
    const porcentaje = Math.round((participante.aciertos / TOTAL_PREGUNTAS) * 10000) / 100;
    return {
      ok: true,
      resultado: {
        nombre: participante.nombre,
        color: participante.color,
        totalPreguntas: TOTAL_PREGUNTAS,
        aciertos: participante.aciertos,
        desaciertos: participante.desaciertos,
        score: participante.score,
        porcentaje,
      },
    };
  }

  reiniciar() {
    for (const p of this.participantes.values()) {
      p.preguntaActual = 0;
      p.respuestas = [];
      p.aciertos = 0;
      p.desaciertos = 0;
      p.score = 0;
      p.finalizado = false;
      p.finalizadoEn = null;
    }
    if (this.persistenciaActiva) {
      Participante.updateMany(
        {},
        { preguntaActual: 0, respuestas: [], aciertos: 0, desaciertos: 0, score: 0, finalizado: false, finalizadoEn: null }
      ).catch((err) => console.error("SENAEnglish: error reiniciando participantes en MongoDB:", err.message));
    }
  }
}

module.exports = { EvaluationState, PALETA, RANKING_VISIBLE, TOTAL_PREGUNTAS };
