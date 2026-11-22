# Evaluación y recuperación

La aplicación usa los **49 criterios** y las ponderaciones previstas en la programación de Empresa en el Aula, Canarias, 2026–2027. Fuente de trabajo: programación del módulo 0446 utilizada en el proyecto.

## Normas funcionales

- Se guarda cada evidencia con alumno, RA, CE, instrumento, fecha e identificador.
- Portafolio y prueba objetiva son instrumentos distintos; ninguna nota automática sustituye la observación práctica cuando el CE exige desempeño real.
- Para una prueba objetiva: acierto +1; error −0,5; sin responder 0. La puntuación se lleva a escala 0–10; los valores negativos se limitan a 0.
- Se distinguen «criterio sin evaluar» y «criterio evaluado no superado».
- El umbral de recuperación por CE es **configurable**. En el prototipo se usa 5/10, pendiente de validación departamental.
- **No se borran las notas previas**: las recuperaciones añaden nuevas evidencias y requieren validación del profesor.
- Un RA no se marca como superado solamente por responder cuestiones teóricas si sus criterios requieren evidencias prácticas.
- Las recuperaciones se asignan por CE, no mediante repetición automática de una unidad completa.

## Ponderaciones RA (%)

| RA | CE, por orden a... |
|---|---|
| RA1 | 15, 20, 15, 20, 10, 20 |
| RA2 | 15, 10, 15, 10, 10, 10, 15, 15 |
| RA3 | 15, 15, 15, 15, 20, 20 |
| RA4 | 15, 15, 15, 15, 15, 10, 15 |
| RA5 | 15, 20, 15, 15, 15, 20 |
| RA6 | 15, 15, 15, 20, 20, 15 |
| RA7 | 10, 8, 10, 10, 10, 10, 10, 12, 10, 10 |

En RA7 y en las actividades de comunicación/negociación, la calificación debe incorporar observaciones docentes y no solo cuestiones cerradas.

## Criterios pendientes

El informe permite detectar los CE con nota vigente inferior al umbral y los CE aún sin evidencias. Solo el profesorado valida la calificación de recuperación.

## Implementación

Las funciones puras de evaluación están en `src/evaluation.cjs`; el historial se registra en SQLite. La integración automática de resultados a partir de los HTML originales necesita adaptadores por aplicación.
