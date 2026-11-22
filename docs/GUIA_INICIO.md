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
