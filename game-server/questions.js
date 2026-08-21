/* Banco de 30 preguntas de SENAEnglish — IF (8), THEN (7), USED TO (7),
   INFINITIVE (8), tal como se especifica en
   docs/SENAEnglish_Documento_Requisitos.docx, sección 9.
   Cada pregunta vive solo en el servidor: el cliente nunca recibe
   "respuestaCorrecta" (ver sanitizarPregunta en gameState.js / RNF-06). */

function opciones(a, b, c, d) {
  return [
    { id: "a", texto: a, imagen: null },
    { id: "b", texto: b, imagen: null },
    { id: "c", texto: c, imagen: null },
    { id: "d", texto: d, imagen: null },
  ];
}

const PREGUNTAS = [
  { id: 1, categoria: "IF", texto: "If it rains tomorrow, we ______ at home.", opciones: opciones("stay", "will stay", "stayed", "to stay"), respuestaCorrecta: "b" },
  { id: 2, categoria: "IF", texto: "If I study every day, I ______ the exam.", opciones: opciones("pass", "passed", "will pass", "to pass"), respuestaCorrecta: "c" },
  { id: 3, categoria: "IF", texto: "If she ______ early, she will catch the bus.", opciones: opciones("leaves", "left", "leaving", "to leave"), respuestaCorrecta: "a" },
  { id: 4, categoria: "IF", texto: "If they have enough money, they ______ a new computer.", opciones: opciones("bought", "buy", "will buy", "to buy"), respuestaCorrecta: "c" },
  { id: 5, categoria: "IF", texto: "If you heat water to 100°C, it ______.", opciones: opciones("boiled", "boils", "will boiling", "to boil"), respuestaCorrecta: "b" },
  { id: 6, categoria: "IF", texto: "If he works hard, he ______ more money.", opciones: opciones("earns", "earned", "to earn", "earning"), respuestaCorrecta: "a" },
  { id: 7, categoria: "IF", texto: "If we finish early, we ______ you.", opciones: opciones("called", "calling", "will call", "to call"), respuestaCorrecta: "c" },
  { id: 8, categoria: "IF", texto: "If I ______ time tonight, I will read the book.", opciones: opciones("have", "had", "having", "to have"), respuestaCorrecta: "a" },

  { id: 9, categoria: "THEN", texto: "If you study, then you ______ the lesson better.", opciones: opciones("understand", "understood", "understanding", "to understand"), respuestaCorrecta: "a" },
  { id: 10, categoria: "THEN", texto: "Choose the correct sentence.", opciones: opciones("If I finish, then I will call you.", "If I finish, then I called you.", "If I finish, then calling you.", "If I finish, then to call you."), respuestaCorrecta: "a" },
  { id: 11, categoria: "THEN", texto: "If we leave now, then we ______ arrive on time.", opciones: opciones("will", "would", "were", "to"), respuestaCorrecta: "a" },
  { id: 12, categoria: "THEN", texto: "If she is tired, then she ______ go to bed early.", opciones: opciones("should", "to", "going", "went"), respuestaCorrecta: "a" },
  { id: 13, categoria: "THEN", texto: "If it is cold, then ______ a jacket.", opciones: opciones("wear", "wearing", "to wearing", "wore"), respuestaCorrecta: "a" },
  { id: 14, categoria: "THEN", texto: "Which sentence uses “then” correctly?", opciones: opciones("If you finish your work, then you can leave.", "If you finish your work, then leaving.", "If you finish your work, then to leave.", "If you finish your work, then left."), respuestaCorrecta: "a" },
  { id: 15, categoria: "THEN", texto: "If he arrives late, then we ______ without him.", opciones: opciones("start", "started", "starting", "to start"), respuestaCorrecta: "a" },

  { id: 16, categoria: "USED TO", texto: "I ______ play soccer when I was a child.", opciones: opciones("use to", "used to", "using to", "used"), respuestaCorrecta: "b" },
  { id: 17, categoria: "USED TO", texto: "She ______ live in Bogotá, but now she lives in Tunja.", opciones: opciones("used to", "use to", "using to", "used"), respuestaCorrecta: "a" },
  { id: 18, categoria: "USED TO", texto: "We ______ visit our grandparents every weekend.", opciones: opciones("used to", "use", "using", "used"), respuestaCorrecta: "a" },
  { id: 19, categoria: "USED TO", texto: "Which sentence is correct?", opciones: opciones("He used to work here.", "He use to worked here.", "He used working here.", "He using to work here."), respuestaCorrecta: "a" },
  { id: 20, categoria: "USED TO", texto: "I didn't ______ drink coffee when I was younger.", opciones: opciones("used to", "use to", "using to", "used"), respuestaCorrecta: "b" },
  { id: 21, categoria: "USED TO", texto: "Did you ______ play basketball at school?", opciones: opciones("used to", "use to", "using to", "used"), respuestaCorrecta: "b" },
  { id: 22, categoria: "USED TO", texto: "They ______ have a small house, but now they have a large one.", opciones: opciones("used to", "use to", "using to", "used"), respuestaCorrecta: "a" },

  { id: 23, categoria: "INFINITIVE", texto: "I want ______ English.", opciones: opciones("learn", "learning", "to learn", "learned"), respuestaCorrecta: "c" },
  { id: 24, categoria: "INFINITIVE", texto: "She decided ______ a new language.", opciones: opciones("study", "studying", "to study", "studied"), respuestaCorrecta: "c" },
  { id: 25, categoria: "INFINITIVE", texto: "We need ______ early tomorrow.", opciones: opciones("leave", "leaving", "to leave", "left"), respuestaCorrecta: "c" },
  { id: 26, categoria: "INFINITIVE", texto: "He wants ______ a doctor.", opciones: opciones("become", "becoming", "to become", "became"), respuestaCorrecta: "c" },
  { id: 27, categoria: "INFINITIVE", texto: "They hope ______ the competition.", opciones: opciones("win", "winning", "to win", "won"), respuestaCorrecta: "c" },
  { id: 28, categoria: "INFINITIVE", texto: "I would like ______ some water.", opciones: opciones("drink", "drinking", "to drink", "drank"), respuestaCorrecta: "c" },
  { id: 29, categoria: "INFINITIVE", texto: "She plans ______ English next year.", opciones: opciones("study", "studying", "to study", "studied"), respuestaCorrecta: "c" },
  { id: 30, categoria: "INFINITIVE", texto: "We agreed ______ together.", opciones: opciones("work", "working", "to work", "worked"), respuestaCorrecta: "c" },
];

function sanitizarPregunta(pregunta) {
  if (!pregunta) return null;
  const { id, categoria, texto, opciones: opts } = pregunta;
  return {
    id,
    categoria,
    texto,
    opciones: opts.map(({ id: opId, texto: opTexto, imagen }) => ({ id: opId, texto: opTexto, imagen })),
  };
}

module.exports = { PREGUNTAS, sanitizarPregunta, TOTAL_PREGUNTAS: PREGUNTAS.length };
