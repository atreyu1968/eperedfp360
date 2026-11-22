# Arquitectura inicial

## Aplicación única

Shell Electron de escritorio. El proceso principal controla la creación de ventanas, la lectura de contenidos y el acceso a SQLite. El renderer no tiene acceso directo a Node.js, al sistema de archivos ni a la clave privada docente.

- `src/main.cjs`: proceso principal y lanzamiento.
- `src/preload.cjs`: API mínima permitida a la interfaz.
- `src/ui/`: portada y navegación por las siete unidades.
- `src/evaluation.cjs`: ponderaciones y diagnóstico de CE pendientes.
- `src/database.cjs`: resultados, evidencias y planes de recuperación.
- `src/security.cjs`: verificación offline de permisos firmados.
- `scripts/`: importación de los HTML y generación de claves.

## Reglas de seguridad

El profesor genera un par Ed25519; el ejecutable del alumnado recibe **solo la clave pública**. La clave privada jamás se incorpora al repositorio, al instalador o al ordenador del alumno. Los permisos incluyen alumno, unidad, recurso, caducidad e identificador de emisión. Los permisos pueden ser copiados: no hay revocación global sin servidor; se requieren controles de sesión y supervisión.

El profesor mantiene aparte los CSV de soluciones; no deben distribuirse con el lanzador.

## Nota sobre integración

Esta fase solo incluye el **lanzador y la infraestructura común**. Los HTML de las siete unidades son aplicaciones autónomas. Para habilitar bloqueo por *cada actividad interna* y recibir automáticamente las calificaciones hay que incorporar un adaptador por unidad que comunique las acciones de cada HTML con el proceso principal. Sin esos adaptadores, el permiso abre una aplicación completa, no una sola pregunta.

## Empaquetado

`npm install`, `npm run import:content -- --source=RUTA`, configurar `curriculum/teacher-public.pem` y `npm run build:win`. La compilación portable debe realizarse en Windows. GitHub Actions puede generar un artefacto en ese sistema, pero la versión sin firma comercial no evita todos los avisos SmartScreen.

## Estado

Arquitectura de partida, todavía no versión final para realizar evaluaciones oficiales sin supervisión.
