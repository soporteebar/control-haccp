/**
 * ==============================================================================
 * CodigoGoogleAppsScript.gs - Conector de Google Sheets para Sistema HACCP MACESA
 * ==============================================================================
 * Este script se coloca en Google Apps Script dentro de tu hoja de cálculo.
 * Centraliza y alimenta en tiempo real:
 * 1. Directorio de Empleados y Enlaces directos para WhatsApp (Empleados_Enlaces)
 * 2. Registros diarios de Horas Extras y Justificaciones (HorasExtras_HACCP)
 * 3. Planilla de Control de Salida de Procesos (SalidaProcesos)
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Hoja de Gestión de Empleados y Enlaces para WhatsApp
  let sheetEmployees = ss.getSheetByName("Empleados_Enlaces");
  if (!sheetEmployees) {
    sheetEmployees = ss.insertSheet("Empleados_Enlaces");
    const headers = [
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
    sheetEmployees.appendRow(headers);
    const range = sheetEmployees.getRange(1, 1, 1, headers.length);
    range.setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
    sheetEmployees.setFrozenRows(1);
  }

  // 2. Hoja de Horas Extras HACCP
  let sheetOvertime = ss.getSheetByName("HorasExtras_HACCP");
  if (!sheetOvertime) {
    sheetOvertime = ss.insertSheet("HorasExtras_HACCP");
    const headers = [
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
      "Fecha / Hora Registro"
    ];
    sheetOvertime.appendRow(headers);
    const range = sheetOvertime.getRange(1, 1, 1, headers.length);
    range.setBackground("#312e81").setFontColor("#ffffff").setFontWeight("bold");
    sheetOvertime.setFrozenRows(1);
  }

  // 3. Hoja de Salida de Procesos
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
    const now = new Date().toLocaleString();

    // =========================================================================
    // ACCIÓN 1: Guardar o actualizar un empleado individual con enlace WhatsApp
    // =========================================================================
    if (data.action === "save_employee") {
      const sheet = ss.getSheetByName("Empleados_Enlaces");
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;

      // Buscar si ya existe por ID o Código
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id || (data.code && values[i][1] === data.code)) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowData = [
        data.id || "emp_" + new Date().getTime(),
        data.code || "",
        data.name || "",
        data.area || "Equipo HACCP",
        data.role || "Inspector de Calidad",
        data.phone || "",
        data.webUrl || "",
        data.whatsappUrl || "",
        data.active || "ACTIVO",
        now
      ];

      if (rowIndex > 0) {
        // Actualizar fila existente
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        // Nueva fila
        sheet.appendRow(rowData);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Empleado guardado en Google Sheets" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACCIÓN 2: Sincronizar directorio completo de empleados con enlaces
    // =========================================================================
    if (data.action === "sync_all_employees" && Array.isArray(data.employees)) {
      const sheet = ss.getSheetByName("Empleados_Enlaces");
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }

      data.employees.forEach(emp => {
        sheet.appendRow([
          emp.id || "",
          emp.code || "",
          emp.name || "",
          emp.area || "Equipo HACCP",
          emp.role || "Inspector de Calidad",
          emp.phone || "",
          emp.webUrl || "",
          emp.whatsappUrl || "",
          emp.active || "ACTIVO",
          now
        ]);
      });

      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: data.employees.length, message: "Directorio de empleados actualizado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACCIÓN 3: Marcar empleado como Inactivo
    // =========================================================================
    if (data.action === "delete_employee") {
      const sheet = ss.getSheetByName("Empleados_Enlaces");
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          sheet.getRange(i + 1, 9).setValue("INACTIVO");
          sheet.getRange(i + 1, 10).setValue(now);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Empleado marcado inactivo" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACCIÓN 4: Registro diario de Horas Extras enviado por el empleado
    // =========================================================================
    if (data.action === "add_overtime") {
      const sheet = ss.getSheetByName("HorasExtras_HACCP");
      sheet.appendRow([
        data.id || "rec_" + new Date().getTime(),
        data.date || "",
        data.employeeName || "",
        data.employeeCode || "",
        data.area || "HACCP",
        data.processType || "General",
        data.processExitTime || "-",
        data.hoursText || "",
        data.decimalHours || 0,
        data.justification || "",
        data.hadVacation || "NO",
        data.vacationFrom || "",
        data.vacationTo || "",
        data.vacationDays || 0,
        data.hasSignature ? "SÍ" : "NO",
        data.timestamp || now
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Registro de horas guardado" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACCIÓN 5: Guardado del Control de Salida de Procesos
    // =========================================================================
    if (data.action === "save_process_control") {
      const sheet = ss.getSheetByName("SalidaProcesos");
      const periodTitle = data.periodTitle || "General";

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

    // =========================================================================
    // ACCIÓN 6: Sincronización masiva de TODO el sistema
    // =========================================================================
    if (data.action === "sync_all_data") {
      // 1. Empleados
      if (Array.isArray(data.employees)) {
        const sheetEmp = ss.getSheetByName("Empleados_Enlaces");
        const lastRowEmp = sheetEmp.getLastRow();
        if (lastRowEmp > 1) sheetEmp.deleteRows(2, lastRowEmp - 1);
        data.employees.forEach(emp => {
          sheetEmp.appendRow([emp.id, emp.code, emp.name, emp.area, emp.role, emp.phone, emp.webUrl, emp.whatsappUrl, emp.active || "ACTIVO", now]);
        });
      }

      // 2. Procesos
      if (Array.isArray(data.processControls)) {
        const sheetProc = ss.getSheetByName("SalidaProcesos");
        const lastRowProc = sheetProc.getLastRow();
        if (lastRowProc > 1) sheetProc.deleteRows(2, lastRowProc - 1);
        data.processControls.forEach(p => {
          (p.rows || []).forEach(r => {
            sheetProc.appendRow([p.periodTitle, r.date, r.day, r.horaMatanza, r.horaViscera, r.horaDeshuese, r.horaDescargaCarton, r.observaciones, now]);
          });
        });
      }

      // 3. Registros de horas extras
      if (Array.isArray(data.records)) {
        const sheetOt = ss.getSheetByName("HorasExtras_HACCP");
        const lastRowOt = sheetOt.getLastRow();
        if (lastRowOt > 1) sheetOt.deleteRows(2, lastRowOt - 1);
        data.records.forEach(r => {
          sheetOt.appendRow([r.id, r.date, r.employeeName, r.employeeCode, r.area, r.processType || "General", r.processExitTime || "-", r.hoursText, r.decimalHours, r.justification, r.hadVacation, r.vacationFrom, r.vacationTo, r.vacationDays, r.hasSignature, r.timestamp]);
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Todo el sistema fue sincronizado a Google Sheets" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ping o prueba de conexión
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Conexión establecida correctamente con Google Sheets",
      sheets: ["Empleados_Enlaces", "HorasExtras_HACCP", "SalidaProcesos"],
      timestamp: now
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "MACESA HACCP API",
    version: "3.0",
    modules: ["Empleados y Enlaces WhatsApp", "Horas Extras HACCP", "Salida de Procesos"]
  })).setMimeType(ContentService.MimeType.JSON);
}
