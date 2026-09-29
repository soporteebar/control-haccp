# Sistema MACESA: Control de Salida de Procesos y Justificación de Horas Extras HACCP

Aplicación web desarrollada con **HTML5, CSS3 y JavaScript ES6+**, diseñada para funcionar directamente en **GitHub Pages** (o cualquier servidor web estático).

Permite digitalizar íntegramente los dos documentos operativos oficiales:
1. **Control de Salida de Procesos (Vista Gerencial)**: Planilla cronológica con horarios de corte de Matanza, Vísceras, Deshuese y Descarga de Cartón.
2. **Justificación de Horas Extras - Equipo HACCP**: Boleta individual por colaborador con cálculo exacto de horas decimales, redacción de justificación amplia (>300 palabras), registro de vacaciones tomadas, firma digital táctil y exportación a **Excel (.xlsx)** idéntica al formato físico.

---

## Estructura de la Aplicación

- **[`index.html`](index.html)**: Panel de Administración & Vista Gerencial.
  - Dashboard interactivo con métricas acumuladas (KPIs) y gráficos por colaborador y proceso.
  - Módulo completo de **Control de Salida de Procesos** (Imagen 1) editable y exportable a Excel.
  - Creador y gestor de empleados con generador de enlaces móviles directos y códigos QR para WhatsApp.
  - Exportación consolidada para nómina y Recursos Humanos.
  - Conector para sincronización con **Google Sheets**.
- **[`empleado.html`](empleado.html)**: Portal móvil exclusivo para el empleado.
  - Acceso directo mediante enlace personalizado (ej: `empleado.html?emp=emp_01`).
  - Selector intuitivo de horas y minutos con conversión decimal en tiempo real.
  - Contador dinámico de palabras y caracteres para justificaciones extensas (>300 palabras).
  - Selector de vacaciones tomadas (SÍ/NO, rango de fechas y cómputo de días).
  - Lienzo (Canvas) para firma digital en teléfonos móviles o PC.
  - Descarga de boleta individual en Excel (.xlsx) o impresión en PDF.
- **[`google-sheets/`](google-sheets/)**: Código y guía para conectar gratis una hoja de cálculo en Google Drive como base de datos en la nube.

---

## Cómo Probar en Local

1. Puedes abrir directamente [`index.html`](index.html) o [`empleado.html`](empleado.html) con doble clic en tu navegador preferido (Chrome, Edge, Firefox).
2. Para probar la experiencia móvil en tu PC, presiona `F12` en Chrome o Edge y activa el modo de dispositivo móvil (ícono de teléfono/tablet).

---

## Cómo Publicar en GitHub Pages (Paso a Paso)

1. Crea un repositorio nuevo en tu cuenta de GitHub (ej: `control-haccp-macesa`).
2. Sube todos los archivos de esta carpeta al repositorio (`git add .`, `git commit -m "Sistema HACCP"`, `git push origin main`).
3. En la página de tu repositorio en GitHub, ve a **Settings** (Configuración) &rarr; pestaña **Pages** en el menú izquierdo.
4. En **Build and deployment &rarr; Branch**, selecciona `main` (o `master`) y carpeta `/(root)`.
5. Haz clic en **Save**.
6. En 1 minuto GitHub te dará el enlace público de tu aplicación:
   `https://tu-usuario.github.io/control-haccp-macesa/`

Para tus colaboradores, el enlace que les enviarás por WhatsApp será:
`https://tu-usuario.github.io/control-haccp-macesa/empleado.html?emp=emp_01` (o el código que le asignes).
