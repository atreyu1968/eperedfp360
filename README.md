# EPE FP360 Portable

Aplicación de escritorio para **Empresa en el Aula (0446)**, CFGM Gestión Administrativa, Canarias · Curso 2026–2027.

## Estado

**Fase inicial de integración.** Este repositorio se ha destinado a la aplicación unificada. No hay todavía un ejecutable Windows publicado ni se ha realizado una auditoría de seguridad. El desarrollo se estructura para integrar las 7 unidades y las 20 aplicaciones HTML ya elaboradas, sin publicar soluciones docentes por accidente.

## Alcance del proyecto

- 7 resultados de aprendizaje y 49 criterios de evaluación.
- 2.552 actividades de portafolio en los materiales originales de UD1–UD7.
- 13 pruebas objetivas locales, incluidos los bancos de preguntas de cada unidad.
- Calculadora flotante mediante Alt + Mayús + C.
- Gestión de alumnado, resultados por RA/CE y recuperación de criterios pendientes.
- Autorizaciones docentes firmadas para desbloquear actividades, bloques y exámenes.
- Almacenamiento local y exportación de evidencias y resultados.
- Empaquetado portable para Windows 10 y 11, sin instalación ni acceso a Internet.

## Estructura prevista

```
src/             Aplicación Electron (proceso principal, interfaz, seguridad)
content/         HTML didácticos del alumnado importados localmente
scripts/         Importación del contenido, gestión de claves y comprobaciones
.github/workflows/ Compilación de Windows portable
docs/            Arquitectura y criterios de evaluación
```

## Advertencia importante

Los HTML originales son aplicaciones autónomas. Su integración en un lanzador **no implementa por sí sola bloqueo individual dentro de cada actividad**. El desbloqueo de cada actividad y la consolidación de calificaciones requieren un adaptador específico por unidad y validación docente. Las restricciones locales de un examen no constituyen una defensa infalible contra manipulación.

**No incorporar al paquete del alumnado** los bancos de soluciones CSV/ZIP del profesorado.

## Siguientes entregables

1. Base Electron y manifiesto de las siete unidades.
2. Importador verificable de los 20 HTML ya creados.
3. Almacenamiento SQLite local y cálculo de criterios pendientes.
4. Sistema de tokens offline Ed25519 (clave privada solo en poder del docente).
5. Panel de profesorado, importación de resultados y recuperación individualizada.
6. Publicación de portable Windows mediante GitHub Actions.

Consulta `docs/ARQUITECTURA.md` y `docs/EVALUACION.md` al incorporar esos componentes.
