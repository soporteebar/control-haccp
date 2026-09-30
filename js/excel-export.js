/**
 * excel-export.js - Generador de Hojas de Cálculo Excel (.xlsx) con SheetJS
 * Replica exactamente los formatos físicos de MACESA:
 * 1. Justificación de Horas Extras - Equipo HACCP (Imagen 2)
 * 2. Control de Salida de Procesos (Imagen 1)
 * 3. Consolidado General Administrativo
 */

const ExcelExport = {
  // Asegura que SheetJS esté disponible
  isAvailable() {
    return typeof XLSX !== 'undefined';
  },

  // 1. Exporta la boleta individual de Justificación de Horas Extras (Formato Oficial Imprimible en 1 Hoja)
  exportEmployeeOvertime(employee, records, vacations = [], periodLabel = '') {
    if (!this.isAvailable()) {
      alert('Error: La librería de Excel no se ha cargado.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Determinar rango de fechas si no se especificó periodLabel
    let periodText = periodLabel;
    if (!periodText && records.length > 0) {
      const dates = records.map(r => r.date).filter(Boolean).sort();
      if (dates.length > 0) {
        periodText = `${TimeUtils.formatDateDMY(dates[0])} al ${TimeUtils.formatDateDMY(dates[dates.length - 1])}`;
      }
    }
    if (!periodText) periodText = new Date().toLocaleDateString('es-ES');

    // Estructura oficial idéntica al formulario físico de MACESA (Imagen 2)
    const wsData = [
      ['MATADERO CENTRAL S.A. (MACESA)'],
      ['Justificación de Horas Extras- Equipo HACCP'],
      [],
      [`Nombre: ${employee.name}`, '', '', `Fecha: ${periodText}`, ''],
      [`Área: ${employee.area || 'Equipo HACCP'}`, '', '', `Código / Cédula: ${employee.code || 'N/A'}`, ''],
      [],
      ['FECHA', 'CANTIDAD DE HORAS EXTRAS', 'PROCESO', 'SALIDA PLANILLA', 'JUSTIFICACIÓN']
    ];

    let totalDecimal = 0;

    records.forEach(r => {
      const dec = parseFloat(r.decimalHours) || 0;
      totalDecimal += dec;
      const exitInfo = (typeof DB !== 'undefined' && DB.getProcessExitInfo) 
        ? DB.getProcessExitInfo(r.date, r.processType, r.justification)
        : { processName: r.processType || 'General', exitTime: '-' };

      wsData.push([
        TimeUtils.formatDateDMY(r.date),
        `${r.hoursText || TimeUtils.toHuman(dec)} (${dec.toFixed(2)}h)`,
        exitInfo.processName,
        exitInfo.exitTime,
        r.justification || ''
      ]);
    });

    const roundedTotal = Math.round(totalDecimal * 100) / 100;

    // Fila de Total de Horas
    wsData.push([
      'TOTAL DE HORAS:',
      `${roundedTotal.toFixed(2)} H`,
      `(${TimeUtils.toHuman(roundedTotal)})`,
      '',
      ''
    ]);

    // Tabla de Vacaciones (idéntica a la Imagen 2)
    wsData.push([]);
    wsData.push(['¿Vacaciones tomadas?', '', 'Fecha', '', 'Cantidad de dias']);
    wsData.push(['SI', 'NO', 'De:', 'hasta:', '']);

    const hasVacations = vacations && vacations.length > 0 && vacations.some(v => v.taken);
    if (hasVacations) {
      vacations.filter(v => v.taken).forEach(v => {
        wsData.push(['X', '', TimeUtils.formatDateDMY(v.fromDate), TimeUtils.formatDateDMY(v.toDate), v.daysCount || 0]);
      });
    } else {
      wsData.push(['', 'X', '-', '-', '0']);
    }
    // Fila en blanco decorativa de vacaciones
    wsData.push(['', '', '', '', '']);

    // Sección de Firmas Físicas al pie de la página
    wsData.push([]);
    wsData.push([
      '________________________________________',
      '',
      '',
      '________________________________________',
      ''
    ]);
    wsData.push([
      'Firma del Empleado',
      '',
      '',
      'Firma Supervisor / Responsable HACCP',
      ''
    ]);
    wsData.push([
      `Nombre: ${employee.name}`,
      '',
      '',
      'Revisado y Aprobado',
      ''
    ]);

    const syncTime = (typeof DB !== 'undefined' && DB.SyncEngine && DB.SyncEngine.lastSyncTime)
      ? DB.SyncEngine.lastSyncTime.toLocaleString('es-ES')
      : new Date().toLocaleString('es-ES');
    wsData.push([]);
    wsData.push([`Documento emitido conforme a datos sincronizados en Google Sheets (${syncTime})`, '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Anchos de columnas optimizados para ajustar perfectamente en 1 hoja carta vertical
    ws['!cols'] = [
      { wch: 13 }, // Fecha
      { wch: 25 }, // Cantidad de Horas Extras
      { wch: 18 }, // Proceso
      { wch: 15 }, // Salida Planilla
      { wch: 45 }  // Justificación
    ];

    // Merges para títulos, cabeceras y firmas
    const headerRowIdx = 6;
    const totalRowIdx = headerRowIdx + records.length + 1;
    const vacTitleRowIdx = totalRowIdx + 2;
    const vacHeaderRowIdx = vacTitleRowIdx + 1;
    const vacRowsCount = hasVacations ? vacations.filter(v => v.taken).length + 1 : 2;
    const sigLineIdx = vacHeaderRowIdx + vacRowsCount + 2;

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // MACESA
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Justificación de Horas Extras
      { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Nombre
      { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } }, // Fecha
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // Area
      { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } }, // Codigo
      // Total de horas (columnas C a E)
      { s: { r: totalRowIdx, c: 2 }, e: { r: totalRowIdx, c: 4 } },
      // Vacaciones headers
      { s: { r: vacTitleRowIdx, c: 0 }, e: { r: vacTitleRowIdx, c: 1 } },
      { s: { r: vacTitleRowIdx, c: 2 }, e: { r: vacTitleRowIdx, c: 3 } },
      // Firmas
      { s: { r: sigLineIdx, c: 0 }, e: { r: sigLineIdx, c: 1 } },
      { s: { r: sigLineIdx, c: 3 }, e: { r: sigLineIdx, c: 4 } },
      { s: { r: sigLineIdx + 1, c: 0 }, e: { r: sigLineIdx + 1, c: 1 } },
      { s: { r: sigLineIdx + 1, c: 3 }, e: { r: sigLineIdx + 1, c: 4 } },
      { s: { r: sigLineIdx + 2, c: 0 }, e: { r: sigLineIdx + 2, c: 1 } },
      { s: { r: sigLineIdx + 2, c: 3 }, e: { r: sigLineIdx + 2, c: 4 } },
      { s: { r: sigLineIdx + 4, c: 0 }, e: { r: sigLineIdx + 4, c: 4 } } // Nota de sincronización Google Sheets
    ];

    // Configuración para impresión directa en 1 hoja carta/A4 en Excel
    ws['!pageSetup'] = {
      fitToWidth: 1,
      fitToHeight: 1,
      fitToPage: true,
      orientation: 'portrait',
      paperSize: 1 // 1 = Letter
    };
    ws['!properties'] = {
      pageSetUpPr: { fitToPage: true }
    };
    ws['!margins'] = {
      left: 0.3,
      right: 0.3,
      top: 0.3,
      bottom: 0.3,
      header: 0.1,
      footer: 0.1
    };

    XLSX.utils.book_append_sheet(wb, ws, 'Boleta Horas Extras');

    const cleanName = employee.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Boleta_Horas_Extras_${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  // 2. Exporta el formato "Control de Salida de Procesos" (Imagen 1)
  exportProcessControl(processData) {
    if (!this.isAvailable()) {
      alert('Error: La librería de Excel no se ha cargado.');
      return;
    }

    const wb = XLSX.utils.book_new();

    const wsData = [
      ['CONTROL DE SALIDA DE PROCESOS'],
      [`Periodo: ${processData.periodTitle || 'General'}`],
      ['Ingrese horas como 7:8, 6:30 o 10:05. Excel las mostrará como hh:mm.'],
      [],
      ['Fecha', 'Día', 'Hora Matanza', 'Hora Víscera', 'Hora Deshues', 'Hora Descarga Cartón', 'Observaciones']
    ];

    (processData.rows || []).forEach(r => {
      wsData.push([
        TimeUtils.formatDateDMY(r.date),
        r.day || TimeUtils.getDayName(r.date),
        TimeUtils.normalizeTimeString(r.horaMatanza),
        TimeUtils.normalizeTimeString(r.horaViscera),
        TimeUtils.normalizeTimeString(r.horaDeshuese),
        TimeUtils.normalizeTimeString(r.horaDescargaCarton),
        r.observaciones || ''
      ]);
    });

    const syncTimeProc = (typeof DB !== 'undefined' && DB.SyncEngine && DB.SyncEngine.lastSyncTime)
      ? DB.SyncEngine.lastSyncTime.toLocaleString('es-ES')
      : new Date().toLocaleString('es-ES');
    wsData.push([]);
    wsData.push([`Fuente: Sincronizado en la Nube con Google Sheets (${syncTimeProc})`]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar anchos
    ws['!cols'] = [
      { wch: 14 }, // Fecha
      { wch: 14 }, // Día
      { wch: 16 }, // Matanza
      { wch: 16 }, // Víscera
      { wch: 16 }, // Deshuese
      { wch: 22 }, // Descarga Cartón
      { wch: 45 }  // Observaciones
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Salida de Procesos');

    const cleanPeriod = (processData.periodTitle || 'periodo').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Control_Salida_Procesos_${cleanPeriod}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  // 3. Exporta Resumen Consolidado de todo el personal (Para Nómina)
  exportConsolidated(employees, allRecords, fromDate = '', toDate = '') {
    if (!this.isAvailable()) {
      alert('Error: La librería de Excel no se ha cargado.');
      return;
    }

    const wb = XLSX.utils.book_new();

    const wsData = [
      ['MACESA - CONSOLIDADO GENERAL DE HORAS EXTRAS'],
      [`Filtro: ${fromDate ? 'Desde: ' + TimeUtils.formatDateDMY(fromDate) : 'Histórico Completo'} ${toDate ? 'Hasta: ' + TimeUtils.formatDateDMY(toDate) : ''}`],
      [],
      ['Código', 'Nombre del Empleado', 'Área / Departamento', 'Cargo', 'Total Días Registrados', 'Total Horas Extras (Decimal)', 'Total Horas (Texto)']
    ];

    let grandTotal = 0;

    employees.forEach(emp => {
      const empRecords = allRecords.filter(r => r.employeeId === emp.id);
      const totalDec = empRecords.reduce((acc, r) => acc + (parseFloat(r.decimalHours) || 0), 0);
      grandTotal += totalDec;

      wsData.push([
        emp.code,
        emp.name,
        emp.area,
        emp.role,
        empRecords.length,
        Math.round(totalDec * 100) / 100,
        TimeUtils.toHuman(totalDec)
      ]);
    });

    wsData.push([]);
    wsData.push(['TOTAL GENERAL:', '', '', '', '', Math.round(grandTotal * 100) / 100, TimeUtils.toHuman(grandTotal)]);

    const syncTimeCons = (typeof DB !== 'undefined' && DB.SyncEngine && DB.SyncEngine.lastSyncTime)
      ? DB.SyncEngine.lastSyncTime.toLocaleString('es-ES')
      : new Date().toLocaleString('es-ES');
    wsData.push([]);
    wsData.push([`Fuente: Sincronizado en la Nube con Google Sheets (${syncTimeCons})`]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 12 },
      { wch: 32 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 26 },
      { wch: 26 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado General');

    const filename = `Consolidado_Horas_Extras_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }
};

window.ExcelExport = ExcelExport;
