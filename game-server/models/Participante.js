const mongoose = require("mongoose");

const respuestaSchema = new mongoose.Schema(
  {
    preguntaId: { type: Number, required: true },
    opcionId: { type: String, required: true },
    correcta: { type: Boolean, required: true },
  },
  { _id: false }
);

const participanteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true, trim: true },
    color: { type: String, required: true },
    preguntaActual: { type: Number, default: 0 },
    respuestas: { type: [respuestaSchema], default: [] },
    aciertos: { type: Number, default: 0 },
    desaciertos: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    finalizado: { type: Boolean, default: false },
    finalizadoEn: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Participante", participanteSchema);
