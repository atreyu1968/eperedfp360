# Compilar EPE FP360 completo directamente desde GitHub

**Sin instalar Node.js, sin ejecutar PowerShell y sin compilar nada en tu ordenador.**

El flujo ya está preparado: [GitHub Actions · Windows COMPLETO con 7 unidades](../.github/workflows/compilar-windows-completo.yml). Solo es necesario registrar una vez el material original y una clave segura.

## Preparación única, desde la web de GitHub

### 1. Convertir el repositorio en PRIVADO

El repositorio \`atreyu1968/eperedfp360\` se creó público. **Primero**:

1. Abre \`https://github.com/atreyu1968/eperedfp360\`.
2. Entra en **Settings → General → Danger Zone → Change repository visibility**.
3. Selecciona **Make private** y confirma.

Los 20 HTML contienen datos de preguntas, autocorrección y respuestas. No los subas al repositorio público. El flujo de compilación falla intencionadamente si detecta un repositorio público. **Recuerda** que el EXE distribuido al alumnado seguirá conteniendo sus propios datos de autocorrección: no es un sistema anti-copia inviolable.

### 2. Configurar una clave maestra una sola vez

En el mismo repositorio privado entra en:

**Settings → Secrets and variables → Actions → New repository secret**

- **Name:** \`EPE_FP360_MASTER_SECRET\`
- **Secret:** una contraseña aleatoria fuerte de **al menos 24 caracteres**. Guárdala fuera de GitHub en tu gestor de contraseñas.

Esta clave NO se introduce en el código fuente. La compilación deriva siempre el mismo par de claves Ed25519; incluye únicamente la pública en la aplicación y te entrega la privada **cifrada** como artefacto para el profesor. **No cambies el secreto en futuras compilaciones**, pues dejarían de verificar los códigos anteriores.

### 3. Subir el ZIP original una sola vez desde el navegador

Descarga de la conversación el ZIP **EPE_FP360_20_APLICACIONES_ALUMNADO_IMPORTACION.zip** (937 KiB) y **no lo descomprimas**.

En el repositorio **ya privado**, abre la carpeta \`assets\` y selecciona **Add file → Upload files**. Arrastra el ZIP y confirma el commit a \`main\`.

Nombre exacto requerido:

\`\`\`
assets/EPE_FP360_20_APLICACIONES_ALUMNADO_IMPORTACION.zip
\`\`\`

SHA-256 esperado:

\`\`\`
171f2d902f9d04356d6200e7e4a71809e63ff41bc8a4aaf4242fbec50fb408eb
\`\`\`

La subida del ZIP desencadena **automáticamente** el flujo \`EPE FP360 · Windows COMPLETO con 7 unidades\`.

## Descargar el resultado

1. En el repositorio privado, abre **Actions**.
2. Selecciona **EPE FP360 · Windows COMPLETO con 7 unidades**.
3. Entra en la última ejecución y comprueba que todas las etapas estén en verde.
4. Abajo, en **Artifacts**, descarga por separado:
   - \`EPE-FP360-WINDOWS-COMPLETO-7-UNIDADES\`: ZIP que contiene el EXE portable de Windows 10/11 con las 20 aplicaciones (7 portafolios + 13 pruebas).
   - \`EPE-FP360-CLAVE-PRIVADA-DOCENTE-CIFRADA\`: el archivo \`private.pem\` para emitir códigos desde el entorno docente. **Nunca enviarlo al alumnado**.

Los artefactos tienen una retención de 30 días. Conserva copias seguras del EXE y la clave privada cifrada. La contraseña que protege el PEM es el secreto maestro que definiste en el paso 2.

## Activación del perfil docente

La primera vez que abras el EXE:

- En el panel docente, establece una contraseña local de acceso (14 caracteres o más).
- Introduce también la **clave maestra** guardada en GitHub Secrets. Sirve para demostrar que eres el propietario de la identidad docente; la aplicación NO la guarda.
- Después accede normalmente con la contraseña local.

Para emitir un código de desbloqueo en el panel docente, selecciona el \`private.pem\` cifrado, introduce como frase de paso la misma clave maestra, el alumno, la actividad y la vigencia, y genera el código.

Para los alumnos, distribuye únicamente el EXE, **nunca** el \`private.pem\` ni la clave maestra.

## Compilaciones posteriores, sin volver a subir el ZIP

En **Actions → EPE FP360 · Windows COMPLETO con 7 unidades → Run workflow**, selecciona \`main\` y pulsa el botón verde. El flujo reutilizará los mismos 20 HTML y la clave maestra configurada, recompilando la aplicación.

## Lo que queda por verificar

Esta automatización crea y empaqueta los contenidos, pero el uso docente oficial requiere pruebas reales en Windows: desbloqueo de actividad y examen, guardado, recepción de entregas, confirmación docente y recuperación por CE.

El repositorio y el workflow están preparados. **El build completo aún no puede ejecutarse con éxito mientras el repositorio siga público, falte el ZIP original o no se haya configurado el secreto maestro.** Estas tres condiciones son explícitas e intencionadas.
