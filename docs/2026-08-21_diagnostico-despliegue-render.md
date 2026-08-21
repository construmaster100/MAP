# Diagnóstico y corrección de despliegue en Render — 2026-08-21

## Contexto

En el dashboard de Render aparecían dos servicios (`englishcoding` y
`ADSOAVAsoft`) mostrando el mismo contenido (el login de SENAEnglish), lo que
parecía un error de configuración cruzada entre ellos.

## Diagnóstico

Revisando la pestaña "Settings" de cada servicio en Render se confirmó que
son **dos proyectos independientes**, cada uno con su propio repositorio de
GitHub:

| Servicio Render | Repo GitHub | Branch | Carpeta local |
| --- | --- | --- | --- |
| `englishcoding` | `construmaster100/MAP` | `main` | `D:\FT3P` |
| `ADSOAVAsoft` | `construmaster100/AVAsoft` | `cancha-svg-viewport` | `D:\cancha interactiva asincronica` |

Ambos repos recibieron —en sesiones de trabajo distintas— una implementación
similar del cuestionario SENAEnglish, por eso coincidían en apariencia sin
estar realmente relacionados ni compartir historial de git.

Se encontraron además dos problemas concretos:

1. **`package.json` de `MAP`**: el script `"start"` apuntaba a
   `server/server.js` (un API REST viejo del programa ADSO, con el puerto
   hardcodeado a `3000` en vez de leer `process.env.PORT`), no al
   `game-server/index.js` que sirve SENAEnglish. Si Render usaba el Start
   Command por defecto (`npm start`) en `englishcoding`, estaba sirviendo la
   app equivocada.
2. **Carpeta local de AVAsoft** (`D:\cancha interactiva asincronica`): no
   tenía `.git` — no estaba conectada a ningún repositorio. Su contenido
   correspondía a una versión desactualizada, anterior al commit `219ad07`
   que reemplazó la "cancha interactiva CR7" por SENAEnglish en ese repo
   (le faltaban `shared/`, `client/`, `server/sockets/`, entre otros).

## Corrección aplicada

1. `package.json` (`MAP`): `"start"` ahora corre `game-server/index.js`; el
   comando viejo quedó disponible como `npm run start:adso`.
   Commit `01d0f7c`, branch `main`.
2. Carpeta `D:\cancha interactiva asincronica` reconectada a
   `construmaster100/AVAsoft`:
   - `git init` + `git remote add origin` + `git fetch`.
   - Archivos locales viejos (untracked, desactualizados) movidos a
     `D:\AVAsoft-local-backup-2026-08-21` — nada se borró.
   - `git checkout -b cancha-svg-viewport origin/cancha-svg-viewport` para
     traer el estado real que corre en producción.
3. `README.md` de ambos repos: se agregó una sección "Despliegue" con la
   carpeta local, el repo/branch de GitHub y la URL de Render de cada
   proyecto, dejando explícito que son proyectos independientes.
   Commits `f2ee402` (`MAP`/`main`) y `bd1ccc5`
   (`AVAsoft`/`cancha-svg-viewport`).
4. Push de ambos commits a sus respectivos remotos; Render tiene
   auto-deploy activo en los dos servicios, así que cada push dispara un
   redeploy automático.

## Estructura definitiva

```
englishcoding    ↔ D:\FT3P                            ↔ construmaster100/MAP (main)
                                                        ↔ https://englishcoding.onrender.com

ADSOAVAsoft      ↔ D:\cancha interactiva asincronica   ↔ construmaster100/AVAsoft (cancha-svg-viewport)
                                                        ↔ https://adsoavasoft.onrender.com
```
