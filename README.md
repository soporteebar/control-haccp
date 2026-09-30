# Sistema MACESA: Control de Salida de Procesos y Justificación de Horas Extras HACCP

Aplicación web desarrollada con **HTML5, CSS3 y JavaScript ES6+**, diseñada para funcionar directamente en **GitHub Pages** (o cualquier servidor web estático).

Permite digitalizar íntegramente los dos documentos operativos oficiales:
1. **Control de Salida de Procesos (Vista Gerencial)**: Planilla cronológica con horarios de corte de Matanza, Vísceras, Deshuese y Descarga de Cartón.
2. **Justificación de Horas Extras - Equipo HACCP**: Boleta individual por colaborador con cálculo exacto de horas decimales, redacción de justificación amplia (>300 palabras), registro de vacaciones tomadas, firma digital táctil y exportación a **Excel (.xlsx)** idéntica al formato físico.

---

## Estructura de la Aplicación y Archivos del Proyecto

```text
control-haccp-procesos/
│
├── index.html                           # Panel de Administración y Vista Gerencial
├── empleado.html                        # Portal Móvil de Reporte para Empleados (WhatsApp)
├── README.md                            # Documentación general y despliegue
│
├── js/
│   ├── config.js                        # Configuración global (URL Google Sheets, polling)
│   ├── db.js                            # Base de datos centralizada + SyncEngine bidireccional
│   ├── app-admin.js                     # Controlador del Panel Admin (CRUD async, gráficos, KPIs)
│   ├── app-empleado.js                  # Controlador del Portal Empleado (CRUD async, firma)
│   ├── procesos.js                      # Módulo de Control de Salida de Procesos (Matanza, Vísceras, etc.)
│   ├── excel-export.js                  # Exportador a Excel (.xlsx) oficial de MACESA
│   ├── signature.js                     # Manejador de firma digital táctil con SignaturePad
│   └── time-utils.js                    # Utilidades de conversión y formateo de horas/fechas
│
├── css/
│   ├── app.css                          # Estilos personalizados y utilidades visuales
│   └── print.css                        # Estilos para impresión física de boletas en 1 hoja
│
├── assets/
│   ├── logo-macesa.svg                  # Isologotipo oficial de MACESA
│   └── vendor/                          # Librerías locales para ejecución offline o sin CDN
│       ├── xlsx.full.min.js             # SheetJS para generación de Excel
│       └── chart.umd.min.js             # Chart.js para gráficos gerenciales
│
└── google-sheets/
    ├── CodigoGoogleAppsScript.gs        # Backend en la nube (Apps Script v5.0 - Cero Timeouts)
    └── INSTRUCCIONES_GOOGLE_SHEETS.md   # Manual paso a paso para desplegar el backend
```

---

## ☁️ Arquitectura con Google Sheets (Base de Datos en la Nube)

1. **Fuente de Verdad Única**: Toda la información (`Empleados_Enlaces`, `HorasExtras_HACCP`, `SalidaProcesos`, `Usuarios_Panel`) se almacena y consulta directamente desde Google Sheets.
2. **Reflejo Inmediato**: Cada inserción, edición o eliminación en la web se envía a Google Sheets en tiempo real con retroalimentación visual (`⏳ Guardando en Google Sheets...`).
3. **Refresco Automático en Vivo (Live Polling + Focus Detection)**:
   - Si se modifica una celda directamente en Google Sheets, el sitio web detecta el cambio automáticamente sin necesidad de recargar la página.
   - Cuenta con sondeo en segundo plano (cada 30 segundos) y sincronización al reenfocar la ventana (`focus` y `visibilitychange`).
4. **Reportes Confiables**: Los reportes exportados en Excel (.xlsx) y para impresión física se generan con los datos actualizados de la nube y sellan la hora exacta de sincronización.
5. **Cero Timeouts (<200 ms)**: Procesamiento en memoria y escrituras masivas en lote (`setValues`).

---

## Cómo Probar en Local

1. Puedes abrir directamente [`index.html`](index.html) o [`empleado.html`](empleado.html) con doble clic en tu navegador preferido (Chrome, Edge, Firefox).
2. Para probar la experiencia móvil en tu PC, presiona `F12` en Chrome o Edge y activa el modo de dispositivo móvil (ícono de teléfono/tablet).

---

## Cómo Publicar en GitHub Pages (Archivos a Subir)

Para publicar el sistema en GitHub Pages, **debes subir la carpeta completa del proyecto**:
- `index.html`
- `empleado.html`
- `README.md`
- Carpeta `js/` (con todos sus archivos, especialmente `config.js`, `db.js`, etc.)
- Carpeta `css/` (con `app.css` y `print.css`)
- Carpeta `assets/` (con logo y vendor)
- Carpeta `google-sheets/` (para tu respaldo del script)

### Pasos de Publicación:
1. Crea un repositorio nuevo en tu cuenta de GitHub (ej: `control-haccp-macesa`).
2. Sube todos los archivos de esta carpeta al repositorio (`git add .`, `git commit -m "Sistema HACCP v5.0 Nube"`, `git push origin main`).
3. En la página de tu repositorio en GitHub, ve a **Settings** (Configuración) &rarr; pestaña **Pages** en el menú izquierdo.
4. En **Build and deployment &rarr; Branch**, selecciona `main` (o `master`) y carpeta `/(root)`.
5. Haz clic en **Save**.
6. En 1 minuto GitHub te dará el enlace público de tu aplicación:
   `https://tu-usuario.github.io/control-haccp-macesa/`

Para tus colaboradores, el enlace que les enviarás por WhatsApp será:
`https://tu-usuario.github.io/control-haccp-macesa/empleado.html?emp=emp_01` (o el código que le asignes).
