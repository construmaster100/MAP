const mongoose = require("mongoose");

const aprendizSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    cedula: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Aprendiz", aprendizSchema);
