/**
 * app-empleado.js - Controlador de la Página Exclusiva para Empleados
 * Permite registro diario de horas extras, justificación (>300 palabras), vacaciones y firma táctil.
 */

document.addEventListener('DOMContentLoaded', () => {
  EmpleadoApp.init();
});

const EmpleadoApp = {
  currentEmployee: null,
  signaturePad: null,
  selectedPeriodId: null,

  init() {
    this.initSignature();
    this.bindEvents();
    this.initPeriodSelector();
    this.initLiveSync();
    this.checkEmployeeAuth();
    this.setDefaultDate();
    this.updateHoursCalculation();
    this.updateWordCount();
  },

  initLiveSync() {
    DB.init();

    // Actualizar banner de conexión
    if (DB.SyncEngine) {
      DB.SyncEngine.onSyncStateChange((state, detail) => {
        this.updateSyncUI(state, detail);
      });

      DB.SyncEngine.onDataUpdated((summary) => {
        console.log('🔄 EmpleadoApp detectó cambios en Google Sheets');
        this.populatePeriodSelector();
        if (!this.currentEmployee) {
          this.checkEmployeeAuth();
        } else {
          this.renderHistory();
        }
      });

      this.updateSyncUI(DB.SyncEngine.currentState);
    }

    const btnRefresh = document.getElementById('btnEmpQuickRefresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.textContent = '⏳ Cargando...';
        btnRefresh.disabled = true;
        try {
          await DB.loadAllFromGoogleSheets();
          this.populatePeriodSelector();
          if (this.currentEmployee) {
            this.renderHistory();
          } else {
            this.checkEmployeeAuth();
          }
        } finally {
          btnRefresh.textContent = '🔄 Refrescar';
          btnRefresh.disabled = false;
        }
      });
    }

    // Consulta inicial a Google Sheets para refrescar directorio de colaboradores y procesos
    const conf = DB.getConfig();
    if (conf.googleSheetsUrl) {
      DB.loadAllFromGoogleSheets({ silent: true }).then(() => {
        this.populatePeriodSelector();
        if (!this.currentEmployee) {
          this.checkEmployeeAuth();
        } else {
          this.renderHistory();
        }
      });
    }
  },

  updateSyncUI(state, detail = null) {
    const banner = document.getElementById('empSyncBanner');
    const dot = document.getElementById('empSyncDot');
    const text = document.getElementById('empSyncText');
    if (!banner || !dot || !text) return;

    if (state === 'syncing') {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-amber-400 animate-spin';
      text.textContent = 'Sincronizando con Google Sheets...';
    } else if (state === 'synced') {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      text.textContent = 'Conectado con Google Sheets | En tiempo real';
    } else if (state === 'error') {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-rose-500';
      text.textContent = 'Modo Local / Reconectando...';
    } else {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-slate-400';
      text.textContent = 'Google Sheets no configurado';
    }
  },

  initSignature() {
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
      this.signaturePad = new SignaturePad(canvas);
      const btnClear = document.getElementById('btnClearSignature');
      if (btnClear) {
        btnClear.addEventListener('click', () => this.signaturePad.clear());
      }
    }
  },

  async checkEmployeeAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const phoneParam = urlParams.get('phone');
    const empParam = urlParams.get('emp') || urlParams.get('id');
    const codeParam = urlParams.get('code');
    const lookupParam = phoneParam || empParam || codeParam;

    // 1. Si ya hay una sesión activa en este navegador
    const sessionEmpId = sessionStorage.getItem('HACCP_CURRENT_EMP_ID');
    if (sessionEmpId) {
      let emp = DB.findEmployee ? DB.findEmployee(sessionEmpId) : DB.getEmployeeById(sessionEmpId);
      if (!emp && typeof DB.findEmployeeAsync === 'function') {
        emp = await DB.findEmployeeAsync(sessionEmpId);
      }
      if (emp) {
        this.loginSuccess(emp);
        return;
      }
    }

    // 2. Si viene con parámetro en el link (?emp=..., ?phone=..., ?code=...)
    if (lookupParam) {
      let emp = DB.findEmployee ? DB.findEmployee(lookupParam) : DB.getEmployeeByPhone(lookupParam);
      if (!emp && typeof DB.findEmployeeAsync === 'function') {
        emp = await DB.findEmployeeAsync(lookupParam);
      }
      if (emp) {
        this.loginSuccess(emp);
        return;
      }
    }

    // 3. Mostrar compuerta de validación
    this.showPhoneGate();
  },

  showPhoneGate() {
    const gate = document.getElementById('phoneGateCard');
    const main = document.getElementById('employeeMainContent');
    if (gate) gate.classList.remove('hidden');
    if (main) main.classList.add('hidden');
  },

  loginSuccess(employee) {
    this.currentEmployee = employee;
    sessionStorage.setItem('HACCP_CURRENT_EMP_ID', employee.id);

    const gate = document.getElementById('phoneGateCard');
    const main = document.getElementById('employeeMainContent');
    if (gate) gate.classList.add('hidden');
    if (main) main.classList.remove('hidden');

    const nameEl = document.getElementById('empHeaderName');
    const areaEl = document.getElementById('empHeaderArea');
    const codeEl = document.getElementById('empHeaderCode');

    if (nameEl) nameEl.textContent = employee.name;
    if (areaEl) areaEl.textContent = employee.area || 'Equipo HACCP';
    if (codeEl) codeEl.textContent = employee.code || 'N/A';

    this.populatePeriodSelector();
    this.renderHistory();

    // Redimensionar canvas de firma tras mostrarse el contenedor
    if (this.signaturePad) {
      setTimeout(() => this.signaturePad.resizeCanvas(), 100);
    }
  },

  logoutEmployee() {
    sessionStorage.removeItem('HACCP_CURRENT_EMP_ID');
    this.currentEmployee = null;
    const phoneInput = document.getElementById('inputEmployeePhone');
    if (phoneInput) phoneInput.value = '';
    const err = document.getElementById('phoneGateError');
    if (err) err.classList.add('hidden');
    this.showPhoneGate();
  },

  bindEvents() {
    // Formulario de Validación de Colaborador (Teléfono, Código o Nombre)
    const phoneForm = document.getElementById('phoneGateForm');
    if (phoneForm) {
      phoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('inputEmployeePhone');
        const err = document.getElementById('phoneGateError');
        const submitBtn = phoneForm.querySelector('button[type="submit"]');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        const queryVal = input ? input.value.trim() : '';

        if (!queryVal) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '⏳ Validando colaborador...';
        }
        if (err) err.classList.add('hidden');

        try {
          // 1. Buscar primero en datos locales
          let emp = DB.findEmployee ? DB.findEmployee(queryVal) : DB.getEmployeeByPhone(queryVal);

          // 2. Si no se encuentra, consultar Google Sheets
          if (!emp && typeof DB.findEmployeeAsync === 'function') {
            if (submitBtn) submitBtn.innerHTML = '☁️ Consultando Google Sheets...';
            emp = await DB.findEmployeeAsync(queryVal);
          }

          if (emp) {
            this.loginSuccess(emp);
          } else {
            if (err) {
              err.classList.remove('hidden');
              err.innerHTML = `⚠️ No se encontró al colaborador con: <strong>"${queryVal}"</strong>.<br>` +
                `Verifica que esté registrado en el sistema. Puedes ingresar tu <strong>Número de Teléfono</strong>, ` +
                `tu <strong>Código (ej: EMP-01)</strong> o tu <strong>Nombre</strong>.`;
            }
          }
        } catch (errEx) {
          console.error('Error al validar colaborador:', errEx);
          if (err) {
            err.classList.remove('hidden');
            err.textContent = 'Error al validar: ' + errEx.message;
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }

    // Botón de Configuración Rápida de URL de Google Sheets
    const btnConfigSheetsUrl = document.getElementById('btnConfigSheetsUrl');
    if (btnConfigSheetsUrl) {
      btnConfigSheetsUrl.addEventListener('click', async () => {
        const conf = DB.getConfig();
        const currentUrl = conf.googleSheetsUrl || '';
        const newUrl = prompt(
          'Configura la URL de tu Web App de Google Apps Script para conectar este dispositivo a la nube:\n\n' +
          '(Debe terminar en /exec)',
          currentUrl
        );

        if (newUrl !== null) {
          const trimmed = newUrl.trim();
          DB.saveConfig({ ...conf, googleSheetsUrl: trimmed });
          if (trimmed) {
            alert('⏳ Conectando con Google Sheets...');
            const res = await DB.loadAllFromGoogleSheets();
            if (res.success) {
              alert('✅ Conexión exitosa. Se descargaron los colaboradores y períodos desde Google Sheets.');
              this.checkEmployeeAuth();
            } else {
              alert('⚠️ Se guardó la URL, pero no se pudo conectar: ' + (res.message || res.error || 'Verifica la URL'));
            }
          } else {
            alert('ℹ️ Modo local activo.');
          }
        }
      });
    }

    // Botón Cerrar Sesión Empleado
    const btnLogout = document.getElementById('btnLogoutEmployee');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar la sesión de tu formulario?')) {
          this.logoutEmployee();
        }
      });
    }

    // Control de cálculo de horas en tiempo real
    const hoursSelect = document.getElementById('hoursInput');
    const minutesSelect = document.getElementById('minutesInput');
    if (hoursSelect && minutesSelect) {
      hoursSelect.addEventListener('change', () => this.updateHoursCalculation());
      minutesSelect.addEventListener('change', () => this.updateHoursCalculation());
    }

    // Contador de palabras de justificación en tiempo real (>300 palabras)
    const textarea = document.getElementById('justificationInput');
    if (textarea) {
      textarea.addEventListener('input', () => this.updateWordCount());
    }

    // Botones de frases rápidas de procesos cárnicos (sin horas fijas)
    document.querySelectorAll('.btn-quick-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tagText = e.target.getAttribute('data-tag');
        if (tagText && textarea) {
          if (textarea.value.trim().length > 0) {
            textarea.value += ' ' + tagText;
          } else {
            textarea.value = tagText;
          }
          this.updateWordCount();
          textarea.focus();

          // Sincronizar selector de proceso principal
          const procSelect = document.getElementById('processTypeInput');
          if (procSelect) {
            if (tagText.includes('Matanza')) procSelect.value = 'Proceso de Matanza';
            else if (tagText.includes('Vísceras')) procSelect.value = 'Proceso de Vísceras';
            else if (tagText.includes('Deshuese')) procSelect.value = 'Proceso de Deshuese';
            else if (tagText.includes('Cartón')) procSelect.value = 'Descarga de Cartón';
            else if (tagText.includes('Carga')) procSelect.value = 'Carga';
            else if (tagText.includes('HACCP')) procSelect.value = 'Monitoreo HACCP';
          }
        }
      });
    });

    // Checkbox de Vacaciones
    const chkVacation = document.getElementById('chkVacation');
    const vacationFields = document.getElementById('vacationFields');
    if (chkVacation && vacationFields) {
      chkVacation.addEventListener('change', () => {
        if (chkVacation.checked) {
          vacationFields.classList.remove('hidden');
        } else {
          vacationFields.classList.add('hidden');
        }
      });
    }

    // Cálculo automático de días de vacaciones
    const vacFrom = document.getElementById('vacationFrom');
    const vacTo = document.getElementById('vacationTo');
    const vacDays = document.getElementById('vacationDays');
    const calcDays = () => {
      if (vacFrom.value && vacTo.value) {
        const d1 = new Date(vacFrom.value);
        const d2 = new Date(vacTo.value);
        const diffTime = d2 - d1;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        vacDays.value = diffDays > 0 ? diffDays : 0;
      }
    };
    if (vacFrom && vacTo) {
      vacFrom.addEventListener('change', calcDays);
      vacTo.addEventListener('change', calcDays);
    }

    // Formulario de Envío
    const form = document.getElementById('overtimeForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveRecord();
      });
    }

    // Botón Exportar a Excel
    const btnExcel = document.getElementById('btnExportMyExcel');
    if (btnExcel) {
      btnExcel.addEventListener('click', () => {
        if (!this.currentEmployee) return;
        const filter = this.getCurrentPeriodFilter();
        const queryParams = { employeeId: this.currentEmployee.id };
        if (!filter.isAll) {
          if (filter.fromDate) queryParams.fromDate = filter.fromDate;
          if (filter.toDate) queryParams.toDate = filter.toDate;
        }
        const records = DB.getRecords(queryParams);
        const vacations = DB.getVacations(this.currentEmployee.id);
        ExcelExport.exportEmployeeOvertime(this.currentEmployee, records, vacations, filter.periodTitle);
      });
    }

    // Botón Imprimir
    const btnPrint = document.getElementById('btnPrintMySheet');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }
  },

  setDefaultDate() {
    this.syncDateInputWithPeriod();
  },

  updateHoursCalculation() {
    const hours = parseInt(document.getElementById('hoursInput').value, 10) || 0;
    const minutes = parseInt(document.getElementById('minutesInput').value, 10) || 0;
    const decimal = TimeUtils.toDecimal(hours, minutes);
    const human = TimeUtils.toHuman(decimal);

    const calcBadge = document.getElementById('hoursCalcBadge');
    if (calcBadge) {
      calcBadge.innerHTML = `<strong>${human}</strong> = <span class="text-blue-600 font-bold">${decimal} hrs</span>`;
    }
  },

  updateWordCount() {
    const textarea = document.getElementById('justificationInput');
    const counterEl = document.getElementById('wordCountDisplay');
    const barEl = document.getElementById('wordCountBar');
    if (!textarea || !counterEl) return;

    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;

    // Se sugiere al menos 10 palabras y soporta más de 300
    counterEl.textContent = `${words} palabras | ${chars} caracteres`;

    if (barEl) {
      const percent = Math.min(Math.round((words / 300) * 100), 100);
      barEl.style.width = `${percent}%`;

      if (words >= 300) {
        barEl.className = 'h-2 rounded-full transition-all duration-300 bg-emerald-500';
      } else if (words >= 100) {
        barEl.className = 'h-2 rounded-full transition-all duration-300 bg-blue-500';
      } else {
        barEl.className = 'h-2 rounded-full transition-all duration-300 bg-amber-400';
      }
    }
  },

  async saveRecord() {
    if (this.isSubmitting) return;

    if (!this.currentEmployee) {
      alert('Por favor selecciona un empleado primero.');
      return;
    }

    const dateVal = document.getElementById('recordDate').value;
    if (!dateVal) {
      alert('Ingresa una fecha válida.');
      return;
    }

    const hours = parseInt(document.getElementById('hoursInput').value, 10) || 0;
    const minutes = parseInt(document.getElementById('minutesInput').value, 10) || 0;
    if (hours === 0 && minutes === 0) {
      alert('Debes ingresar al menos minutos u horas extras trabajadas.');
      return;
    }

    const decimal = TimeUtils.toDecimal(hours, minutes);
    const human = TimeUtils.toHuman(decimal);
    const justification = document.getElementById('justificationInput').value.trim();

    if (!justification) {
      alert('Por favor describe la justificación del tiempo extraordinario (procesos atendidos).');
      return;
    }

    // Vacaciones
    const hadVacation = document.getElementById('chkVacation').checked;
    let vacFrom = '';
    let vacTo = '';
    let vacDays = 0;
    if (hadVacation) {
      vacFrom = document.getElementById('vacationFrom').value;
      vacTo = document.getElementById('vacationTo').value;
      vacDays = parseInt(document.getElementById('vacationDays').value, 10) || 0;
    }

    // Firma digital
    const signature = this.signaturePad && !this.signaturePad.isEmpty() ? this.signaturePad.toDataURL() : null;
    const processType = document.getElementById('processTypeInput')?.value || '';

    // Detección inteligente de duplicados: Si ya existe un registro para esta fecha y proceso, actualizarlo
    const existingRecords = DB.getRecords({ employeeId: this.currentEmployee.id });
    const existing = existingRecords.find(r => 
      r.date === dateVal && 
      (r.processType || 'general').trim().toLowerCase() === (processType || 'general').trim().toLowerCase()
    );

    let recordId = null;
    let existingSignature = null;
    if (existing) {
      const confirmUpdate = confirm(
        `Ya tienes un registro guardado para el día ${dateVal} en "${processType || 'General'}".\n\n¿Deseas actualizar el registro existente con estos nuevos datos en lugar de duplicarlo?`
      );
      if (!confirmUpdate) {
        return;
      }
      recordId = existing.id;
      existingSignature = existing.signature;
    }

    const record = {
      employeeId: this.currentEmployee.id,
      date: dateVal,
      processType,
      hours,
      minutes,
      decimalHours: decimal,
      hoursText: human,
      justification,
      hadVacation,
      vacationFrom: vacFrom,
      vacationTo: vacTo,
      vacationDays: vacDays,
      signature: signature || existingSignature || null
    };

    if (recordId) {
      record.id = recordId;
    }

    const submitBtn = document.querySelector('#overtimeForm button[type="submit"]');
    const oldBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Guardando en Google Sheets...';
    }
    this.isSubmitting = true;

    try {
      await DB.saveRecordAsync(record);

      // Guardar registro de vacaciones si aplica
      if (hadVacation && vacDays > 0) {
        DB.saveVacation({
          employeeId: this.currentEmployee.id,
          taken: true,
          fromDate: vacFrom,
          toDate: vacTo,
          daysCount: vacDays,
          notes: `Registrado en boleta de fecha ${dateVal}`
        });
      }

      // Limpiar formulario y notificar
      document.getElementById('justificationInput').value = '';
      this.updateWordCount();
      if (this.signaturePad) this.signaturePad.clear();

      const toast = document.getElementById('successToast');
      if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4500);
      }

      // Si la fecha guardada pertenece a otro período diferente del actual, sincronizar el selector
      const periods = DB.getProcessControls();
      const matchPeriod = periods.find(p => {
        const r = TimeUtils.getPeriodRange(p);
        return r.fromDate && r.toDate && dateVal >= r.fromDate && dateVal <= r.toDate;
      });
      if (matchPeriod && matchPeriod.periodId !== this.selectedPeriodId && this.selectedPeriodId !== 'ALL') {
        this.selectedPeriodId = matchPeriod.periodId;
        sessionStorage.setItem('HACCP_SELECTED_PERIOD_ID', matchPeriod.periodId);
        const sel = document.getElementById('empPeriodSelect');
        if (sel) sel.value = matchPeriod.periodId;
      }

      this.renderHistory();
    } catch (err) {
      alert('Error guardando en Google Sheets: ' + err.message);
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = oldBtnText;
      }
    }
  },

  initPeriodSelector() {
    const select = document.getElementById('empPeriodSelect');
    if (select) {
      select.addEventListener('change', (e) => {
        this.selectedPeriodId = e.target.value;
        sessionStorage.setItem('HACCP_SELECTED_PERIOD_ID', e.target.value);
        this.syncDateInputWithPeriod();
        this.renderHistory();
      });
    }
  },

  populatePeriodSelector() {
    const select = document.getElementById('empPeriodSelect');
    if (!select) return;

    const periods = DB.getProcessControls();
    select.innerHTML = '';

    if (periods.length === 0) {
      select.innerHTML = '<option value="">Sin períodos registrados</option>';
      this.selectedPeriodId = null;
      return;
    }

    // Identificar el período a seleccionar inicialmente
    const savedPeriodId = sessionStorage.getItem('HACCP_SELECTED_PERIOD_ID');
    if (savedPeriodId && (savedPeriodId === 'ALL' || periods.some(p => p.periodId === savedPeriodId))) {
      this.selectedPeriodId = savedPeriodId;
    } else if (!this.selectedPeriodId || !periods.some(p => p.periodId === this.selectedPeriodId)) {
      // Por defecto seleccionar el período más reciente (Actual, que está en índice 0)
      this.selectedPeriodId = periods[0].periodId;
    }

    periods.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = p.periodId;
      let labelTag = '';
      if (idx === 0) {
        labelTag = ' (Actual)';
      } else if (idx === 1) {
        labelTag = ' (Anterior)';
      }
      opt.textContent = `Período: ${p.periodTitle}${labelTag}`;
      if (p.periodId === this.selectedPeriodId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    // Opción para ver todo el historial general
    const allOpt = document.createElement('option');
    allOpt.value = 'ALL';
    allOpt.textContent = '─── Ver Todos los Períodos (Histórico Completo) ───';
    if (this.selectedPeriodId === 'ALL') {
      allOpt.selected = true;
    }
    select.appendChild(allOpt);

    select.value = this.selectedPeriodId;
    this.syncDateInputWithPeriod();
  },

  getCurrentPeriodFilter() {
    if (this.selectedPeriodId === 'ALL') {
      return {
        isAll: true,
        fromDate: null,
        toDate: null,
        periodTitle: 'Histórico General Completo'
      };
    }

    const periods = DB.getProcessControls();
    let period = periods.find(p => p.periodId === this.selectedPeriodId);
    if (!period && periods.length > 0) {
      period = periods[0];
      this.selectedPeriodId = period.periodId;
    }

    if (period) {
      const range = TimeUtils.getPeriodRange(period);
      return {
        isAll: false,
        fromDate: range.fromDate,
        toDate: range.toDate,
        periodTitle: period.periodTitle,
        periodId: period.periodId,
        period: period
      };
    }

    return {
      isAll: true,
      fromDate: null,
      toDate: null,
      periodTitle: 'Período General'
    };
  },

  syncDateInputWithPeriod() {
    const dateInput = document.getElementById('recordDate');
    if (!dateInput) return;

    const filter = this.getCurrentPeriodFilter();
    const today = new Date().toISOString().split('T')[0];

    // Si hoy cae dentro del período seleccionado, mantener hoy
    if (filter.fromDate && filter.toDate) {
      if (today >= filter.fromDate && today <= filter.toDate) {
        dateInput.value = today;
      } else {
        // Si hoy está fuera del período, sugerir la fecha final del período
        dateInput.value = filter.toDate;
      }
    } else {
      dateInput.value = today;
    }
  },

  renderHistory() {
    if (!this.currentEmployee) return;

    const filter = this.getCurrentPeriodFilter();
    const badge = document.getElementById('currentPeriodLabelBadge');
    if (badge) {
      badge.textContent = filter.periodTitle;
    }

    const queryParams = { employeeId: this.currentEmployee.id };
    if (!filter.isAll) {
      if (filter.fromDate) queryParams.fromDate = filter.fromDate;
      if (filter.toDate) queryParams.toDate = filter.toDate;
    }

    const records = DB.getRecords(queryParams);
    const tbody = document.getElementById('employeeHistoryBody');
    const totalEl = document.getElementById('totalAccumulatedHours');
    const totalCountEl = document.getElementById('totalRecordsCount');

    let totalDecimal = 0;

    if (tbody) {
      tbody.innerHTML = '';
      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500 font-medium">
          No tienes registros de horas extras en el <strong>${filter.periodTitle}</strong> todavía.<br>
          <span class="text-xs text-slate-400 mt-1 block">Puedes ingresar tus horas trabajadas de este período usando el formulario de arriba.</span>
        </td></tr>`;
      } else {
        records.forEach(r => {
          totalDecimal += parseFloat(r.decimalHours) || 0;
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-slate-50 transition-colors';
          tr.innerHTML = `
            <td class="py-3 px-4 font-medium text-slate-800">${TimeUtils.formatDateDMY(r.date)} <br><span class="text-xs text-slate-500">${TimeUtils.getDayName(r.date)}</span></td>
            <td class="py-3 px-4 font-semibold text-blue-700">
              ${r.hoursText} <br><span class="text-xs text-slate-500 font-mono">(${r.decimalHours}h)</span>
            </td>
            <td class="py-3 px-4 text-sm text-slate-600">${r.justification}</td>
            <td class="py-3 px-4 text-center">
              <button class="text-red-500 hover:text-red-700 p-1 text-xs" title="Eliminar registro" onclick="EmpleadoApp.deleteRecord('${r.id}')">
                Eliminar
              </button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    if (totalEl) {
      const roundedTotal = Math.round(totalDecimal * 100) / 100;
      totalEl.textContent = `${roundedTotal} hrs`;
    }

    if (totalCountEl) {
      totalCountEl.textContent = `${records.length} días`;
    }

    // Actualizar Hoja Oficial Imprimible en 1 hoja física (window.print())
    this.renderPrintableSheet(records, totalDecimal, filter);
  },

  renderPrintableSheet(records, totalDecimal, filter = null) {
    if (!this.currentEmployee) return;

    const emp = this.currentEmployee;
    const nameEl = document.getElementById('printEmpName');
    const codeEl = document.getElementById('printEmpCode');
    const areaEl = document.getElementById('printEmpArea');
    const signNameEl = document.getElementById('printSignEmpName');
    const dateHeaderEl = document.getElementById('printHeaderDate');

    if (nameEl) nameEl.textContent = emp.name;
    if (codeEl) codeEl.textContent = emp.code || 'N/A';
    if (areaEl) areaEl.textContent = emp.area || 'Equipo HACCP';
    if (signNameEl) signNameEl.textContent = emp.name;

    // Rango de fechas del período oficial
    if (dateHeaderEl) {
      if (filter && filter.periodTitle && !filter.isAll) {
        dateHeaderEl.textContent = filter.periodTitle;
      } else if (records.length > 0) {
        const sorted = [...records].map(r => r.date).filter(Boolean).sort();
        dateHeaderEl.textContent = `${TimeUtils.formatDateDMY(sorted[0])} al ${TimeUtils.formatDateDMY(sorted[sorted.length - 1])}`;
      } else {
        dateHeaderEl.textContent = new Date().toLocaleDateString('es-ES');
      }
    }

    const printTbody = document.getElementById('printOvertimeBody');
    if (printTbody) {
      printTbody.innerHTML = '';
      if (records.length === 0) {
        printTbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-400 italic">No hay registros de horas extras en este período.</td></tr>';
      } else {
        records.forEach(r => {
          const tr = document.createElement('tr');
          const dec = parseFloat(r.decimalHours) || 0;
          tr.innerHTML = `
            <td style="text-align: center; font-weight: bold;">${TimeUtils.formatDateDMY(r.date)}</td>
            <td style="font-weight: bold; color: #1e3a8a;">${r.hoursText} (${dec.toFixed(2)}h)</td>
            <td>${r.justification}</td>
          `;
          printTbody.appendChild(tr);
        });
      }
    }

    const totalHoursCell = document.getElementById('printTotalHoursCell');
    const totalWordsCell = document.getElementById('printTotalWordsCell');
    const rounded = Math.round(totalDecimal * 100) / 100;
    if (totalHoursCell) {
      totalHoursCell.innerHTML = `<strong>${rounded.toFixed(2)} H</strong>`;
    }
    if (totalWordsCell) {
      totalWordsCell.textContent = `(${TimeUtils.toHuman(rounded)})`;
    }

    // Vacaciones filtradas por el período
    const vacs = DB.getVacations(emp.id);
    const vacTaken = vacs && vacs.find(v => {
      if (!v.taken) return false;
      if (!filter || filter.isAll || !filter.fromDate || !filter.toDate) return true;
      // Comprobar si las vacaciones se solapan con las fechas del período
      return (v.fromDate <= filter.toDate && v.toDate >= filter.fromDate);
    });

    const vacSi = document.getElementById('printVacSi');
    const vacNo = document.getElementById('printVacNo');
    const vacFrom = document.getElementById('printVacFrom');
    const vacTo = document.getElementById('printVacTo');
    const vacDays = document.getElementById('printVacDays');

    if (vacSi && vacNo && vacFrom && vacTo && vacDays) {
      if (vacTaken) {
        vacSi.textContent = 'X';
        vacNo.textContent = '';
        vacFrom.textContent = TimeUtils.formatDateDMY(vacTaken.fromDate);
        vacTo.textContent = TimeUtils.formatDateDMY(vacTaken.toDate);
        vacDays.textContent = vacTaken.daysCount || '0';
      } else {
        vacSi.textContent = '';
        vacNo.textContent = 'X';
        vacFrom.textContent = '-';
        vacTo.textContent = '-';
        vacDays.textContent = '0';
      }
    }
  },

  async deleteRecord(id) {
    if (confirm('¿Seguro que deseas eliminar este registro de horas extras? Se eliminará de Google Sheets.')) {
      await DB.deleteRecordAsync(id);
      this.renderHistory();
    }
  }
};

window.EmpleadoApp = EmpleadoApp;
