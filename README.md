# SENAEnglish — Sistema de Evaluación Interactiva de Inglés

Aplicación web de evaluación interactiva construida para el SENA: cada participante
ingresa con nombre y color, responde un cuestionario de **30 preguntas** sobre
**IF, THEN, USED TO e INFINITIVE**, y su resultado se sincroniza en tiempo real
con un ranking compartido de hasta **20 participantes**.

Este documento reemplaza el modelo anterior del proyecto (una "cancha
interactiva" de fútbol con grilla 7×10, navegación WASD y marcas X/O). Ese
concepto fue retirado por completo — código, estilos e imágenes — según
[`docs/SENAEnglish_Documento_Requisitos.docx`](docs/SENAEnglish_Documento_Requisitos.docx),
que es la fuente de requisitos vigente para este repositorio.

## Despliegue

| | |
| --- | --- |
| Carpeta local | `D:\FT3P` |
| GitHub | [construmaster100/MAP](https://github.com/construmaster100/MAP), branch `main` |
| Render (en vivo) | https://englishcoding.onrender.com |

Este repositorio es independiente de `construmaster100/AVAsoft` (carpeta local
`D:\cancha interactiva asincronica`, servicio Render `ADSOAVAsoft`) — son dos
proyectos separados que por coincidencia recibieron una implementación similar
de SENAEnglish; no comparten historial ni despliegue.

## Cómo correrlo

```
npm install
npm run dev:game
```

Abre `http://localhost:4000/`. El cuestionario **necesita** el servidor Node
corriendo — Socket.IO es quien sincroniza el ingreso de participantes, valida
cada respuesta y arma el ranking; abrir los `.html` como archivo local no
funciona (ver el aviso que muestra `assets/js/senaenglish-client.js` en ese caso).

Para verificar la lógica del servidor (sin navegador) con el servidor ya corriendo:

```
npm test
```

## Estructura del proyecto

```
index.html                     Login: nombre + color (RF-02, RF-03)
pages/
  quiz.html                    Cuestionario: pregunta + 4 opciones con giro CSS
  resultado.html                Resultado final del participante + ranking (hasta 20)
  administrador.html            Panel de administración: participantes, ranking, reinicio
assets/
  css/style.css                 Estilos (tokens compartidos + login + quiz + paneles de solo lectura)
  js/senaenglish-client.js      Capa de conexión Socket.IO (sesión, unirse, responder, finalizar)
  js/quiz.js                    Lógica del cuestionario (pages/quiz.html)
game-server/
  index.js                      Servidor Express + Socket.IO (eventos, sala única)
  gameState.js                  Estado del servidor: participantes, respuestas, ranking (autoridad)
  questions.js                  Banco de 30 preguntas (IF 8 · THEN 7 · USED TO 7 · INFINITIVE 8)
pruebas/
  test-senaenglish.js           Prueba de flujo por Socket.IO (unirse/responder/reconexión/ranking)
docs/
  SENAEnglish_Documento_Requisitos.docx   Documento de requisitos vigente (fuente de este README)
  documentacion/, validaciones/, animacion/   Entregables de otras fases del proyecto SENA (no forman
                                               parte de la aplicación SENAEnglish; se conservan como
                                               evidencia académica)
server/                         API REST separada (Express + Mongoose) de un entregable previo
                                 del programa ADSO; no la usa SENAEnglish.
```

## Arquitectura

```
GITHUB → SENAEnglish → Node.js + Express → Socket.IO
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                   Usuario 1             Usuario 2             Usuario N
                        └─────────────────────┼─────────────────────┘
                                              ▼
                                  ESTADO DE EVALUACIÓN (servidor)
                                   ├── Cuestionario (30 preguntas)
                                   └── Ranking (20 participantes)
```

El servidor es la única autoridad sobre la pregunta actual, la corrección de
cada respuesta y el score (RNF-06, RNF-07): el cliente nunca recibe la
respuesta correcta de una pregunta hasta después de contestarla.

## Modelo de datos (servidor)

- **Participante**: `id, nombre, color, preguntaActual, respuestas[], aciertos, desaciertos, score, finalizado, conectado`
- **Pregunta**: `id, categoria, texto, opciones[4], respuestaCorrecta` (el campo `respuestaCorrecta` nunca se envía al cliente)
- **Ranking**: top 20 participantes finalizados, ordenados por score descendente, luego aciertos, luego momento de finalización (RF-23)

## Eventos Socket.IO

**Cliente → servidor**

| Evento | Función |
| --- | --- |
| `unirse` | Registrar/reclamar participante (nombre, color) |
| `responder` | Enviar la opción elegida para la pregunta actual |
| `finalizar` | Obtener el resultado final ya calculado (idempotente, útil al recargar `resultado.html`) |
| `observar` | Acceder como observador (ranking + participantes, sin unirse) |

**Servidor → clientes**

| Evento | Función |
| --- | --- |
| `jugador_nuevo` / `jugador_reconectado` / `jugador_desconectado` | Informar cambios de conexión |
| `pregunta_actualizada` | Entregar la siguiente pregunta al participante que acaba de responder |
| `respuesta_validada` | Informar si la respuesta fue acierto o desacierto, y el score actualizado |
| `jugador_actualizado` | Sincronizar el progreso/score de un participante en los paneles laterales |
| `ranking_actualizado` | Nuevo ranking cuando un participante finaliza las 30 preguntas (RF-24) |
| `evaluacion_finalizada` | Resultado final (aciertos, desaciertos, score, porcentaje) para el participante que terminó |

## Reglas de puntuación

- 30 preguntas, 4 opciones cada una, una sola correcta.
- Acierto = 1 punto · Desacierto = 0 puntos · Score máximo = 30.
- `porcentaje = (aciertos / 30) × 100`.
- Un participante no puede responder dos veces la misma pregunta ni modificar
  el resultado una vez finalizada la evaluación.
