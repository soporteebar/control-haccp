/**
 * ==============================================================================
 * CodigoGoogleAppsScript.gs - Conector de Google Sheets para Sistema HACCP MACESA
 * ==============================================================================
 * Versión 5.0 (Ultra-optimizada con Operaciones en Lote / Batch - Cero Timeouts)
 * 
 * Centraliza en Google Sheets con operaciones CRUD (Crear, Leer, Actualizar y Eliminar)
 * los 4 módulos del sistema con DATOS INICIALES SEMILLA:
 * 1. Gestión de Empleados y Enlaces para WhatsApp (Hoja: Empleados_Enlaces)
 * 2. Registros Detallados de Horas Extras (Hoja: HorasExtras_HACCP)
 * 3. Módulo de Control de Salida de Procesos (Hoja: SalidaProcesos)
 * 4. Gestión de Usuarios del Panel Admin y Visor (Hoja: Usuarios_Panel)
 *
 * NOTA DE RENDIMIENTO:
 * Esta versión elimina los bucles de appendRow() y deleteRow() que causaban
 * "Exceeded maximum execution time". Ahora utiliza procesamiento en memoria y
 * escritura masiva con setValues() que se ejecuta en menos de 1 segundo.
 */

// ==============================================================================
// CONFIGURACIÓN (OPCIONAL):
// Si abriste Apps Script desde tu Google Sheet en "Extensiones" > "Apps Script",
// esta variable DEBE quedar vacía (""). Apps Script se vinculará automáticamente.
//
// Si creaste un script independiente en script.google.com, pega aquí el ID de tu
// hoja (los caracteres entre /d/ y /edit de la URL de tu Google Sheet):
// ==============================================================================
const SPREADSHEET_ID = "";

/**
 * ==============================================================================
 * 🌟 FUNCIÓN PRINCIPAL PARA PROBAR EN EL EDITOR DE GOOGLE APPS SCRIPT:
 * Selecciona 'INICIALIZAR_SISTEMA_MACESA' en el menú de funciones arriba y pulsa 'Ejecutar'.
 * ==============================================================================
 */
function INICIALIZAR_SISTEMA_MACESA() {
  return poblarDatosIniciales();
}

/**
 * Menú personalizado superior en Google Sheets
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🍖 HACCP MACESA")
      .addItem("🌱 Inicializar Datos Semilla", "INICIALIZAR_SISTEMA_MACESA")
      .addItem("🧹 Limpiar Registros Duplicados", "eliminarDuplicadosGoogleSheets")
      .addToUi();
  } catch (e) {
    Logger.log("No se pudo agregar menú de interfaz: " + e.message);
  }
}

/**
 * Obtiene la hoja de cálculo de forma segura, ya sea vinculada automáticamente
 * o mediante el SPREADSHEET_ID configurado.
 */
function getSafeSpreadsheet_() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID.trim()) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      throw new Error("No se pudo abrir la hoja con el SPREADSHEET_ID proporcionado: " + e.message);
    }
  }

  throw new Error(
    "⚠️ No se detectó ninguna hoja de cálculo activa.\n\n" +
    "CÓMO SOLUCIONARLO:\n" +
    "1. Ve a tu Google Sheets en el navegador (ej: sheets.google.com).\n" +
    "2. En el menú superior haz clic en: Extensiones > Apps Script.\n" +
    "3. Pega este código ahí y guarda los cambios (Ctrl + S).\n" +
    "(O si estás usando un script independiente en script.google.com, copia el ID de tu Google Sheet " +
    "de la URL y pégalo en la variable SPREADSHEET_ID en la línea 26 de este código)."
  );
}

// Encabezados estándar de las 4 hojas
const HEADERS_EMPLEADOS = [
  "ID Empleado",
  "Código / Cédula",
  "Nombre del Colaborador",
  "Área / Departamento",
  "Puesto / Cargo",
  "Teléfono / WhatsApp",
  "Enlace Formulario Web (GitHub Pages)",
  "Enlace Directo WhatsApp",
  "Estado",
  "Fecha Alta / Actualización"
];

const HEADERS_HORAS = [
  "ID Registro",
  "Fecha Turno",
  "Nombre del Empleado",
  "Código",
  "Área",
  "Proceso",
  "Salida Planilla",
  "Horas (Texto)",
  "Horas (Decimal)",
  "Justificación de Actividades",
  "¿Tomó Vacaciones?",
  "Vacaciones Desde",
  "Vacaciones Hasta",
  "Días Vacaciones",
  "Tiene Firma Digital",
  "Fecha / Hora Registro",
  "ID Empleado"
];

const HEADERS_PROCESOS = [
  "ID Período",
  "Título Período",
  "Fecha",
  "Día",
  "Hora Matanza",
  "Hora Víscera",
  "Hora Deshues",
  "Hora Descarga Cartón",
  "Observaciones",
  "Última Modificación"
];

const HEADERS_USUARIOS = [
  "ID Usuario",
  "Nombre de Usuario (Login)",
  "Contraseña",
  "Nombre Completo",
  "Rol (admin / visor)",
  "Fecha Alta",
  "Estado"
];

// Datos semilla iniciales de MACESA
const SEED_EMPLEADOS = [
  [
    "emp_01",
    "EMP-01",
    "Álvaro José Sequeira Amador",
    "Equipo HACCP",
    "Inspector de Calidad",
    "+505 8888-0001",
    "https://tu-usuario.github.io/control-haccp-procesos/empleado.html?emp=emp_01",
    "https://api.whatsapp.com/send?phone=50588880001&text=Hola%20Álvaro%20José%20Sequeira%20Amador,%20ingresa%20aqui%20para%20reportar%20tus%20horas",
    "ACTIVO",
    "2026-08-01"
  ],
  [
    "emp_02",
    "EMP-02",
    "Carlos Eduardo Mendoza Ruiz",
    "Deshuese y Vísceras",
    "Operador Línea",
    "+505 8888-0002",
    "https://tu-usuario.github.io/control-haccp-procesos/empleado.html?emp=emp_02",
    "https://api.whatsapp.com/send?phone=50588880002&text=Hola%20Carlos%20Eduardo%20Mendoza%20Ruiz,%20ingresa%20aqui%20para%20reportar%20tus%20horas",
    "ACTIVO",
    "2026-08-01"
  ],
  [
    "emp_03",
    "EMP-03",
    "Marta Elena Solís Vega",
    "Equipo HACCP",
    "Supervisora de Inocuidad",
    "+505 8888-0003",
    "https://tu-usuario.github.io/control-haccp-procesos/empleado.html?emp=emp_03",
    "https://api.whatsapp.com/send?phone=50588880003&text=Hola%20Marta%20Elena%20Solís%20Vega,%20ingresa%20aqui%20para%20reportar%20tus%20horas",
    "ACTIVO",
    "2026-08-01"
  ]
];

