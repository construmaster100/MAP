const mongoose = require("mongoose");

// La persistencia es opcional (RNF-17): si no hay MONGODB_URI, o si Atlas no
// responde, el servidor sigue funcionando solo en memoria en vez de morir.
async function conectarMongo() {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI no está definido — SENAEnglish corre solo en memoria (sin persistencia).");
    return false;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: "senaenglish" });
    console.log("SENAEnglish: MongoDB conectado (persistencia activa).");
    return true;
  } catch (err) {
    console.error("SENAEnglish: no se pudo conectar a MongoDB, sigue solo en memoria:", err.message);
    return false;
  }
}

module.exports = { conectarMongo };
