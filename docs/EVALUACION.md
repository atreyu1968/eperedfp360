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

Las funciones puras de evaluación están en `src/evaluation.cjs`; el historial se registra en SQLite. La recepción automática de resultados de los 20 HTML originales está incorporada mediante el adaptador de lectura de notas finalizadas; queda pendiente comprobar el funcionamiento extremo a extremo en el ejecutable de Windows con los contenidos importados.

## Entrada de calificaciones

El panel permite notas docentes validadas por criterio y la importación de CSV de aplicaciones compatibles. Una nota calculada automáticamente no se impone como nota definitiva sin validación.

El historial conserva calificaciones de evaluación ordinaria y de recuperación. Cuando están presentes ambos instrumentos, el motor aplica provisionalmente 60 % portafolio/práctica y 40 % prueba objetiva, sin sobrescribir uno con el otro. Si solo existe uno, el CE queda «parcial», no «suspendido». La calificación final del CE registrada expresamente por el docente tiene prioridad. Una recuperación validada posterior sustituye la nota del CE recuperado. Estas reglas deberán contrastarse con la programación aprobada antes de uso oficial.

Una recuperación con una nota validada igual o superior a 5 cierra el estado «pendiente» del plan. El umbral y la regla concreta de superación se revisarán conforme a la programación aprobada del departamento.

## Protección específica del RA7

Aunque se disponga de resultados de portafolio y prueba objetiva, el RA7 no se declara superado automáticamente: requiere que los CE cuenten con valoración final docente del desempeño. La prueba escrita por sí sola no acredita cooperación, respeto, proactividad o trabajo en equipo.
