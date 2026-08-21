const express = require("express");
const router = express.Router();
const Aprendiz = require("../models/Aprendiz");
const Resultado = require("../models/Resultado");

// Guarda el resultado de un cuestionario resuelto dentro de un módulo.
// Crea el aprendiz si todavía no existía (mismo criterio que el ingreso).
router.post("/", async (req, res) => {
  try {
    const { cedula, nombre, modulo, cuestionario, puntaje, totalPreguntas } = req.body;
    if (!cedula || !nombre || !modulo || !cuestionario || puntaje === undefined || totalPreguntas === undefined) {
      return res.status(400).json({
        error: "cedula, nombre, modulo, cuestionario, puntaje y totalPreguntas son obligatorios",
      });
    }

    const aprendiz = await Aprendiz.findOneAndUpdate(
      { cedula },
      { nombre, cedula },
      { new: true, upsert: true, runValidators: true }
    );

    const resultado = await Resultado.create({
      aprendiz: aprendiz._id,
      modulo,
      cuestionario,
      puntaje,
      totalPreguntas,
    });

    res.status(201).json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reporte consolidado para el instructor: puntaje acumulado por aprendiz.
router.get("/reporte/instructor", async (req, res) => {
  try {
    const consolidado = await Resultado.aggregate([
      {
        $group: {
          _id: "$aprendiz",
          cuestionariosResueltos: { $sum: 1 },
          puntajeAcumulado: { $sum: "$puntaje" },
          totalPreguntas: { $sum: "$totalPreguntas" },
          ultimaFecha: { $max: "$createdAt" },
        },
      },
      { $sort: { ultimaFecha: -1 } },
    ]);

    const aprendices = await Aprendiz.find({
      _id: { $in: consolidado.map((fila) => fila._id) },
    });
    const porId = new Map(aprendices.map((a) => [String(a._id), a]));

    const reporte = consolidado.map((fila) => {
      const aprendiz = porId.get(String(fila._id));
      return {
        aprendiz: aprendiz ? aprendiz.nombre : "Desconocido",
        cedula: aprendiz ? aprendiz.cedula : null,
        cuestionariosResueltos: fila.cuestionariosResueltos,
        puntajeAcumulado: fila.puntajeAcumulado,
        totalPreguntas: fila.totalPreguntas,
        porcentaje: fila.totalPreguntas
          ? Math.round((fila.puntajeAcumulado / fila.totalPreguntas) * 100)
          : 0,
        ultimaFecha: fila.ultimaFecha,
      };
    });

    res.json(reporte);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial y puntaje acumulado de un aprendiz puntual.
router.get("/:cedula", async (req, res) => {
  try {
    const aprendiz = await Aprendiz.findOne({ cedula: req.params.cedula });
    if (!aprendiz) return res.status(404).json({ error: "Aprendiz no encontrado" });

    const historial = await Resultado.find({ aprendiz: aprendiz._id }).sort({ createdAt: -1 });

    const acumulado = historial.reduce(
      (acc, r) => {
        acc.puntaje += r.puntaje;
        acc.totalPreguntas += r.totalPreguntas;
        return acc;
      },
      { puntaje: 0, totalPreguntas: 0 }
    );

    res.json({
      aprendiz,
      historial,
      puntajeAcumulado: acumulado.puntaje,
      totalPreguntas: acumulado.totalPreguntas,
      porcentaje: acumulado.totalPreguntas
        ? Math.round((acumulado.puntaje / acumulado.totalPreguntas) * 100)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
