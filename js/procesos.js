/**
 * procesos.js - Gestión del Módulo 'Control de Salida de Procesos'
 * Vista gerencial de tiempos de faena y empaque (Matanza, Vísceras, Deshuese, Cartón)
 */

const ProcesosModule = {
  currentPeriodId: null,
  currentRows: [],

  init() {
    this.bindEvents();
    this.loadPeriods();

    if (typeof DB !== 'undefined' && DB.SyncEngine) {
      DB.SyncEngine.onDataUpdated(() => {
        // Auto-refrescar si el usuario no está editando activamente celdas
        const active = document.activeElement;
        const isEditing = active && active.closest && active.closest('#processTableBody');
        if (!isEditing) {
          const currentId = this.currentPeriodId;
          this.loadPeriods();
          if (currentId && DB.getProcessControlByPeriod(currentId)) {
            this.selectPeriod(currentId);
          }
        }
      });
    }
  },

  bindEvents() {
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        this.selectPeriod(e.target.value);
      });
    }

    const btnNewPeriod = document.getElementById('btnNewPeriod');
    if (btnNewPeriod) {
      btnNewPeriod.addEventListener('click', () => this.showNewPeriodModal());
    }

    const btnDeletePeriod = document.getElementById('btnDeletePeriod');
    if (btnDeletePeriod) {
      btnDeletePeriod.addEventListener('click', () => this.deleteCurrentPeriod());
    }

    const btnAddRow = document.getElementById('btnAddRow');
    if (btnAddRow) {
      btnAddRow.addEventListener('click', () => this.addRow());
    }

    const btnSaveProcesses = document.getElementById('btnSaveProcesses');
    if (btnSaveProcesses) {
      btnSaveProcesses.addEventListener('click', () => this.saveCurrentPeriod());
    }

    const btnExportProcessExcel = document.getElementById('btnExportProcessExcel');
    if (btnExportProcessExcel) {
      btnExportProcessExcel.addEventListener('click', () => this.exportToExcel());
    }
  },

  loadPeriods() {
    const periods = DB.getProcessControls();
    const periodSelect = document.getElementById('periodSelect');
    if (!periodSelect) return;

    periodSelect.innerHTML = '';
    if (periods.length === 0) {
      periodSelect.innerHTML = '<option value="">No hay períodos registrados</option>';
      this.currentPeriodId = null;
      this.currentRows = [];
      this.renderTable('Sin período seleccionado');
      return;
    }

    periods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.periodId;
      opt.textContent = `Período: ${p.periodTitle}`;
      periodSelect.appendChild(opt);
    });

    // Mantener seleccionado el período actual si aún existe, o seleccionar el primero
    const targetPeriod = (this.currentPeriodId && periods.some(p => p.periodId === this.currentPeriodId))
      ? this.currentPeriodId
      : periods[0].periodId;
    periodSelect.value = targetPeriod;
    this.selectPeriod(targetPeriod);
  },

  selectPeriod(periodId) {
    this.currentPeriodId = periodId;
    const period = DB.getProcessControlByPeriod(periodId);
    if (!period) return;

    this.currentRows = JSON.parse(JSON.stringify(period.rows || []));
    this.renderTable(period.periodTitle);
  },

  renderTable(periodTitle) {
    const titleEl = document.getElementById('processPeriodHeader');
    if (titleEl) {
      titleEl.textContent = `Periodo: ${periodTitle}`;
    }

    const tbody = document.getElementById('processTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (this.currentRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-gray-500">No hay registros de proceso para este período. Haz clic en "Agregar Fila".</td></tr>`;
      return;
    }

    this.currentRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      // Resaltado de mes o alternado según fecha
      const isOctober = row.date && row.date.includes('-10-');
      tr.className = isOctober ? 'row-october' : 'row-september';

      tr.innerHTML = `
        <td class="cell-date">
          <input type="date" value="${row.date || ''}" data-idx="${idx}" data-field="date" class="table-input date-trigger font-medium">
        </td>
        <td class="cell-day font-semibold text-slate-700 bg-slate-50">
          <span class="day-text" id="day_text_${idx}">${row.day || TimeUtils.getDayName(row.date)}</span>
        </td>
        <td>
          <input type="text" placeholder="hh:mm" value="${TimeUtils.normalizeTimeString(row.horaMatanza)}" data-idx="${idx}" data-field="horaMatanza" class="table-input time-input font-mono">
        </td>
        <td>
          <input type="text" placeholder="hh:mm" value="${TimeUtils.normalizeTimeString(row.horaViscera)}" data-idx="${idx}" data-field="horaViscera" class="table-input time-input font-mono">
        </td>
        <td>
          <input type="text" placeholder="hh:mm" value="${TimeUtils.normalizeTimeString(row.horaDeshuese)}" data-idx="${idx}" data-field="horaDeshuese" class="table-input time-input font-mono">
        </td>
        <td>
          <input type="text" placeholder="hh:mm" value="${TimeUtils.normalizeTimeString(row.horaDescargaCarton)}" data-idx="${idx}" data-field="horaDescargaCarton" class="table-input time-input font-mono">
        </td>
        <td>
          <input type="text" placeholder="Observaciones del turno..." value="${row.observaciones || ''}" data-idx="${idx}" data-field="observaciones" class="table-input w-full">
        </td>
        <td class="text-center">
          <button type="button" class="btn-icon-danger" title="Eliminar fila" onclick="ProcesosModule.deleteRow(${idx})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Escuchadores de inputs en tabla
    tbody.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        let val = e.target.value;

        if (field.startsWith('hora')) {
          val = TimeUtils.normalizeTimeString(val);
          e.target.value = val;
        }

        this.currentRows[idx][field] = val;

        if (field === 'date') {
          const dayName = TimeUtils.getDayName(val);
          this.currentRows[idx].day = dayName;
          const daySpan = document.getElementById(`day_text_${idx}`);
          if (daySpan) daySpan.textContent = dayName;
        }
      });
    });
  },

  addRow() {
    if (!this.currentPeriodId) {
      alert('Por favor crea primero un período haciendo clic en "+ Nuevo Período".');
      return;
    }

    const lastRow = this.currentRows[this.currentRows.length - 1];
    let nextDate = '';
    if (lastRow && lastRow.date) {
      const d = new Date(lastRow.date + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().split('T')[0];
    } else {
      nextDate = new Date().toISOString().split('T')[0];
    }

    this.currentRows.push({
      date: nextDate,
      day: TimeUtils.getDayName(nextDate),
      horaMatanza: '',
      horaViscera: '',
      horaDeshuese: '',
      horaDescargaCarton: '',
      observaciones: ''
    });

    const period = DB.getProcessControlByPeriod(this.currentPeriodId);
    this.renderTable(period ? period.periodTitle : '');
  },

  deleteRow(idx) {
    if (confirm('¿Deseas eliminar esta fila del registro?')) {
      this.currentRows.splice(idx, 1);
      const period = DB.getProcessControlByPeriod(this.currentPeriodId);
      this.renderTable(period ? period.periodTitle : '');
    }
  },

  async deleteCurrentPeriod() {
    if (!this.currentPeriodId) {
      alert('No hay ningún período seleccionado para eliminar.');
      return;
    }

    const period = DB.getProcessControlByPeriod(this.currentPeriodId);
    const title = period ? period.periodTitle : this.currentPeriodId;

    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el período "${title}" y todos sus registros de procesos?`)) {
      const btn = document.getElementById('btnDeletePeriod');
      const origText = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Eliminando...';
      }

      try {
        if (typeof DB.deleteProcessControlAsync === 'function') {
          await DB.deleteProcessControlAsync(this.currentPeriodId);
        } else {
          DB.deleteProcessControl(this.currentPeriodId);
        }
        alert(`✅ Período "${title}" eliminado de Google Sheets y almacenamiento local.`);
        this.loadPeriods();
        if (window.AdminApp && typeof window.AdminApp.renderDashboard === 'function') {
          window.AdminApp.renderDashboard();
        }
      } catch (err) {
        console.error('Error eliminando período:', err);
        alert('❌ Error al eliminar: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = origText;
        }
      }
    }
  },

  async saveCurrentPeriod() {
    if (!this.currentPeriodId) {
      alert('No hay ningún período activo para guardar. Pulsa primero "+ Nuevo Período".');
      return;
    }
    const period = DB.getProcessControlByPeriod(this.currentPeriodId);
    if (!period) return;

    // Extraer valores actuales directamente de las filas del DOM para no perder cambios sin blur
    const tbody = document.getElementById('processTableBody');
    if (tbody) {
      const trs = tbody.querySelectorAll('tr');
      trs.forEach((tr, idx) => {
        if (!this.currentRows[idx]) return;
        const dateIn = tr.querySelector('[data-field="date"]');
        const hMat = tr.querySelector('[data-field="horaMatanza"]');
        const hVis = tr.querySelector('[data-field="horaViscera"]');
        const hDes = tr.querySelector('[data-field="horaDeshuese"]');
        const hCar = tr.querySelector('[data-field="horaDescargaCarton"]');
        const obs = tr.querySelector('[data-field="observaciones"]');

        if (dateIn && dateIn.value) {
          this.currentRows[idx].date = dateIn.value;
          this.currentRows[idx].day = TimeUtils.getDayName(dateIn.value);
        }
        if (hMat) this.currentRows[idx].horaMatanza = TimeUtils.normalizeTimeString(hMat.value);
        if (hVis) this.currentRows[idx].horaViscera = TimeUtils.normalizeTimeString(hVis.value);
        if (hDes) this.currentRows[idx].horaDeshuese = TimeUtils.normalizeTimeString(hDes.value);
        if (hCar) this.currentRows[idx].horaDescargaCarton = TimeUtils.normalizeTimeString(hCar.value);
        if (obs) this.currentRows[idx].observaciones = obs.value.trim();
      });
    }

    // Normalizar todas las horas de cada fila al formato estricto hh:mm
    this.currentRows.forEach(r => {
      r.horaMatanza = TimeUtils.normalizeTimeString(r.horaMatanza);
      r.horaViscera = TimeUtils.normalizeTimeString(r.horaViscera);
      r.horaDeshuese = TimeUtils.normalizeTimeString(r.horaDeshuese);
      r.horaDescargaCarton = TimeUtils.normalizeTimeString(r.horaDescargaCarton);
    });

    period.rows = this.currentRows;

    const btn = document.getElementById('btnSaveProcesses');
    const origText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Guardando en Google Sheets...';
    }

    try {
      if (typeof DB.saveProcessControlAsync === 'function') {
        const res = await DB.saveProcessControlAsync(period);
        if (res && res.cloudSynced) {
          alert('✅ Control de Salida de Procesos guardado y sincronizado en Google Sheets.');
        } else {
          alert(`⚠️ Guardado localmente, pero hubo un error al sincronizar con Google Sheets:\n\n${res?.syncError || 'Verifica la URL en la Pestaña 4 y la conexión'}`);
        }
      } else {
        DB.saveProcessControl(period);
        alert('✅ Control de Salida de Procesos guardado localmente.');
      }
      this.loadPeriods();
      this.selectPeriod(this.currentPeriodId);
    } catch (err) {
      console.error('Error guardando proceso:', err);
      alert('❌ Error al guardar: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = origText;
      }
    }
  },

  exportToExcel() {
    const period = DB.getProcessControlByPeriod(this.currentPeriodId);
    if (!period) {
      alert('Seleccione un período válido.');
      return;
    }
    // Asegurar filas más recientes
    period.rows = this.currentRows;
    ExcelExport.exportProcessControl(period);
  },

  async showNewPeriodModal() {
    const title = prompt('Ingresa el título o rango del nuevo período (ej: 11/10/2026 al 25/10/2026):');
    if (!title || !title.trim()) return;

    const config = DB.getConfig();
    if (!config.googleSheetsUrl) {
      const proceed = confirm(
        '⚠️ Atención: Aún no has configurado la URL de Google Sheets en la Pestaña 4.\n\n' +
        'El período se creará únicamente de forma local en este navegador hasta que ingreses tu URL de Google Sheets.\n\n' +
        '¿Deseas continuar y crearlo localmente?'
      );
      if (!proceed) return;
    }

    const btn = document.getElementById('btnNewPeriod');
    const origText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Creando período...';
    }

    const periodId = 'period_' + Date.now();
    const today = new Date().toISOString().split('T')[0];
    const newPeriod = {
      periodId,
      periodTitle: title.trim(),
      rows: [
        {
          date: today,
          day: TimeUtils.getDayName(today),
          horaMatanza: '',
          horaViscera: '',
          horaDeshuese: '',
          horaDescargaCarton: '',
          observaciones: ''
        }
      ]
    };

    try {
      this.currentPeriodId = periodId;
      let syncResult = null;
      if (typeof DB.saveProcessControlAsync === 'function') {
        syncResult = await DB.saveProcessControlAsync(newPeriod);
      } else {
        DB.saveProcessControl(newPeriod);
      }

      this.loadPeriods();
      this.selectPeriod(periodId);

      if (syncResult && syncResult.cloudSynced) {
        alert(`✅ Período "${title.trim()}" creado y guardado en Google Sheets.`);
      } else if (syncResult && syncResult.syncError) {
        alert(
          `⚠️ El período "${title.trim()}" se guardó localmente, pero NO se pudo subir a Google Sheets:\n\n` +
          `${syncResult.syncError}\n\n` +
          `Verifica tu URL en la Pestaña 4 y pulsa "Guardar Cambios de Procesos" para reintentar.`
        );
      } else {
        alert(`✅ Período "${title.trim()}" creado. Ya puedes ingresar los horarios de faena.`);
      }
    } catch (err) {
      console.error('Error creando período:', err);
      alert('❌ Error al crear el período: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = origText;
      }
    }
  }
};

window.ProcesosModule = ProcesosModule;
