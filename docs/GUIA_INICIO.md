# Primer arranque para desarrolladores y docentes

**Importante:** este es un prototipo de integración, no el producto terminado.

1. Instale Node.js 24 en un equipo Windows 10/11.
2. Clone el repositorio y ejecute \`npm install\`.
3. Descomprima en una carpeta la colección previamente creada con los HTML de las siete unidades; ejecute \`npm run import:content -- --source="C:\\RUTA\\A\\LA\\COLECCION"\`. Debe reconocer 20 aplicaciones. Los CSV y ZIP de soluciones quedan fuera.
4. Configure una frase de paso en la variable de entorno \`EPE_TEACHER_KEY_PASSWORD\` (14 caracteres o más) y ejecute \`node scripts/generate-teacher-keys.mjs\`.
5. Guarde \`teacher-secrets/private.pem\` en una ubicación segura y distinta del equipo de alumnado. **No la suba nunca a GitHub.**
6. Ejecute \`npm start\` y compruebe que aparecen los 20 recursos.
7. Para emitir un permiso de prueba: \`node scripts/issue-permission.mjs --student=GA2-015 --resource=UD1-PORTAFOLIO --hours=48\`. Introduzca el código completo en la interfaz del alumno.
8. Para empaquetar en un Windows con las aplicaciones importadas y clave pública configurada: \`npm run build:win\`.

## Limitaciones actuales

- El permiso se verifica para abrir el HTML de un portafolio o examen completo, **no una actividad interna individual**. Los adaptadores detallados son una fase pendiente.
- No se importan aún automáticamente las calificaciones de los HTML de origen a SQLite; los cálculos y las tablas están preparados, pero falta la pasarela.
- No existe todavía una interfaz docente final para emitir códigos o validar recuperaciones; la emisión provisional se efectúa mediante script de línea de comandos.
- El portable sin firmar puede provocar advertencias del sistema operativo.
- GitHub Actions genera **solo una vista previa del shell sin contenidos**, porque los HTML y la clave pública no se incluyen en el repositorio.
- No puede garantizarse una única oportunidad de examen en ordenadores distintos sin un control central o supervisión.

El docente debe aplicar las reglas de evaluación aprobadas en su programación.

## Panel docente disponible en el código actual

1. En el primer arranque configure una contraseña de 14 caracteres o más. Hágalo **antes de distribuir** la aplicación al alumnado. La primera persona con acceso al perfil sin inicializar podría crear la contraseña.
2. Acceda con esa contraseña en el apartado «Panel del profesorado».
3. Seleccione un identificador de alumno para ver las notas vigentes por RA/CE.
4. Para registrar una evaluación, elija el CE, la nota de 0 a 10, instrumento y modalidad. Cada entrada mantiene la traza de su fecha e instrumento.
5. Para recuperar, elija el RA y pulse «Asignar criterios pendientes». No se asignan como suspendidos los criterios «sin evaluar»; estos requieren primero una evidencia y decisión docente.
6. Para emitir un código: seleccione alumno y recurso, introduzca las horas y la contraseña de la clave privada y elija el PEM cifrado desde el diálogo del sistema. Solo se necesita la clave privada en el ordenador del profesor.
7. Para importar notas originales, seleccione un alumno y pulse «Seleccionar CSV». Compruebe las notas de la vista previa y confirme explícitamente. El CSV **no contiene garantía de autenticidad ni identifica por sí solo al alumno**.
8. Cierre la sesión docente al terminar. Se bloquea por inactividad tras 20 minutos.

### Compatibilidad de informes

Los CSV de portafolio de las unidades 1, 2, 5, 6 y 7, y el CSV del examen UD4, pueden importarse con confirmación. Los informes HTML/PDF, copias de progreso JSON y los exámenes de otras unidades aún deben integrarse mediante adaptadores específicos. Hasta entonces, pueden registrarse notas manualmente desde el panel.

### Contenido didáctico

El repositorio **no incluye los 20 archivos HTML**: cada HTML local incorpora su lógica y sus respuestas, por lo que publicarlo en GitHub haría muy fácil distribuir el banco. Utilice el ZIP separado `EPE_FP360_20_APLICACIONES_ALUMNADO_IMPORTACION.zip` y descomprímalo dentro del repositorio, conservando la estructura `content/ud1` … `content/ud7`.

La salida GitHub Actions de «Compilar portable Windows (vista previa)», cuando se ejecute, es solo una versión sin esos contenidos. Compile la edición completa en un equipo Windows tras importar los 20 HTML y configurar la clave pública.
