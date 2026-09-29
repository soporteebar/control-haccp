# Guía: Conectar Sistema HACCP con Google Sheets (Gratis y en la Nube)

Esta integración permite centralizar **toda la información de la empresa** en una sola hoja de cálculo de Google Drive en tiempo real y sin costos:
1. **`Empleados_Enlaces`**: Directorio de colaboradores, cargos, teléfonos, enlaces móviles de GitHub Pages y **enlaces directos listos para WhatsApp**.
2. **`HorasExtras_HACCP`**: Reportes diarios de turnos, horas extras, procesos, justificaciones, vacaciones y estado de firma.
3. **`SalidaProcesos`**: Control gerencial de horarios de corte (Matanza, Vísceras, Deshuese, Cartón).

---

## Paso 1: Crear la Hoja en Google Sheets
1. Abre tu navegador y ve a [https://sheets.google.com](https://sheets.google.com).
2. Crea una **Hoja de cálculo en blanco**.
3. Nómbrala arriba como: `MACESA - Control HACCP y Procesos`.

---

## Paso 2: Pegar el Código en Apps Script
1. En el menú superior de Google Sheets, haz clic en **Extensiones** &rarr; **Apps Script**.
2. Se abrirá una pestaña con un editor de código.
3. Borra todo el código que aparezca por defecto.
4. Abre el archivo [`CodigoGoogleAppsScript.gs`](CodigoGoogleAppsScript.gs) de este proyecto, copia todo su contenido y pégalo en el editor.
5. Haz clic en el ícono del **disquete (Guardar)** o presiona `Ctrl + S`.

---

## Paso 3: Publicar como Aplicación Web
1. En la esquina superior derecha de Apps Script, haz clic en **Implementar** (Deploy) &rarr; **Nueva implementación**.
2. Haz clic en el ícono de engranaje ⚙️ junto a "Seleccionar tipo" y elige **Aplicación web**.
3. Configura:
   - **Descripción**: `Conector HACCP MACESA`
   - **Ejecutar como**: `Yo (tu correo de Google)`
   - **Quién tiene acceso**: **Cualquier usuario** *(Anyone)* &larr; **¡Obligatorio para que los celulares de los empleados puedan enviar reportes!**
4. Haz clic en **Implementar**.
5. Autoriza el acceso con tu cuenta de Google (*Configuración avanzada &rarr; Ir a proyecto (no seguro) &rarr; Permitir*).
6. Copia la **URL de la aplicación web** generada (empieza por `https://script.google.com/macros/s/.../exec`).

---

## Paso 4: Pegar la URL y Sincronizar en el Panel Web
1. Abre el panel de administración en [`index.html`](../index.html) (en local o en GitHub Pages).
2. Ve a la **Pestaña 4: Configuración & Sincronización Google Sheets**.
3. Pega la URL en el campo y pulsa **"Guardar URL"**.
4. Pulsa **"Probar Conexión"**.
5. Pulsa el botón **"🚀 Sincronizar TODO a Google Sheets"**:
   * Creará automáticamente las 3 pestañas con formato industrial.
   * Llenará el directorio de empleados con sus **enlaces directos de WhatsApp**.
   * Respaldará todas las salidas de procesos y registros de horas extras.
6. En la **Pestaña 3 (Empleados)** también tienes el botón **"📤 Sincronizar Directorio a Google Sheets"**, que actualiza la lista cada vez que crees o modifiques colaboradores.
