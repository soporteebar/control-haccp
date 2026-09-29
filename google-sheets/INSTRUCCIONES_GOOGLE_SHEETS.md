# Guía: Conexión y CRUD Completo del Sistema HACCP con Google Sheets (Gratis y en la Nube)

Esta integración permite centralizar **toda la información de la empresa** en una sola hoja de cálculo de Google Drive en tiempo real y sin costos. Realiza operaciones completas de **CRUD (Crear, Leer, Actualizar y Eliminar)** en 4 módulos independientes:

1. **`Empleados_Enlaces`**: Directorio de colaboradores, cargos, áreas, teléfonos, enlaces móviles de GitHub Pages y **enlaces directos listos para enviar por WhatsApp**.
2. **`HorasExtras_HACCP`**: Registros diarios de turnos, horas en texto y decimales, justificación detallada, vacaciones y firma digital.
3. **`SalidaProcesos`**: Control gerencial de horarios de corte de faena (Matanza, Vísceras, Deshuese y Descarga de Cartón).
4. **`Usuarios_Panel`**: Cuentas de acceso para **Administradores** (control total) y **Visores** (solo consulta y exportación a Excel).

---

## Paso 1: Crear la Hoja en Google Sheets
1. Abre tu navegador y ve a [https://sheets.google.com](https://sheets.google.com).
2. Crea una **Hoja de cálculo en blanco**.
3. Nómbrala arriba como: `MACESA - Control HACCP y Procesos`.

---

## Paso 2: Pegar el Código en Apps Script
1. En el menú superior de Google Sheets, haz clic en **Extensiones** &rarr; **Apps Script**.
2. Se abrirá una pestaña con un editor de código.
3. Borra cualquier código existente.
4. Abre el archivo [`CodigoGoogleAppsScript.gs`](CodigoGoogleAppsScript.gs) de este proyecto, copia todo su contenido y pégalo en el editor.
5. Haz clic en el ícono del **disquete (Guardar)** o presiona `Ctrl + S`.

---

## Paso 3: Publicar como Aplicación Web
1. En la esquina superior derecha de Apps Script, haz clic en **Implementar** (Deploy) &rarr; **Nueva implementación**.
2. Haz clic en el ícono de engranaje ⚙️ junto a "Seleccionar tipo" y elige **Aplicación web**.
3. Configura:
   - **Descripción**: `Conector CRUD HACCP MACESA`
   - **Ejecutar como**: `Yo (tu correo de Google)`
   - **Quién tiene acceso**: **Cualquier usuario** *(Anyone)* &larr; **¡Obligatorio para que los celulares de los empleados y el panel puedan enviar/leer datos!**
4. Haz clic en **Implementar**.
5. Autoriza el acceso con tu cuenta de Google (*Configuración avanzada &rarr; Ir a proyecto (no seguro) &rarr; Permitir*).
6. Copia la **URL de la aplicación web** generada (empieza por `https://script.google.com/macros/s/.../exec`).

---

## Paso 4: Configurar la URL en el Panel Web
1. Abre el panel de administración en [`index.html`](../index.html) (en local o en GitHub Pages).
2. Ve a la **Pestaña 4: Configuración & Sincronización Google Sheets**.
3. Pega la URL en el campo y pulsa **"Guardar URL"**.
4. Pulsa **"Probar Conexión"**.
5. Pulsa el botón **"🚀 Sincronizar TODO a Google Sheets"**:
   * Creará automáticamente las 4 pestañas con formato industrial y encabezados con colores distintivos.
   * Alimentará el directorio de empleados con sus enlaces directos para WhatsApp.
   * Guardará todos los períodos de salida de procesos y registros de horas extras.
   * Creará las cuentas de acceso iniciales en la hoja `Usuarios_Panel`.

---

## ¿Cómo funciona el CRUD en cada Módulo?

### 1. Registros Detallados de Horas Extras (`HorasExtras_HACCP`)
* **Create (Crear)**: Cuando el colaborador llena el formulario en su celular (`empleado.html`) o el administrador hace clic en **"+ Nuevo Registro"** en el panel, se añade una nueva fila en Google Sheets.
* **Read (Leer)**: Al hacer clic en **"📥 Cargar de Google Sheets"**, se descargan todas las boletas registradas en la nube.
* **Update (Actualizar)**: El administrador puede hacer clic en **"Editar"** en cualquier registro para corregir horas o justificación. El cambio se actualiza inmediatamente en Google Sheets.
* **Delete (Eliminar)**: Al hacer clic en el botón rojo **"✕"**, el registro se elimina tanto localmente como en la fila correspondiente de Google Sheets.

### 2. Módulo de Control de Salida de Procesos (`SalidaProcesos`)
* **Create (Crear)**: Al pulsar **"+ Nuevo Período"** o **"+ Agregar Fila"**, se generan los días y horarios de faena.
* **Read (Leer)**: El botón de carga en la nube sincroniza todos los períodos y tablas de corte.
* **Update (Actualizar)**: Al modificar las horas de Matanza, Vísceras, Deshuese o Cartón y pulsar **"Guardar Cambios de Procesos"**, las filas en Google Sheets se actualizan en tiempo real.
* **Delete (Eliminar)**: Al pulsar **"🗑 Eliminar Período"**, se borran automáticamente todas las filas de ese período en Google Sheets.

### 3. Gestión de Empleados y Enlaces para WhatsApp (`Empleados_Enlaces`)
* **Create (Crear)**: Al pulsar **"+ Crear Nuevo Empleado"**, se genera su tarjeta, su QR, su link móvil y se inserta en Google Sheets.
* **Read (Leer)**: Recupera todo el personal y números de teléfono registrados en la hoja.
* **Update (Actualizar)**: Cada tarjeta cuenta con un botón **"Editar"** para cambiar nombre, cédula, teléfono, área o estado.
* **Delete (Eliminar)**: Al hacer clic en **"Eliminar"**, el empleado se remueve de la lista y de Google Sheets.

### 4. Gestión de Usuarios del Panel (`Usuarios_Panel`)
* **Create (Crear)**: Botón **"+ Crear Usuario del Panel"** para habilitar nuevas cuentas de Administradores o Visores.
* **Read (Leer)**: Mantiene sincronizadas las credenciales en cualquier dispositivo que abra el sistema.
* **Update (Actualizar)**: Botón **"Editar"** en la tabla para cambiar rol o contraseña.
* **Delete (Eliminar)**: Botón **"Eliminar"** para revocar accesos al panel (con protección para no borrar el último administrador).
