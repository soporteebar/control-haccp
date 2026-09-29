/**
 * ==============================================================================
 * CodigoGoogleAppsScript.gs - Conector de Google Sheets para Sistema HACCP MACESA
 * ==============================================================================
 * Este script se coloca en Google Apps Script dentro de tu hoja de cálculo.
 * Permite recibir en tiempo real los registros de horas extras y salidas de procesos
 * enviados por los colaboradores desde GitHub Pages sin pagar servidores ni bases de datos.
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Hoja de Horas Extras HACCP
  let sheetOvertime = ss.getSheetByName("HorasExtras_HACCP");
  if (!sheetOvertime) {
    sheetOvertime = ss.insertSheet("HorasExtras_HACCP");
    const headers = [
      "ID Registro",
      "Fecha Turno",
      "Nombre del Empleado",
      "Código",
      "Área / Proceso",
      "Horas (Texto)",
      "Horas (Decimal)",
      "Justificación de Actividades",
      "¿Tomó Vacaciones?",
      "Vacaciones Desde",
      "Vacaciones Hasta",
      "Días Vacaciones",
      "Tiene Firma Digital",
      "Fecha / Hora Registro"
    ];
    sheetOvertime.appendRow(headers);
    const range = sheetOvertime.getRange(1, 1, 1, headers.length);
    range.setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
    sheetOvertime.setFrozenRows(1);
  }

  // 2. Hoja de Salida de Procesos
  let sheetProcesses = ss.getSheetByName("SalidaProcesos");
  if (!sheetProcesses) {
    sheetProcesses = ss.insertSheet("SalidaProcesos");
    const headers = [
      "Período",
      "Fecha",
      "Día",
      "Hora Matanza",
      "Hora Víscera",
      "Hora Deshues",
      "Hora Descarga Cartón",
      "Observaciones",
      "Última Modificación"
    ];
    sheetProcesses.appendRow(headers);
    const range = sheetProcesses.getRange(1, 1, 1, headers.length);
    range.setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
    sheetProcesses.setFrozenRows(1);
  }
}

function doPost(e) {
  try {
    setupSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Obtener datos enviados desde la aplicación web
    const postData = e.postData.contents;
    const data = JSON.parse(postData);

    // Acción 1: Registro diario de Horas Extras enviado por el empleado
    if (data.action === "add_overtime") {
      const sheet = ss.getSheetByName("HorasExtras_HACCP");
      sheet.appendRow([
        data.id || "rec_" + new Date().getTime(),
        data.date || "",
        data.employeeName || "",
        data.employeeCode || "",
        data.area || "",
        data.hoursText || "",
        data.decimalHours || 0,
        data.justification || "",
        data.hadVacation || "NO",
        data.vacationFrom || "",
        data.vacationTo || "",
        data.vacationDays || 0,
        data.hasSignature ? "SÍ" : "NO",
        data.timestamp || new Date().toISOString()
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Registro de horas guardado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Acción 2: Guardado del Control de Salida de Procesos
    if (data.action === "save_process_control") {
      const sheet = ss.getSheetByName("SalidaProcesos");
      const periodTitle = data.periodTitle || "General";
      const now = new Date().toLocaleString();

      if (data.rows && data.rows.length > 0) {
        data.rows.forEach(r => {
          sheet.appendRow([
            periodTitle,
            r.date || "",
            r.day || "",
            r.horaMatanza || "",
            r.horaViscera || "",
            r.horaDeshuese || "",
            r.horaDescargaCarton || "",
            r.observaciones || "",
            now
          ]);
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Salida de procesos guardada" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ping o prueba de conexión
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Conexión establecida correctamente" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "online", system: "MACESA HACCP API" }))
    .setMimeType(ContentService.MimeType.JSON);
}
