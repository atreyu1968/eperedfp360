# Contenido privado de EPE FP360

Este directorio recibirá **una sola vez** el archivo:

\`EPE_FP360_20_APLICACIONES_ALUMNADO_IMPORTACION.zip\`

El contenido procede del paquete generado para las siete unidades de 2026–2027. Contiene 20 HTML (7 portafolios + 13 pruebas objetivas).

**No lo subas mientras el repositorio sea público:** contiene preguntas y claves de autocorrección en su propio HTML.

Cuando el repositorio sea **privado**, entra en este directorio desde la web de GitHub, selecciona **Add file → Upload files** y adjunta el ZIP con ese nombre exacto. No hace falta descomprimirlo. GitHub Actions descargará el repositorio, comprobará el SHA-256, importará las 20 aplicaciones, preparará las claves docentes y generará el ejecutable Windows completo.

SHA-256 del ZIP esperado:

\`\`\`
171f2d902f9d04356d6200e7e4a71809e63ff41bc8a4aaf4242fbec50fb408eb
\`\`\`

Si el ZIP cambia por una versión corregida, hay que revisar y actualizar también el hash de comprobación del flujo \`.github/workflows/compilar-windows-completo.yml\`. El hash impide incluir accidentalmente un paquete distinto.
