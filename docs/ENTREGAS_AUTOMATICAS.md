# Recepción automática de entregas y calificaciones

**Estado:** fase 4 de integración en el código fuente. Las pruebas del núcleo y la compilación de vista previa no sustituyen las pruebas funcionales del EXE con los 20 contenidos.

## 1. Funcionamiento con el alumnado

1. Introducir el identificador del alumno en EPE FP360.
2. Abrir un portafolio o examen con un código docente válido.
3. Trabajar normalmente: el HTML original realiza el guardado local y la autocorrección.
4. **Al finalizar y cerrar el intento dentro del HTML**, EPE FP360 consulta las notas de CE y registra una **propuesta pendiente** en la base SQLite. No reescribe el HTML, no modifica la fórmula original ni atribuye autenticidad criptográfica a la entrega.
5. Si el profesor trabaja en ese mismo ordenador y con la misma base local, encontrará la entrega directamente en su bandeja.
6. Si el profesor está en otro ordenador, utilizar el botón «Guardar mis entregas para el profesor (JSON)», entregar el archivo resultante y conservar copia. El paquete reúne las entregas detectadas de ese alumno.

La aplicación no puede enviar datos espontáneamente de un ordenador sin conexión a otro: **el intercambio offline necesita mover el archivo JSON** mediante una memoria USB o un recurso autorizado del centro.

## 2. Funcionamiento con el profesorado

1. Iniciar sesión en «Panel del profesorado».
2. Abrir «Bandeja de entregas recibidas».
3. Pulsar «Actualizar bandeja». Si las entregas proceden de otros equipos, seleccionar «Importar paquetes de varios alumnos».
4. Revisar el identificador real del alumno, su nombre declarado en el HTML, el recurso, la sesión y las notas por CE.
5. Comprobar las evidencias profesionales (especialmente RA7) y el informe original cuando resulte necesario.
6. Elegir evaluación ordinaria o recuperación y escribir observaciones.
7. **Validar** o **descartar** cada entrega. Solo la validación docente escribe calificaciones en el expediente. Se conservan los resultados anteriores.
8. Consultar el RA: la aplicación recalcula criterios pendientes y la propuesta de recuperación.

## 3. Datos conservados

Cada entrega tiene:
- identificador introducido en el lanzador;
- recurso y RA;
- identificador de sesión, fecha de cierre y recepción;
- nombre e identificador declarados por la página (no verificados);
- instrumento (portafolio/prueba);
- desglose de notas por criterio;
- estado: pendiente, aprobada o descartada;
- fecha y observaciones de validación docente.

El paquete transportable JSON incluye **propuestas**, no contraseña docente ni claves privadas. No contiene el banco íntegro de respuestas o la documentación redactada por el alumno; para revisar evidencias profesionales sigue siendo necesario solicitar el portafolio y sus informes.

## 4. Integridad, privacidad y limitaciones

- La captura se efectúa sobre el HTML finalizado que se está ejecutando en Electron. Los resultados de un HTML local **no son prueba de identidad ni de autoría**.
- La fecha del dispositivo y la corrección original pueden manipularse. La validación del profesor es obligatoria.
- Se comprueba que cada entrega corresponde a uno de los 20 recursos, tiene la cantidad correcta de criterios, calificaciones entre 0 y 10 y fechas válidas.
- Se rechazan sesiones duplicadas mediante la combinación alumno + recurso + sesión.
- No se mezclan automáticamente los perfiles de distintos alumnos en la misma instalación.
- No debe publicarse un paquete de entregas en repositorios abiertos, por tratarse de datos personales del alumnado.
- El módulo NO da por superado un criterio del RA7 sin revisar las evidencias profesionales de trabajo en equipo.

## 5. Compatibilidad de los 20 recursos

| Unidad | Portafolio | Pruebas objetivas |
|---|---|---|
| UD1 | Función grade() y estado finalized | Función grading() |
| UD2 | grade() y finalized | grading() |
| UD3 | gradeAll() y finalized | grades() y finished |
| UD4 | grade() y finalized | scoreAll() y finalized |
| UD5 | grade() y finalized | grading() |
| UD6 | grade() y finalized | grading() |
| UD7 | grade() y finalized | grading() |

El examen original de 150 preguntas de UD3 utiliza \`seed + startedAt\` para identificar la sesión, en lugar de un ID propio. El adaptador contempla esa excepción.

## 6. Validación técnica

- Pruebas unitarias del motor de normalización de calificaciones y control de CE.
- Pruebas de SQLite para recepción, deduplicación y confirmación docente.
- Revisión de sintaxis de los componentes y correspondencia de los controles de la interfaz.
- Comprobación en Chromium de los métodos de calificación de los HTML originales, sin utilizar notas reales de estudiantes.

**Pendiente:** pruebas de extremo a extremo dentro del EXE con los veinte HTML importados y simulación de dos ordenadores Windows independientes.
