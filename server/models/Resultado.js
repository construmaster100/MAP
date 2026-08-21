const mongoose = require("mongoose");

const resultadoSchema = new mongoose.Schema(
  {
    aprendiz: { type: mongoose.Schema.Types.ObjectId, ref: "Aprendiz", required: true },
    modulo: { type: String, required: true, trim: true },
    cuestionario: { type: String, required: true, trim: true },
    puntaje: { type: Number, required: true },
    totalPreguntas: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resultado", resultadoSchema);