const SEED_HORAS = [
  ["rec_01", "2026-08-26", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Proceso de Matanza", "16:25", "1h y 25 minutos", 1.42, "Proceso de Matanza extendido hasta las 4:25pm debido a inspección exhaustiva de puntos críticos de control (PCC) ante ingreso tardío de ganado.", "NO", "", "", 0, "SÍ", "2026-08-26 16:30:00", "emp_01"],
  ["rec_02", "2026-08-27", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Proceso de Matanza", "15:55", "55 minutos", 0.92, "Proceso de Matanza 3:55pm. Verificación de eviscerado, lavado de canales y toma de temperaturas reglamentarias de refrigeración.", "NO", "", "", 0, "SÍ", "2026-08-27 16:00:00", "emp_01"],
  ["rec_03", "2026-08-28", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Proceso de Matanza", "16:25", "1h y 25 minutos", 1.42, "Proceso de Matanza 4:25pm. Monitoreo del flujo continuo en línea de sacrificio e inspección de sellado sanitario.", "NO", "", "", 0, "SÍ", "2026-08-28 16:30:00", "emp_01"],
  ["rec_04", "2026-08-29", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Proceso de Matanza", "16:30", "1h y 30 minutos", 1.50, "Proceso de Matanza 4:30pm. Cierre de faena semanal, desinfección de cámaras frigoríficas y validación de parámetros sanitarios.", "NO", "", "", 0, "SÍ", "2026-08-29 16:40:00", "emp_01"],
  ["rec_05", "2026-08-31", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Pic Deshuese y Proceso de Vísceras", "18:05", "4h y 5 minutos", 4.08, "Pic Deshuese y Proceso de Vísceras 6:05pm. Supervisión completa de la línea de despiece fino, envasado al vacío y control estricto de temperatura en sala de deshuese.", "NO", "", "", 0, "SÍ", "2026-08-31 18:15:00", "emp_01"],
  ["rec_06", "2026-09-01", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Pic Deshuese y Proceso de Vísceras", "18:30", "2h y 55 minutos", 2.92, "Pic Deshuese y Proceso de Vísceras 6:30pm. Control de pesaje, rotulado de trazabilidad por lote y empaque en cajas para despacho inmediato.", "NO", "", "", 0, "SÍ", "2026-09-01 18:35:00", "emp_01"],
  ["rec_07", "2026-09-02", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Pic Deshuese y Proceso de Vísceras", "17:15", "3h y 15 minutos", 3.25, "Pic Deshuese y Proceso de Vísceras 5:15pm. Acompañamiento a auditores internos y muestreo microbiológico de superficies en contacto con alimentos.", "NO", "", "", 0, "SÍ", "2026-09-02 17:25:00", "emp_01"],
  ["rec_08", "2026-09-03", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Pic Deshuese y Proceso de Vísceras", "17:30", "3h y 30 minutos", 3.50, "Pic Deshuese y Proceso de Vísceras 5:30pm. Apoyo en línea ante alto volumen de cortes especiales para exportación y cierre de lote.", "NO", "", "", 0, "SÍ", "2026-09-03 17:40:00", "emp_01"],
  ["rec_09", "2026-09-04", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Proceso de Deshuese", "16:00", "2 horas", 2.00, "Proceso de Deshuese 4:00pm. Cuadratura de inventario de cortes primarios y secundarios.", "NO", "", "", 0, "SÍ", "2026-09-04 16:05:00", "emp_01"],
  ["rec_10", "2026-09-05", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Proceso de Deshuese", "16:45", "3h y 25 minutos", 3.42, "Proceso de Deshuese. Muestreo de corte y verificación de pH en cuartos refrigerados.", "NO", "", "", 0, "SÍ", "2026-09-05 16:30:00", "emp_01"],
  ["rec_11", "2026-09-07", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Carga de contenedores", "16:00", "2 horas", 2.00, "Carga de contenedores refrigerados con destino a puerto para exportación.", "NO", "", "", 0, "SÍ", "2026-09-07 16:10:00", "emp_01"],
  ["rec_12", "2026-09-08", "Álvaro José Sequeira Amador", "EMP-01", "Equipo HACCP", "Deshuese y empaque", "16:15", "1h y 55 minutos", 1.92, "Apoyo Deshuese e inspección final de sanidad e higiene en área de empaque.", "NO", "", "", 0, "SÍ", "2026-09-08 16:00:00", "emp_01"]
];

const SEED_PROCESOS = [
  // Período 1: 26/08/2026 al 10/09/2026
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-08-26", "Miércoles", "16:25", "17:15", "18:00", "18:45", "Recepción tardía de lote", "2026-08-26"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-08-27", "Jueves", "15:55", "16:40", "17:30", "18:00", "Faena continua", "2026-08-27"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-08-28", "Viernes", "16:25", "17:10", "17:50", "18:30", "Inspección PCC", "2026-08-28"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-08-29", "Sábado", "16:30", "17:00", "17:45", "18:15", "Despacho extraordinario", "2026-08-29"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-08-31", "Lunes", "15:30", "18:05", "18:05", "19:00", "Limpieza e inspección de sala", "2026-08-31"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-01", "Martes", "15:45", "18:30", "18:30", "19:15", "Empaque de cajas para exportación", "2026-09-01"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-02", "Miércoles", "15:00", "17:15", "17:15", "18:00", "Muestreo microbiológico", "2026-09-02"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-03", "Jueves", "15:10", "17:30", "17:30", "18:10", "Cierre de lote", "2026-09-03"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-04", "Viernes", "15:00", "15:45", "16:00", "17:00", "Cuadratura de inventario", "2026-09-04"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-05", "Sábado", "15:15", "16:00", "16:45", "17:30", "Muestreo de cortes refrigerados", "2026-09-05"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-07", "Lunes", "15:00", "15:30", "16:00", "16:00", "Carga de contenedores", "2026-09-07"],
  ["2026-08-26_2026-09-10", "26/08/2026 al 10/09/2026", "2026-09-08", "Martes", "15:00", "15:30", "16:15", "17:00", "Apoyo deshuese y empaque", "2026-09-08"],

  // Período 2: 26/09/2026 al 10/10/2026 (Formato Exacto Imagen 1)
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-09-26", "Sábado", "16:25", "17:10", "18:05", "19:00", "Turno extendido por recepción", "2026-09-26"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-09-28", "Lunes", "15:55", "16:30", "17:15", "18:00", "Operación normal", "2026-09-28"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-09-29", "Martes", "15:30", "16:15", "17:00", "17:45", "", "2026-09-29"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-09-30", "Miércoles", "16:10", "16:50", "17:40", "18:20", "Lote especial", "2026-09-30"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-01", "Jueves", "15:45", "16:20", "17:10", "17:50", "", "2026-10-01"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-02", "Viernes", "16:00", "16:45", "17:50", "18:30", "Mantenimiento en sierra", "2026-10-02"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-03", "Sábado", "14:30", "15:10", "16:00", "16:40", "Medio turno", "2026-10-03"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-05", "Lunes", "15:35", "16:15", "17:05", "17:45", "", "2026-10-05"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-06", "Martes", "15:40", "16:20", "17:00", "17:40", "", "2026-10-06"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-07", "Miércoles", "16:05", "16:45", "17:35", "18:15", "", "2026-10-07"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-08", "Jueves", "15:50", "16:30", "17:15", "18:00", "", "2026-10-08"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-09", "Viernes", "16:15", "17:00", "18:00", "18:45", "Alto volumen de matanza", "2026-10-09"],
  ["2026-09-26_2026-10-10", "26/09/2026 al 10/10/2026", "2026-10-10", "Sábado", "14:15", "14:55", "15:45", "16:30", "Cierre de período", "2026-10-10"]
];

const SEED_USUARIOS = [
  ["adm_01", "admin", "Admin25#", "Administrador General", "admin", "2026-08-01", "ACTIVO"],
  ["adm_02", "visor", "VisorDM", "Supervisor / Visor de Reportes", "visor", "2026-08-01", "ACTIVO"]
];

/**
 * Obtiene una hoja existente o la crea con encabezados estilizados de forma inmediata
 */
function getOrCreateSheet(ss, sheetName, headers, headerBgColor) {
  // Si no se proporcionó el objeto spreadsheet (o se ejecutó manualmente desde el botón "Ejecutar")
  if (!ss || typeof ss.getSheetByName !== 'function') {
    ss = getSafeSpreadsheet_();
  }

  // Si se ejecutó directamente la función getOrCreateSheet desde el botón "Ejecutar" del editor
  if (!sheetName) {
    Logger.log("getOrCreateSheet fue ejecutada manualmente sin argumentos. Inicializando las 4 hojas...");
    return poblarDatosIniciales();
  }

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground(headerBgColor || "#1e3a8a")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Función que crea las 4 hojas y las llena con todos los datos iniciales
 * en una sola operación por lote (Tarda menos de 1 segundo).
 */
function poblarDatosIniciales() {
  const ss = getSafeSpreadsheet_();

  // 1. Empleados
  const sheetEmp = getOrCreateSheet(ss, "Empleados_Enlaces", HEADERS_EMPLEADOS, "#1e3a8a");
  const fullEmp = [HEADERS_EMPLEADOS, ...SEED_EMPLEADOS];
  sheetEmp.clearContents();
  sheetEmp.getRange(1, 1, fullEmp.length, fullEmp[0].length).setValues(fullEmp);
  sheetEmp.getRange(1, 1, 1, HEADERS_EMPLEADOS.length).setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
  sheetEmp.setFrozenRows(1);

  // 2. Horas Extras
  const sheetOt = getOrCreateSheet(ss, "HorasExtras_HACCP", HEADERS_HORAS, "#312e81");
  const fullOt = [HEADERS_HORAS, ...SEED_HORAS];
  sheetOt.clearContents();
  sheetOt.getRange(1, 1, fullOt.length, fullOt[0].length).setValues(fullOt);
  sheetOt.getRange(1, 1, 1, HEADERS_HORAS.length).setBackground("#312e81").setFontColor("#ffffff").setFontWeight("bold");
  sheetOt.setFrozenRows(1);

  // 3. Salida de Procesos
  const sheetProc = getOrCreateSheet(ss, "SalidaProcesos", HEADERS_PROCESOS, "#059669");
  const fullProc = [HEADERS_PROCESOS, ...SEED_PROCESOS];
  sheetProc.clearContents();
  sheetProc.getRange(1, 1, fullProc.length, fullProc[0].length).setValues(fullProc);
  sheetProc.getRange(1, 1, 1, HEADERS_PROCESOS.length).setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
  sheetProc.setFrozenRows(1);

  // 4. Usuarios del Panel
  const sheetUsr = getOrCreateSheet(ss, "Usuarios_Panel", HEADERS_USUARIOS, "#b45309");
  const fullUsr = [HEADERS_USUARIOS, ...SEED_USUARIOS];
  sheetUsr.clearContents();
  sheetUsr.getRange(1, 1, fullUsr.length, fullUsr[0].length).setValues(fullUsr);
  sheetUsr.getRange(1, 1, 1, HEADERS_USUARIOS.length).setBackground("#b45309").setFontColor("#ffffff").setFontWeight("bold");
  sheetUsr.setFrozenRows(1);

  try {
    if (ss && ss.toast) {
      ss.toast("✅ Las 4 hojas fueron pobladas exitosamente con los datos iniciales de MACESA en menos de 1 segundo.");
    }
  } catch (e) {}

  Logger.log("✅ Las 4 hojas fueron pobladas exitosamente con los datos iniciales de MACESA.");
  return { status: "success", message: "Hojas creadas e inicializadas exitosamente en Google Sheets." };
}

/**
 * Revisa de manera ultra-rápida si las hojas están vacías para poblarlas
 */
function setupSheets() {
  const ss = getSafeSpreadsheet_();
  const sheetEmp = ss.getSheetByName("Empleados_Enlaces");
  const sheetOt = ss.getSheetByName("HorasExtras_HACCP");
  
  if (!sheetEmp || !sheetOt || (sheetEmp.getLastRow() <= 1 && sheetOt.getLastRow() <= 1)) {
    poblarDatosIniciales();
  }
}

/**
 * 🧹 Limpia registros duplicados en todas las hojas en una sola operación por lote.
 * Elimina duplicados por ID y por clave compuesta (fecha + empleado + proceso + horas)
 * sin perder datos, firmas o formatos.
 */
function eliminarDuplicadosGoogleSheets() {
  const ss = getSafeSpreadsheet_();
  let totalRemoved = 0;
  const summary = {};

  // 1. Limpiar HorasExtras_HACCP
  const sheetOt = ss.getSheetByName("HorasExtras_HACCP");
  if (sheetOt && sheetOt.getLastRow() > 1) {
    const data = sheetOt.getDataRange().getValues();
    const headers = data[0];
    const seenIds = {};
    const seenKeys = {};
    const cleanRows = [headers];
    let removedOt = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = (row[0] || "").toString().trim();
      const date = formatDateString(row[1]);
      const empCode = (row[3] || "").toString().trim().toUpperCase();
      const empId = (row[16] || "").toString().trim();
      const proc = (row[5] || "").toString().trim().toLowerCase();
      const hours = (parseFloat(row[8]) || 0).toFixed(2);

      const compKey = `${date}|${empId || empCode}|${proc}|${hours}`;

      if (id && seenIds[id]) {
        removedOt++;
        continue;
      }
      if (seenKeys[compKey]) {
        removedOt++;
        continue;
      }

      if (id) seenIds[id] = true;
      seenKeys[compKey] = true;
      cleanRows.push(row);
    }

    if (removedOt > 0) {
      sheetOt.clearContents();
      sheetOt.getRange(1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
      sheetOt.getRange(1, 1, 1, headers.length).setBackground("#312e81").setFontColor("#ffffff").setFontWeight("bold");
      sheetOt.setFrozenRows(1);
    }
    summary.horasExtras = removedOt;
    totalRemoved += removedOt;
  }

  // 2. Limpiar Empleados_Enlaces
  const sheetEmp = ss.getSheetByName("Empleados_Enlaces");
  if (sheetEmp && sheetEmp.getLastRow() > 1) {
    const data = sheetEmp.getDataRange().getValues();
    const headers = data[0];
    const seenEmpIds = {};
    const seenEmpCodes = {};
    const cleanRows = [headers];
    let removedEmp = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = (row[0] || "").toString().trim();
      const code = (row[1] || "").toString().trim().toUpperCase();

      if (id && seenEmpIds[id]) {
        removedEmp++;
        continue;
      }
      if (code && seenEmpCodes[code]) {
        removedEmp++;
        continue;
      }

      if (id) seenEmpIds[id] = true;
      if (code) seenEmpCodes[code] = true;
      cleanRows.push(row);
    }

    if (removedEmp > 0) {
      sheetEmp.clearContents();
      sheetEmp.getRange(1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
      sheetEmp.getRange(1, 1, 1, headers.length).setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
      sheetEmp.setFrozenRows(1);
    }
    summary.empleados = removedEmp;
    totalRemoved += removedEmp;
  }

  // 3. Limpiar SalidaProcesos
  const sheetProc = ss.getSheetByName("SalidaProcesos");
  if (sheetProc && sheetProc.getLastRow() > 1) {
    const data = sheetProc.getDataRange().getValues();
    const headers = data[0];
    const seenProcKeys = {};
    const cleanRows = [headers];
    let removedProc = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const periodId = (row[0] || row[1] || "").toString().trim();
      const date = formatDateString(row[2]);
      const key = `${periodId}|${date}`;

      if (key && seenProcKeys[key]) {
        removedProc++;
        continue;
      }
      if (key) seenProcKeys[key] = true;
      cleanRows.push(row);
    }

    if (removedProc > 0) {
      sheetProc.clearContents();
      sheetProc.getRange(1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
      sheetProc.getRange(1, 1, 1, headers.length).setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
      sheetProc.setFrozenRows(1);
    }
    summary.procesos = removedProc;
    totalRemoved += removedProc;
  }

  // 4. Limpiar Usuarios_Panel
  const sheetUsr = ss.getSheetByName("Usuarios_Panel");
  if (sheetUsr && sheetUsr.getLastRow() > 1) {
    const data = sheetUsr.getDataRange().getValues();
    const headers = data[0];
    const seenUsernames = {};
    const cleanRows = [headers];
    let removedUsr = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const username = (row[1] || "").toString().trim().toLowerCase();

      if (username && seenUsernames[username]) {
        removedUsr++;
        continue;
      }
      if (username) seenUsernames[username] = true;
      cleanRows.push(row);
    }

    if (removedUsr > 0) {
      sheetUsr.clearContents();
      sheetUsr.getRange(1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
      sheetUsr.getRange(1, 1, 1, headers.length).setBackground("#b45309").setFontColor("#ffffff").setFontWeight("bold");
      sheetUsr.setFrozenRows(1);
    }
    summary.usuarios = removedUsr;
    totalRemoved += removedUsr;
  }

  Logger.log(`🧹 Limpieza completada. Total duplicados eliminados: ${totalRemoved}`);
  return {
    status: "success",
    totalRemoved: totalRemoved,
    summary: summary,
    message: totalRemoved > 0 
      ? `Se eliminaron ${totalRemoved} registros duplicados de Google Sheets con éxito.`
      : "No se encontraron registros duplicados. Google Sheets está limpio."
  };
}

/**
 * Manejador principal para peticiones POST (Crear, Actualizar, Eliminar y Leer todo)
 * Con LockService para garantizar concurrencia segura y evitar filas duplicadas.
 */
function doPost(e) {
  // Bloqueo de concurrencia: previene que 2 solicitudes simultáneas creen filas duplicadas
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(20000); // Esperar hasta 20 segundos
  if (!hasLock) {
    return createJsonResponse({
      status: "error",
      error: "El servidor de Google Sheets está ocupado procesando otra solicitud. Por favor intenta de nuevo en unos segundos."
    });
  }

  try {
    const ss = getSafeSpreadsheet_();

    // Obtener datos enviados desde la aplicación cliente
    let postData = "{}";
    if (e && e.postData && e.postData.contents) {
      postData = e.postData.contents;
    }
    const data = JSON.parse(postData);
    const action = data.action || "";
    const now = new Date().toLocaleString();

    // =========================================================================
    // ACCIÓN: READ / GET_ALL_DATA (Lectura completa de los 4 módulos)
    // =========================================================================
    if (action === "get_all_data" || action === "read") {
      const fullData = readAllDataFromSpreadsheet(ss);
      return createJsonResponse({
        status: "success",
        timestamp: now,
        ...fullData
      });
    }

    // =========================================================================
    // ACCIÓN: POBLAR DATOS INICIALES (Reinicio / Siembra de datos)
    // =========================================================================
    if (action === "poblar_datos_iniciales") {
      poblarDatosIniciales();
      const fullData = readAllDataFromSpreadsheet(ss);
      return createJsonResponse({
        status: "success",
        message: "Datos iniciales poblados con éxito en Google Sheets",
        timestamp: now,
        ...fullData
      });
    }

    // =========================================================================
    // ACCIÓN: LIMPIAR DUPLICADOS EN TODAS LAS HOJAS
    // =========================================================================
    if (action === "clean_duplicates" || action === "eliminar_duplicados") {
      const cleanResult = eliminarDuplicadosGoogleSheets();
      const fullData = readAllDataFromSpreadsheet(ss);
      return createJsonResponse({
        ...cleanResult,
        timestamp: now,
        ...fullData
      });
    }

    // =========================================================================
    // MÓDULO 1: GESTIÓN DE EMPLEADOS Y ENLACES WHATSAPP (CRUD)
    // =========================================================================
    if (action === "save_employee") {
      const sheet = getOrCreateSheet(ss, "Empleados_Enlaces", HEADERS_EMPLEADOS, "#1e3a8a");
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;

      const targetId = (data.id || "").toString().trim();
      const targetCode = (data.code || "").toString().trim();

      for (let i = 1; i < values.length; i++) {
        const rowId = (values[i][0] || "").toString().trim();
        const rowCode = (values[i][1] || "").toString().trim();
        if ((targetId && rowId === targetId) || (targetCode && rowCode === targetCode)) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowData = [
        targetId || "emp_" + new Date().getTime(),
        targetCode,
        data.name || "",
        data.area || "Equipo HACCP",
        data.role || "Inspector de Calidad",
        data.phone || "",
        data.webUrl || "",
        data.whatsappUrl || "",
        data.active !== false && data.active !== "INACTIVO" ? "ACTIVO" : "INACTIVO",
        now
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }

      return createJsonResponse({
        status: "success",
        message: "Empleado guardado en Google Sheets",
        id: rowData[0]
      });
    }

    if (action === "delete_employee") {
      const sheet = getOrCreateSheet(ss, "Empleados_Enlaces", HEADERS_EMPLEADOS, "#1e3a8a");
      const targetId = (data.id || "").toString().trim();
      const deleted = deleteRowInMemory(sheet, targetId, 0);

      return createJsonResponse({
        status: "success",
        deleted: deleted,
        message: deleted ? "Empleado eliminado de Google Sheets" : "Empleado no encontrado"
      });
    }

    if (action === "sync_all_employees" && Array.isArray(data.employees)) {
      const sheet = getOrCreateSheet(ss, "Empleados_Enlaces", HEADERS_EMPLEADOS, "#1e3a8a");
      const rows = [HEADERS_EMPLEADOS];
      data.employees.forEach(emp => {
        rows.push([
          emp.id || "emp_" + new Date().getTime(),
          emp.code || "",
          emp.name || "",
          emp.area || "Equipo HACCP",
          emp.role || "Inspector de Calidad",
          emp.phone || "",
          emp.webUrl || "",
          emp.whatsappUrl || "",
          emp.active !== false && emp.active !== "INACTIVO" ? "ACTIVO" : "INACTIVO",
          now
        ]);
      });

      sheet.clearContents();
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

      return createJsonResponse({
        status: "success",
        count: data.employees.length,
        message: "Directorio de empleados sincronizado completamente"
      });
    }

    // =========================================================================
    // MÓDULO 2: REGISTROS DETALLADOS DE HORAS EXTRAS (CRUD)
    // =========================================================================
    if (action === "save_record" || action === "add_overtime") {
      const sheet = getOrCreateSheet(ss, "HorasExtras_HACCP", HEADERS_HORAS, "#312e81");
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      const targetId = (data.id || "").toString().trim();

      // 1. Buscar coincidencia por ID único
      if (targetId) {
        for (let i = 1; i < values.length; i++) {
          const rowId = (values[i][0] || "").toString().trim();
          if (rowId === targetId) {
            rowIndex = i + 1;
            break;
          }
        }
      }

      // 2. Si no se encontró por ID, verificar si ya existe un registro para la misma Fecha, Colaborador y Proceso
      // para actualizarlo en vez de crear una fila duplicada
      if (rowIndex === -1) {
        const targetDate = formatDateString(data.date || "");
        const targetCode = (data.employeeCode || "").toString().trim().toUpperCase();
        const targetEmpId = (data.employeeId || "").toString().trim();
        const targetProc = (data.processType || "General").toString().trim().toLowerCase();

        if (targetDate && (targetCode || targetEmpId)) {
          for (let i = 1; i < values.length; i++) {
            const rowDate = formatDateString(values[i][1]);
            const rowCode = (values[i][3] || "").toString().trim().toUpperCase();
            const rowProc = (values[i][5] || "").toString().trim().toLowerCase();
            const rowEmpId = (values[i][16] || "").toString().trim();

            const matchDate = rowDate === targetDate;
            const matchEmp = (targetEmpId && rowEmpId === targetEmpId) || (targetCode && rowCode === targetCode);
            const matchProc = rowProc === targetProc;

            if (matchDate && matchEmp && matchProc) {
              rowIndex = i + 1;
              if (!targetId && values[i][0]) {
                data.id = values[i][0].toString();
              }
              break;
            }
          }
        }
      }

      const rowData = [
        data.id || targetId || "rec_" + new Date().getTime(),
        formatDateString(data.date) || "",
        data.employeeName || "",
        data.employeeCode || "",
        data.area || "HACCP",
        data.processType || "General",
        data.processExitTime || "-",
        data.hoursText || "",
        parseFloat(data.decimalHours) || 0,
        data.justification || "",
        data.hadVacation ? "SÍ" : "NO",
        data.vacationFrom || "",
        data.vacationTo || "",
        parseInt(data.vacationDays, 10) || 0,
        data.hasSignature ? "SÍ" : "NO",
        data.timestamp || now,
        data.employeeId || ""
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }

      return createJsonResponse({
        status: "success",
        message: rowIndex > 0 ? "Registro de horas extras actualizado en Google Sheets" : "Registro de horas extras guardado en Google Sheets",
        id: rowData[0]
      });
    }

    if (action === "delete_record") {
      const sheet = getOrCreateSheet(ss, "HorasExtras_HACCP", HEADERS_HORAS, "#312e81");
      const targetId = (data.id || "").toString().trim();
      const deleted = deleteRowInMemory(sheet, targetId, 0);

      return createJsonResponse({
        status: "success",
        deleted: deleted,
        message: deleted ? "Registro de horas eliminado de Google Sheets" : "Registro no encontrado"
      });
    }

    // =========================================================================
    // MÓDULO 3: CONTROL DE SALIDA DE PROCESOS (CRUD EN LOTE)
    // =========================================================================
    if (action === "save_process_control") {
      const sheet = getOrCreateSheet(ss, "SalidaProcesos", HEADERS_PROCESOS, "#059669");
      const periodId = (data.periodId || "").toString().trim();
      const periodTitle = (data.periodTitle || "General").toString().trim();

      const existingData = sheet.getDataRange().getValues();
      
      // Filtrar en memoria para excluir filas del período a reemplazar
      const remainingRows = existingData.filter((r, idx) => {
        if (idx === 0) return true; // Mantener encabezado
        const rowPId = (r[0] || "").toString().trim();
        const rowPTitle = (r[1] || "").toString().trim();
        if (periodId && rowPId === periodId) return false;
        if (periodTitle && rowPTitle === periodTitle) return false;
        return true;
      });

      // Crear las nuevas filas en memoria
      const newRows = [];
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        data.rows.forEach(r => {
          newRows.push([
            periodId || periodTitle,
            periodTitle,
            r.date || "",
            r.day || "",
            formatTimeString(r.horaMatanza),
            formatTimeString(r.horaViscera),
            formatTimeString(r.horaDeshuese),
            formatTimeString(r.horaDescargaCarton),
            r.observaciones || "",
            now
          ]);
        });
      } else {
        // Preservar el período nuevo en Google Sheets aunque aún no tenga filas de fechas
        newRows.push([
          periodId || periodTitle,
          periodTitle,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          now
        ]);
      }

      const finalData = remainingRows.concat(newRows);
      sheet.clearContents();
      sheet.getRange(1, 1, finalData.length, finalData[0].length).setValues(finalData);

      return createJsonResponse({
        status: "success",
        message: "Control de Salida de Procesos guardado en Google Sheets",
        periodId: periodId
      });
    }

    if (action === "delete_process_period") {
      const sheet = getOrCreateSheet(ss, "SalidaProcesos", HEADERS_PROCESOS, "#059669");
      const periodId = (data.periodId || "").toString().trim();
      const periodTitle = (data.periodTitle || "").toString().trim();

      const existingData = sheet.getDataRange().getValues();
      let deletedCount = 0;
      const remainingRows = existingData.filter((r, idx) => {
        if (idx === 0) return true; // Encabezado
        const rowPId = (r[0] || "").toString().trim();
        const rowPTitle = (r[1] || "").toString().trim();
        if ((periodId && rowPId === periodId) || (periodTitle && rowPTitle === periodTitle)) {
          deletedCount++;
          return false;
        }
        return true;
      });

      sheet.clearContents();
      if (remainingRows.length > 0) {
        sheet.getRange(1, 1, remainingRows.length, remainingRows[0].length).setValues(remainingRows);
      }

      return createJsonResponse({
        status: "success",
        deletedCount: deletedCount,
        message: "Se eliminaron " + deletedCount + " filas del período"
      });
    }

    // =========================================================================
    // MÓDULO 4: GESTIÓN DE USUARIOS DEL PANEL (ADMIN Y VISOR) (CRUD)
    // =========================================================================
    if (action === "save_admin_user") {
      const sheet = getOrCreateSheet(ss, "Usuarios_Panel", HEADERS_USUARIOS, "#b45309");
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;

      const targetId = (data.id || "").toString().trim();
      const targetUser = (data.username || "").toString().trim().toLowerCase();

      for (let i = 1; i < values.length; i++) {
        const rowId = (values[i][0] || "").toString().trim();
        const rowUser = (values[i][1] || "").toString().trim().toLowerCase();
        if ((targetId && rowId === targetId) || (targetUser && rowUser === targetUser)) {
          rowIndex = i + 1;
          break;
        }
      }

      const existingPass = rowIndex > 0 ? values[rowIndex - 1][2] : "";
      const rowData = [
        targetId || "adm_" + new Date().getTime(),
        targetUser,
        data.password ? data.password : existingPass,
        data.name || data.username || "Usuario",
        data.role || "visor",
        data.createdAt || now,
        "ACTIVO"
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }

      return createJsonResponse({
        status: "success",
        message: "Usuario del panel guardado en Google Sheets",
        id: rowData[0]
      });
    }

    if (action === "delete_admin_user") {
      const sheet = getOrCreateSheet(ss, "Usuarios_Panel", HEADERS_USUARIOS, "#b45309");
      const targetId = (data.id || "").toString().trim();
      const targetUser = (data.username || "").toString().trim().toLowerCase();
      
      const values = sheet.getDataRange().getValues();
      let deleted = false;
      const remainingRows = values.filter((r, idx) => {
        if (idx === 0) return true;
        const rowId = (r[0] || "").toString().trim();
        const rowUser = (r[1] || "").toString().trim().toLowerCase();
        if ((targetId && rowId === targetId) || (targetUser && rowUser === targetUser)) {
          deleted = true;
          return false;
        }
        return true;
      });

      if (deleted) {
        sheet.clearContents();
        sheet.getRange(1, 1, remainingRows.length, remainingRows[0].length).setValues(remainingRows);
      }

      return createJsonResponse({
        status: "success",
        deleted: deleted,
        message: deleted ? "Usuario del panel eliminado de Google Sheets" : "Usuario no encontrado"
      });
    }

    // =========================================================================
    // ACCIÓN MASIVA: Sincronización masiva de TODO el sistema a Google Sheets
    // =========================================================================
    if (action === "sync_all_data") {
      // 1. Empleados en lote
      if (Array.isArray(data.employees)) {
        const sheetEmp = getOrCreateSheet(ss, "Empleados_Enlaces", HEADERS_EMPLEADOS, "#1e3a8a");
        const empRows = [HEADERS_EMPLEADOS];
        data.employees.forEach(emp => {
          empRows.push([
            emp.id, emp.code, emp.name, emp.area, emp.role, emp.phone,
            emp.webUrl, emp.whatsappUrl, emp.active || "ACTIVO", now
          ]);
        });
        sheetEmp.clearContents();
        sheetEmp.getRange(1, 1, empRows.length, empRows[0].length).setValues(empRows);
      }

      // 2. Procesos en lote
      if (Array.isArray(data.processControls)) {
        const sheetProc = getOrCreateSheet(ss, "SalidaProcesos", HEADERS_PROCESOS, "#059669");
        const procRows = [HEADERS_PROCESOS];
        data.processControls.forEach(p => {
          if (p.rows && p.rows.length > 0) {
            p.rows.forEach(r => {
              procRows.push([
                p.periodId || p.periodTitle,
                p.periodTitle,
                r.date || "",
                r.day || "",
                formatTimeString(r.horaMatanza),
                formatTimeString(r.horaViscera),
                formatTimeString(r.horaDeshuese),
                formatTimeString(r.horaDescargaCarton),
                r.observaciones || "",
                now
              ]);
            });
          } else {
            procRows.push([
              p.periodId || p.periodTitle,
              p.periodTitle,
              "", "", "", "", "", "", "", now
            ]);
          }
        });
        sheetProc.clearContents();
        sheetProc.getRange(1, 1, procRows.length, procRows[0].length).setValues(procRows);
      }

      // 3. Registros de horas extras en lote
      if (Array.isArray(data.records)) {
        const sheetOt = getOrCreateSheet(ss, "HorasExtras_HACCP", HEADERS_HORAS, "#312e81");
        const otRows = [HEADERS_HORAS];
        data.records.forEach(r => {
          otRows.push([
            r.id, r.date, r.employeeName, r.employeeCode, r.area,
            r.processType || "General", r.processExitTime || "-", r.hoursText,
            r.decimalHours, r.justification, r.hadVacation, r.vacationFrom,
            r.vacationTo, r.vacationDays, r.hasSignature, r.timestamp, r.employeeId || ""
          ]);
        });
        sheetOt.clearContents();
        sheetOt.getRange(1, 1, otRows.length, otRows[0].length).setValues(otRows);
      }

      // 4. Usuarios en lote
      if (Array.isArray(data.adminUsers)) {
        const sheetUsr = getOrCreateSheet(ss, "Usuarios_Panel", HEADERS_USUARIOS, "#b45309");
        const usrRows = [HEADERS_USUARIOS];
        data.adminUsers.forEach(u => {
          usrRows.push([
            u.id, u.username, u.password, u.name, u.role, u.createdAt || now, "ACTIVO"
          ]);
        });
        sheetUsr.clearContents();
        sheetUsr.getRange(1, 1, usrRows.length, usrRows[0].length).setValues(usrRows);
      }

      return createJsonResponse({
        status: "success",
        message: "Todo el sistema fue sincronizado a Google Sheets exitosamente"
      });
    }

    // Ping o prueba de conexión
    return createJsonResponse({
      status: "success",
      message: "Conexión establecida correctamente con Google Sheets (Ultra-Fast Batch Mode)",
      sheets: ["Empleados_Enlaces", "HorasExtras_HACCP", "SalidaProcesos", "Usuarios_Panel"],
      timestamp: now
    });

  } catch (error) {
    return createJsonResponse({ status: "error", error: error.toString() });
  } finally {
    try {
      lock.releaseLock();
    } catch (eLock) {}
  }
}

/**
 * Manejador para peticiones GET (Lectura y verificación de estado en navegador)
 */
function doGet(e) {
  try {
    const ss = getSafeSpreadsheet_();
    const action = e && e.parameter ? (e.parameter.action || "") : "";

    if (action === "poblar_datos_iniciales") {
      poblarDatosIniciales();
    }

    if (action === "get_all_data" || action === "read" || action === "poblar_datos_iniciales") {
      const fullData = readAllDataFromSpreadsheet(ss);
      return createJsonResponse({
        status: "success",
        timestamp: new Date().toLocaleString(),
        ...fullData
      });
    }

    return createJsonResponse({
      status: "online",
      system: "MACESA HACCP API",
      version: "5.0-batch",
      modules: [
        "Gestión de Empleados y Enlaces WhatsApp",
        "Registros Detallados de Horas Extras",
        "Módulo de Control de Salida de Procesos",
        "Gestión de Usuarios del Panel (Admin y Visor)"
      ],
      capabilities: ["CREATE", "READ", "UPDATE", "DELETE", "BATCH_OPERATIONS"]
    });
  } catch (error) {
    return createJsonResponse({ status: "error", error: error.toString() });
  }
}

/**
 * Elimina una fila en memoria y escribe de una sola vez
 */
function deleteRowInMemory(sheet, targetId, idColIndex) {
  const values = sheet.getDataRange().getValues();
  let deleted = false;
  const remaining = values.filter((r, idx) => {
    if (idx === 0) return true; // Encabezado
    const rowId = (r[idColIndex] || "").toString().trim();
    if (rowId === targetId) {
      deleted = true;
      return false;
    }
    return true;
  });

  if (deleted) {
    sheet.clearContents();
    sheet.getRange(1, 1, remaining.length, remaining[0].length).setValues(remaining);
  }
  return deleted;
}

/**
 * Lee y estructura todos los datos de las 4 hojas de cálculo (1 solo getValues por hoja)
 */
function readAllDataFromSpreadsheet(ss) {
  if (!ss || typeof ss.getSheetByName !== 'function') {
    ss = getSafeSpreadsheet_();
  }
  // 1. Empleados
  const sheetEmp = ss.getSheetByName("Empleados_Enlaces");
  const employees = [];
  if (sheetEmp && sheetEmp.getLastRow() > 1) {
    const vals = sheetEmp.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (r[0] || r[2]) {
        employees.push({
          id: String(r[0] || ""),
          code: String(r[1] || ""),
          name: String(r[2] || ""),
          area: String(r[3] || "Equipo HACCP"),
          role: String(r[4] || "Inspector"),
          phone: String(r[5] || ""),
          webUrl: String(r[6] || ""),
          whatsappUrl: String(r[7] || ""),
          active: String(r[8]).toUpperCase() !== "INACTIVO",
          createdAt: String(r[9] || "")
        });
      }
    }
  }

  // 2. Horas Extras
  const sheetOt = ss.getSheetByName("HorasExtras_HACCP");
  const records = [];
  if (sheetOt && sheetOt.getLastRow() > 1) {
    const vals = sheetOt.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (r[0] || r[1]) {
        records.push({
          id: String(r[0] || ""),
          date: formatDateString(r[1]),
          employeeName: String(r[2] || ""),
          employeeCode: String(r[3] || ""),
          area: String(r[4] || ""),
          processType: String(r[5] || "General"),
          processExitTime: String(r[6] || "-"),
          hoursText: String(r[7] || ""),
          decimalHours: parseFloat(r[8]) || 0,
          justification: String(r[9] || ""),
          hadVacation: String(r[10]).toUpperCase() === "SÍ" || String(r[10]).toUpperCase() === "SI",
          vacationFrom: formatDateString(r[11]),
          vacationTo: formatDateString(r[12]),
          vacationDays: parseInt(r[13], 10) || 0,
          signature: (String(r[14]).toUpperCase() === "SÍ" || String(r[14]).toUpperCase() === "SI") ? "HAS_SIGNATURE" : null,
          createdAt: String(r[15] || ""),
          employeeId: String(r[16] || "")
        });
      }
    }
  }

  // 3. Salida de Procesos
  const sheetProc = ss.getSheetByName("SalidaProcesos");
  const periodsMap = {};
  if (sheetProc && sheetProc.getLastRow() > 1) {
    const vals = sheetProc.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      const pId = String(r[0] || "general").trim();
      const pTitle = String(r[1] || r[0] || "General").trim();

      if (!pId && !pTitle) continue;

      if (!periodsMap[pId]) {
        periodsMap[pId] = {
          periodId: pId,
          periodTitle: pTitle,
          rows: []
        };
      }

      // Si la fila tiene al menos fecha o alguna hora, agregar a las filas del período
      if (r[2] || r[4] || r[5] || r[6] || r[7]) {
        periodsMap[pId].rows.push({
          date: formatDateString(r[2]),
          day: String(r[3] || ""),
          horaMatanza: formatTimeString(r[4]),
          horaViscera: formatTimeString(r[5]),
          horaDeshuese: formatTimeString(r[6]),
          horaDescargaCarton: formatTimeString(r[7]),
          observaciones: String(r[8] || "")
        });
      }
    }
  }
  const processControls = Object.values(periodsMap);

  // 4. Usuarios del Panel
  const sheetUsr = ss.getSheetByName("Usuarios_Panel");
  const adminUsers = [];
  if (sheetUsr && sheetUsr.getLastRow() > 1) {
    const vals = sheetUsr.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (r[0] || r[1]) {
        adminUsers.push({
          id: String(r[0] || ""),
          username: String(r[1] || "").toLowerCase(),
          password: String(r[2] || ""),
          name: String(r[3] || ""),
          role: String(r[4] || "visor").toLowerCase(),
          createdAt: String(r[5] || "")
        });
      }
    }
  }

  return {
    employees,
    records,
    processControls,
    adminUsers
  };
}

function formatDateString(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}

/**
 * Normaliza cualquier valor de hora de Google Sheets (Date, texto con segundos, etc.)
 * a formato estricto hh:mm (ej: "15:30")
 */
function formatTimeString(val) {
  if (!val && val !== 0) return "";
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, "0");
    const m = String(val.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  const str = String(val).trim();
  if (!str || str === "-" || str.toLowerCase() === "pendiente" || str.toLowerCase() === "sin registro") return "";
  const match = str.match(/(\d{1,2}):(\d{1,2})/);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2].padStart(2, "0");
    return `${h}:${m}`;
  }
  return str;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
