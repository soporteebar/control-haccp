# Guía Rápida: Conectar Sistema HACCP con Google Sheets (Gratis y en 3 Minutos)

Esta integración permite que cuando un empleado registre sus horas extras desde su teléfono mediante el enlace web de **GitHub Pages**, los datos lleguen de forma instantánea y automática a una hoja de cálculo en tu Google Drive.

---

## Paso 1: Crear la Hoja en Google Sheets
1. Abre tu navegador y ve a [https://sheets.google.com](https://sheets.google.com).
2. Crea una **Hoja de cálculo en blanco**.
3. Nómbrala en la esquina superior izquierda como: `MACESA - Control HACCP y Procesos`.

---

## Paso 2: Abrir el Editor de Apps Script
1. En el menú superior de Google Sheets, haz clic en **Extensiones** &rarr; **Apps Script**.
2. Se abrirá una nueva pestaña con un editor de código.
3. Borra todo el código que aparezca por defecto (`function myFunction() { ... }`).
4. Abre el archivo [`CodigoGoogleAppsScript.gs`](CodigoGoogleAppsScript.gs) incluido en esta carpeta, copia todo su contenido y pégalo en el editor de Google.
5. Haz clic en el ícono del **disquete (Guardar proyecto)** o presiona `Ctrl + S`.

---

## Paso 3: Publicar como Aplicación Web
1. En la esquina superior derecha del editor de Apps Script, haz clic en el botón azul **Implementar** (Deploy) &rarr; **Nueva implementación**.
2. En la ventana emergente, haz clic en el ícono del engranaje ⚙️ junto a "Seleccionar tipo" y elige **Aplicación web**.
3. Configura los campos exactamente así:
   - **Descripción**: `Conector HACCP GitHub Pages`
   - **Ejecutar como**: `Yo (tu correo de Google)`
   - **Quién tiene acceso**: **Cualquier usuario** *(Anyone)* &larr; **¡IMPORTANTE!** (Esto permite que los celulares de tus empleados puedan enviar los datos sin pedirles inicio de sesión de Google).
4. Haz clic en **Implementar**.
5. Google te pedirá "Autorizar acceso". Haz clic en tu cuenta, luego en **Configuración avanzada** y selecciona **Ir a proyecto (no seguro)** y luego **Permitir**.
6. Google te mostrará una pantalla con la **URL de la aplicación web** que se parece a:
   `https://script.google.com/macros/s/AKfycbx.../exec`
7. Haz clic en **Copiar**.

---

## Paso 4: Pegar la URL en el Sistema Web
1. Entra a tu aplicación web (en GitHub Pages o en tu computadora `index.html`).
2. Ve a la pestaña **Google Sheets & Sincronización**.
3. Pega la URL en el campo **URL del Web App de Google Apps Script**.
4. Haz clic en **Guardar URL** y luego en **Probar Conexión**.

¡Listo! A partir de ese momento, cada vez que cualquier colaborador envíe su reporte diario o guardes la salida de procesos, los datos se registrarán en tu Google Sheets en tiempo real y quedarán respaldados para siempre.
