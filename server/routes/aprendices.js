const express = require("express");
const router = express.Router();
const Aprendiz = require("../models/Aprendiz");

// Registra el ingreso de un aprendiz (nombre + cédula), o actualiza su nombre si ya existía.
router.post("/", async (req, res) => {
  try {
    const { nombre, cedula } = req.body;
    if (!nombre || !cedula) {
      return res.status(400).json({ error: "nombre y cedula son obligatorios" });
    }

    const aprendiz = await Aprendiz.findOneAndUpdate(
      { cedula },
      { nombre, cedula },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(aprendiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:cedula", async (req, res) => {
  try {
    const aprendiz = await Aprendiz.findOne({ cedula: req.params.cedula });
    if (!aprendiz) return res.status(404).json({ error: "Aprendiz no encontrado" });
    res.json(aprendiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
