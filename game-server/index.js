require("dotenv").config();
const path = require("path");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { EvaluationState } = require("./gameState");

const ROOT = path.join(__dirname, "..");
const PORT = process.env.PORT || 4000;
const SALA = "sena-english";

const app = express();
const server = createServer(app);
const io = new Server(server);

const estado = new EvaluationState();

app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/pages", express.static(path.join(ROOT, "pages")));
app.get(["/", "/index.html"], (req, res) => res.sendFile(path.join(ROOT, "index.html")));

io.on("connection", (socket) => {
  socket.on("observar", (_payload, cb) => {
    socket.join(SALA);
    if (typeof cb === "function") cb(estado.serializarEstado());
  });

  socket.on("unirse", ({ nombre, color, jugadorId } = {}, cb) => {
    const resultado = estado.unirse({ nombre, color, jugadorId, socketId: socket.id });
    if (!resultado.ok) {
      if (typeof cb === "function") cb({ ok: false, motivo: resultado.motivo });
      return;
    }

    const participante = resultado.participante;
    socket.data.jugadorId = participante.id;
    socket.join(SALA);

    if (typeof cb === "function") {
      cb({
        ok: true,
        jugadorId: participante.id,
        participante: estado.serializarParticipante(participante),
        pregunta: estado.preguntaActualDe(participante),
        config: estado.serializarEstado().config,
        ranking: estado.ranking(),
      });
    }
    if (resultado.esNuevo) {
      socket.to(SALA).emit("jugador_nuevo", estado.serializarParticipante(participante));
    } else {
      socket.to(SALA).emit("jugador_reconectado", estado.serializarParticipante(participante));
    }
  });

  socket.on("responder", ({ preguntaId, opcionId } = {}, cb) => {
    const jugadorId = socket.data.jugadorId;
    if (!jugadorId) {
      if (typeof cb === "function") cb({ ok: false, motivo: "Debes ingresar antes de responder." });
      return;
    }

    const resultado = estado.responder(jugadorId, Number(preguntaId), opcionId);
    if (!resultado.ok) {
      if (typeof cb === "function") cb({ ok: false, motivo: resultado.motivo });
      return;
    }

    if (typeof cb === "function") cb({ ok: true });

    const respuestaPayload = {
      preguntaId: Number(preguntaId),
      opcionId,
      correcta: resultado.correcta,
      opcionCorrectaId: resultado.opcionCorrectaId,
      aciertos: resultado.participante.aciertos,
      desaciertos: resultado.participante.desaciertos,
      score: resultado.participante.score,
    };
    socket.emit("respuesta_validada", respuestaPayload);
    io.to(SALA).emit("jugador_actualizado", estado.serializarParticipante(resultado.participante));

    if (resultado.finalizado) {
      const final = estado.resultadoFinal(jugadorId);
      if (final.ok) socket.emit("evaluacion_finalizada", final.resultado);
      io.to(SALA).emit("ranking_actualizado", estado.ranking());
    } else {
      socket.emit("pregunta_actualizada", { pregunta: resultado.siguientePregunta, preguntaActual: resultado.participante.preguntaActual });
    }
  });

  socket.on("finalizar", (_payload, cb) => {
    const jugadorId = socket.data.jugadorId;
    if (!jugadorId) {
      if (typeof cb === "function") cb({ ok: false, motivo: "Debes ingresar antes de finalizar." });
      return;
    }
    const final = estado.resultadoFinal(jugadorId);
    if (typeof cb === "function") cb(final);
  });

  socket.on("admin_reiniciar", () => {
    estado.reiniciar();
    io.to(SALA).emit("estado_inicial", estado.serializarEstado());
  });

  socket.on("disconnect", () => {
    const jugadorId = socket.data.jugadorId;
    if (!jugadorId) return;
    estado.desconectar(jugadorId, socket.id);
    io.to(SALA).emit("jugador_desconectado", { id: jugadorId });
  });
});

estado.cargarDesdeMongo().finally(() => {
  server.listen(PORT, () => {
    console.log(`SENAEnglish escuchando en http://localhost:${PORT}`);
  });
});
