/**
 * ==============================================================================
 * CodigoGoogleAppsScript.gs - Conector de Google Sheets para Sistema HACCP MACESA
 * ==============================================================================
 * Centraliza en Google Sheets con operaciones completas de CRUD (Crear, Leer,
 * Actualizar y Eliminar) los 4 módulos del sistema:
 * 1. Gestión de Empleados y Enlaces para WhatsApp (Hoja: Empleados_Enlaces)
 * 2. Registros Detallados de Horas Extras (Hoja: HorasExtras_HACCP)
 * 3. Módulo de Control de Salida de Procesos (Hoja: SalidaProcesos)
 * 4. Gestión de Usuarios del Panel Admin y Visor (Hoja: Usuarios_Panel)
 */

// Inicializa las 4 hojas con sus encabezados y estilos corporativos si no existen
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

  // 2. Hoja de Registros Detallados de Horas Extras HACCP
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
      "Fecha / Hora Registro",
      "ID Empleado"
    ];
    sheetOvertime.appendRow(headers);
    const range = sheetOvertime.getRange(1, 1, 1, headers.length);
    range.setBackground("#312e81").setFontColor("#ffffff").setFontWeight("bold");
    sheetOvertime.setFrozenRows(1);
  }

  // 3. Hoja de Módulo de Control de Salida de Procesos
  let sheetProcesses = ss.getSheetByName("SalidaProcesos");
  if (!sheetProcesses) {
    sheetProcesses = ss.insertSheet("SalidaProcesos");
    const headers = [
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
    sheetProcesses.appendRow(headers);
    const range = sheetProcesses.getRange(1, 1, 1, headers.length);
    range.setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
    sheetProcesses.setFrozenRows(1);
  }

  // 4. Hoja de Gestión de Usuarios del Panel (Admin y Visor)
  let sheetUsers = ss.getSheetByName("Usuarios_Panel");
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet("Usuarios_Panel");
    const headers = [
      "ID Usuario",
      "Nombre de Usuario (Login)",
      "Contraseña",
      "Nombre Completo",
      "Rol (admin / visor)",
      "Fecha Alta",
      "Estado"
    ];
    sheetUsers.appendRow(headers);
    const range = sheetUsers.getRange(1, 1, 1, headers.length);
    range.setBackground("#b45309").setFontColor("#ffffff").setFontWeight("bold");
    sheetUsers.setFrozenRows(1);

    // Usuarios iniciales por defecto
    sheetUsers.appendRow(["adm_01", "admin", "Admin25#", "Administrador General", "admin", "2026-08-01", "ACTIVO"]);
    sheetUsers.appendRow(["adm_02", "visor", "VisorDM", "Supervisor / Visor de Reportes", "visor", "2026-08-01", "ACTIVO"]);
  }
}

/**
 * Manejador principal para peticiones POST (Crear, Actualizar, Eliminar y Leer todo)
 */
