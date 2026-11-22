# EPE FP360 Portable

Aplicación de escritorio para **Empresa en el Aula (0446)**, CFGM Gestión Administrativa, Canarias · Curso 2026–2027.

## Estado

**Fase 3: panel docente, recuperación, importación CSV y autorización granular de actividades implementados a nivel de código fuente.** Este repositorio se ha destinado a la aplicación unificada. No hay todavía un ejecutable Windows publicado ni se ha realizado una auditoría de seguridad. El desarrollo se estructura para integrar las 7 unidades y las 20 aplicaciones HTML ya elaboradas, sin publicar soluciones docentes por accidente.

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

## Avance 22/11/2026: panel docente

- Configuración inicial y acceso con contraseña local protegida con scrypt.
- Consulta del expediente por alumno, RA y CE, con distinción entre «pendiente» y «sin evaluar».
- Registro de calificaciones ordinarias o de recuperación, sin borrar el historial.
- Asignación de planes de recuperación por criterio y validación docente.
- Emisión de autorizaciones Ed25519 mediante clave privada externa y cifrada.
- Previsualización de CSV exportados por portafolios originales (UD1, UD2, UD5, UD6, UD7) y examen UD4. La importación solo se incorpora tras confirmación expresa del docente; hay deduplicación por SHA-256.
- Batería de pruebas de lógica (currículo, evaluación, importación y criptografía) y flujo de calidad GitHub Actions.

**Contenido:** para no publicar bancos de respuestas en abierto, los 20 HTML originales se aportan mediante ZIP separado. Pueden importarse con `npm run import:content -- --source=...`.

**Limitaciones:** la compilación Windows sigue sin verificarse. La autorización actual habilita un HTML completo; el bloqueo de **cada actividad dentro de ese HTML** y la integración automática de resultados de todos los formatos requieren adaptadores específicos. El CSV no tiene firma verificable y puede alterarse antes de importarse. El profesor debe contrastarlo.

## Avance de fase 3: permisos de actividades

El código ahora puede autorizar un portafolio completo, un criterio o una actividad individual de cualquiera de los siete RA. Los adaptadores de interfaz cubren los formatos de UD1–UD7; un token firmado por criterio o actividad abre también el recurso correspondiente sin necesitar otro token.

- Alcance docente: recurso, portafolio, criterio y actividad.
- Verificación offline Ed25519.
- Sesiones de navegador aisladas por identificador de alumno.
- Comprobación de actividades visibles y bloqueo sobre la interfaz, incluido el modo pantalla completa.
- Pruebas de currículo para los 2.552 IDs de actividad y detección de los siete formatos.
- Compilación Windows de vista previa automatizada en GitHub Actions.

La garantía es **disuasoria**, no anticopia: los HTML son ficheros locales y no impiden que alguien acceda a su código fuera del lanzador. Los códigos y las contraseñas no sustituyen la supervisión.

No se han integrado aún físicamente los 20 HTML en el repositorio público: se importan desde el paquete ZIP de contenido entregado por separado.