function doPost(e) {
  try {
    setupSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

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
    // MÓDULO 1: GESTIÓN DE EMPLEADOS Y ENLACES WHATSAPP (CRUD)
    // =========================================================================
    
    // 1.1 CREATE / UPDATE: Guardar o actualizar un empleado individual
    if (action === "save_employee") {
      const sheet = ss.getSheetByName("Empleados_Enlaces");
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

    // 1.2 DELETE: Eliminar empleado
    if (action === "delete_employee") {
      const sheet = ss.getSheetByName("Empleados_Enlaces");
      const values = sheet.getDataRange().getValues();
      const targetId = (data.id || "").toString().trim();
      let deleted = false;

      for (let i = values.length - 1; i >= 1; i--) {
        const rowId = (values[i][0] || "").toString().trim();
        if (rowId === targetId) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }

      return createJsonResponse({
        status: "success",
        deleted: deleted,
        message: deleted ? "Empleado eliminado de Google Sheets" : "Empleado no encontrado"
      });
    }

    // 1.3 SYNC ALL EMPLOYEES: Reemplazo masivo de empleados
    if (action === "sync_all_employees" && Array.isArray(data.employees)) {
      const sheet = ss.getSheetByName("Empleados_Enlaces");
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }

      data.employees.forEach(emp => {
        sheet.appendRow([
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

      return createJsonResponse({
        status: "success",
        count: data.employees.length,
        message: "Directorio de empleados sincronizado completamente"
      });
    }

    // =========================================================================
    // MÓDULO 2: REGISTROS DETALLADOS DE HORAS EXTRAS (CRUD)
    // =========================================================================

    // 2.1 CREATE / UPDATE: Guardar o actualizar registro de horas extras
    if (action === "save_record" || action === "add_overtime") {
      const sheet = ss.getSheetByName("HorasExtras_HACCP");
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      const targetId = (data.id || "").toString().trim();

      if (targetId) {
        for (let i = 1; i < values.length; i++) {
          const rowId = (values[i][0] || "").toString().trim();
          if (rowId === targetId) {
            rowIndex = i + 1;
            break;
          }
        }
      }

      const rowData = [
        targetId || "rec_" + new Date().getTime(),
        data.date || "",
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
        message: "Registro de horas extras guardado en Google Sheets",
        id: rowData[0]
      });
    }

    // 2.2 DELETE: Eliminar un registro de horas extras por ID
    if (action === "delete_record") {
      const sheet = ss.getSheetByName("HorasExtras_HACCP");
      const values = sheet.getDataRange().getValues();
      const targetId = (data.id || "").toString().trim();
      let deleted = false;

      for (let i = values.length - 1; i >= 1; i--) {
        const rowId = (values[i][0] || "").toString().trim();
        if (rowId === targetId) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }

      return createJsonResponse({
        status: "success",
        deleted: deleted,
        message: deleted ? "Registro de horas eliminado de Google Sheets" : "Registro no encontrado"
      });
    }

    // =========================================================================
    // MÓDULO 3: CONTROL DE SALIDA DE PROCESOS (CRUD)
    // =========================================================================

    // 3.1 CREATE / UPDATE: Guardar o actualizar filas de un período de procesos
    if (action === "save_process_control") {
      const sheet = ss.getSheetByName("SalidaProcesos");
      const periodId = (data.periodId || "").toString().trim();
      const periodTitle = (data.periodTitle || "General").toString().trim();

      // Eliminar filas previas del mismo período para actualizar limpiamente
      const values = sheet.getDataRange().getValues();
      for (let i = values.length - 1; i >= 1; i--) {
        const rowPeriodId = (values[i][0] || "").toString().trim();
        const rowPeriodTitle = (values[i][1] || "").toString().trim();
        if ((periodId && rowPeriodId === periodId) || (periodTitle && rowPeriodTitle === periodTitle)) {
          sheet.deleteRow(i + 1);
        }
      }

      // Insertar las filas actualizadas
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        data.rows.forEach(r => {
          sheet.appendRow([
            periodId || periodTitle,
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

      return createJsonResponse({
        status: "success",
        message: "Control de Salida de Procesos guardado en Google Sheets",
        periodId: periodId
      });
    }

    // 3.2 DELETE: Eliminar un período completo de procesos
    if (action === "delete_process_period") {
      const sheet = ss.getSheetByName("SalidaProcesos");
      const periodId = (data.periodId || "").toString().trim();
      const periodTitle = (data.periodTitle || "").toString().trim();
      let deletedCount = 0;

      const values = sheet.getDataRange().getValues();
      for (let i = values.length - 1; i >= 1; i--) {
        const rowPeriodId = (values[i][0] || "").toString().trim();
        const rowPeriodTitle = (values[i][1] || "").toString().trim();
        if ((periodId && rowPeriodId === periodId) || (periodTitle && rowPeriodTitle === periodTitle)) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }

      return createJsonResponse({
        status: "success",
        deletedCount: deletedCount,
        message: `Se eliminaron ${deletedCount} filas del período en Google Sheets`
      });
    }

    // =========================================================================
    // MÓDULO 4: GESTIÓN DE USUARIOS DEL PANEL (ADMIN Y VISOR) (CRUD)
    // =========================================================================

    // 4.1 CREATE / UPDATE: Guardar o actualizar usuario del panel
    if (action === "save_admin_user") {
      const sheet = ss.getSheetByName("Usuarios_Panel");
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

    // 4.2 DELETE: Eliminar un usuario del panel
    if (action === "delete_admin_user") {
      const sheet = ss.getSheetByName("Usuarios_Panel");
      const values = sheet.getDataRange().getValues();
      const targetId = (data.id || "").toString().trim();
      const targetUser = (data.username || "").toString().trim().toLowerCase();
      let deleted = false;

      for (let i = values.length - 1; i >= 1; i--) {
        const rowId = (values[i][0] || "").toString().trim();
        const rowUser = (values[i][1] || "").toString().trim().toLowerCase();
        if ((targetId && rowId === targetId) || (targetUser && rowUser === targetUser)) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
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
      // 1. Empleados
      if (Array.isArray(data.employees)) {
        const sheetEmp = ss.getSheetByName("Empleados_Enlaces");
        const lastRowEmp = sheetEmp.getLastRow();
        if (lastRowEmp > 1) sheetEmp.deleteRows(2, lastRowEmp - 1);
        data.employees.forEach(emp => {
          sheetEmp.appendRow([
            emp.id,
            emp.code,
            emp.name,
            emp.area,
            emp.role,
            emp.phone,
            emp.webUrl,
            emp.whatsappUrl,
            emp.active || "ACTIVO",
            now
          ]);
        });
      }

      // 2. Procesos
      if (Array.isArray(data.processControls)) {
        const sheetProc = ss.getSheetByName("SalidaProcesos");
        const lastRowProc = sheetProc.getLastRow();
        if (lastRowProc > 1) sheetProc.deleteRows(2, lastRowProc - 1);
        data.processControls.forEach(p => {
          (p.rows || []).forEach(r => {
            sheetProc.appendRow([
              p.periodId || p.periodTitle,
              p.periodTitle,
              r.date,
              r.day,
              r.horaMatanza,
              r.horaViscera,
              r.horaDeshuese,
              r.horaDescargaCarton,
              r.observaciones,
              now
            ]);
          });
        });
      }

      // 3. Registros de horas extras
      if (Array.isArray(data.records)) {
        const sheetOt = ss.getSheetByName("HorasExtras_HACCP");
        const lastRowOt = sheetOt.getLastRow();
        if (lastRowOt > 1) sheetOt.deleteRows(2, lastRowOt - 1);
        data.records.forEach(r => {
          sheetOt.appendRow([
            r.id,
            r.date,
            r.employeeName,
            r.employeeCode,
            r.area,
            r.processType || "General",
            r.processExitTime || "-",
            r.hoursText,
            r.decimalHours,
            r.justification,
            r.hadVacation,
            r.vacationFrom,
            r.vacationTo,
            r.vacationDays,
            r.hasSignature,
            r.timestamp,
            r.employeeId || ""
          ]);
        });
      }

      // 4. Usuarios del panel
      if (Array.isArray(data.adminUsers)) {
        const sheetUsr = ss.getSheetByName("Usuarios_Panel");
        const lastRowUsr = sheetUsr.getLastRow();
        if (lastRowUsr > 1) sheetUsr.deleteRows(2, lastRowUsr - 1);
        data.adminUsers.forEach(u => {
          sheetUsr.appendRow([
            u.id,
            u.username,
            u.password,
            u.name,
            u.role,
            u.createdAt || now,
            "ACTIVO"
          ]);
        });
      }

      return createJsonResponse({
        status: "success",
        message: "Todo el sistema fue sincronizado a Google Sheets exitosamente"
      });
    }

    // Ping o prueba de conexión
    return createJsonResponse({
      status: "success",
      message: "Conexión establecida correctamente con Google Sheets",
      sheets: ["Empleados_Enlaces", "HorasExtras_HACCP", "SalidaProcesos", "Usuarios_Panel"],
      timestamp: now
    });

  } catch (error) {
    return createJsonResponse({ status: "error", error: error.toString() });
  }
}

/**
 * Manejador para peticiones GET (Lectura y verificación de estado en navegador)
 */
function doGet(e) {
  try {
    setupSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e && e.parameter ? (e.parameter.action || "") : "";

    if (action === "get_all_data" || action === "read") {
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
      version: "4.0",
      modules: [
        "Gestión de Empleados y Enlaces WhatsApp",
        "Registros Detallados de Horas Extras",
        "Módulo de Control de Salida de Procesos",
        "Gestión de Usuarios del Panel (Admin y Visor)"
      ],
      capabilities: ["CREATE", "READ", "UPDATE", "DELETE"]
    });
  } catch (error) {
    return createJsonResponse({ status: "error", error: error.toString() });
  }
}

/**
 * Lee y estructura todos los datos de las 4 hojas de cálculo
 */
function readAllDataFromSpreadsheet(ss) {
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

      if (!periodsMap[pId]) {
        periodsMap[pId] = {
          periodId: pId,
          periodTitle: pTitle,
          rows: []
        };
      }

      periodsMap[pId].rows.push({
        date: formatDateString(r[2]),
        day: String(r[3] || ""),
        horaMatanza: String(r[4] || ""),
        horaViscera: String(r[5] || ""),
        horaDeshuese: String(r[6] || ""),
        horaDescargaCarton: String(r[7] || ""),
        observaciones: String(r[8] || "")
      });
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

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
