/**
 * app-admin.js - Panel de Control Administrativo y Gerencial
 * - Dashboard analítico de horas extras por empleado y fechas
 * - Módulo de Salida de Procesos
 * - Gestión de usuarios/empleados y generador de enlaces móviles
 * - Exportación a Excel y Sincronización con Google Sheets
 */

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});

const AdminApp = {
  activeTab: 'tab-dashboard',
  chartEmployees: null,
  chartProcesses: null,
  currentUser: null,
  currentRole: 'admin',

  init() {
    this.checkAdminAuth();
    this.bindAdminLogin();
    this.bindTabNavigation();
    this.initFilters();
    this.renderDashboard();
    this.renderEmployees();
    this.loadGoogleSheetsConfig();
    this.renderAdminUsers();
    this.bindAdminUserModals();
    this.bindRecordModals();
    this.bindModals();
    ProcesosModule.init();
    this.initLiveSync();
  },

  initLiveSync() {
    DB.init();

    // Actualizar indicador visual al cambiar estado de sincronización
    if (DB.SyncEngine) {
      DB.SyncEngine.onSyncStateChange((state, detail) => {
        this.updateSyncUI(state, detail);
      });

      // Re-renderizado reactivo cuando se detectan cambios desde Google Sheets
      DB.SyncEngine.onDataUpdated((summary) => {
        this.handleRemoteDataUpdate(summary);
      });

      // Chequeo inicial del estado
      this.updateSyncUI(DB.SyncEngine.currentState);
    }

    // Botón de refresco rápido en el header
    const btnPullHeader = document.getElementById('btnPullSheetsHeader');
    if (btnPullHeader) {
      btnPullHeader.onclick = () => this.pullDataFromGoogleSheets();
    }

    // Si hay URL configurada, lanzar sincronización inicial
    const conf = DB.getConfig();
    if (conf.googleSheetsUrl && DB.SyncEngine) {
      DB.SyncEngine.pollChanges({ immediate: true, silent: false });
    }
  },

  updateSyncUI(state, detail = null) {
    const badge = document.getElementById('liveSyncStatusBadge');
    const dot = document.getElementById('syncPulseDot');
    const text = document.getElementById('syncStatusText');
    const timeText = document.getElementById('syncLastTimeText');
    const iconHeader = document.getElementById('iconPullHeader');

    if (!badge || !dot || !text) return;
    badge.classList.remove('hidden');

    if (state === 'syncing') {
      dot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-spin';
      text.textContent = 'Google Sheets: Sincronizando...';
      if (iconHeader) iconHeader.classList.add('animate-spin');
    } else if (state === 'synced') {
      dot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse';
      text.textContent = 'Google Sheets: En Línea';
      if (timeText) {
        timeText.textContent = `· ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      }
      if (iconHeader) iconHeader.classList.remove('animate-spin');
    } else if (state === 'error') {
      dot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-rose-500';
      text.textContent = 'Google Sheets: Error conexión';
      if (iconHeader) iconHeader.classList.remove('animate-spin');
    } else {
      dot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-slate-400';
      text.textContent = 'Google Sheets: Configurar';
      if (iconHeader) iconHeader.classList.remove('animate-spin');
    }
  },

  handleRemoteDataUpdate(summary) {
    console.log('🔄 Actualizando interfaz con datos frescos de Google Sheets:', summary);
    this.populateEmployeeFilters();

    if (this.activeTab === 'tab-dashboard') {
      this.renderDashboard();
    } else if (this.activeTab === 'tab-empleados') {
      this.renderEmployees();
    } else if (this.activeTab === 'tab-config') {
      this.renderAdminUsers();
    } else if (this.activeTab === 'tab-procesos' && window.ProcesosModule) {
      ProcesosModule.loadPeriods();
    }

    // Toast flotante no invasivo
    this.showSyncToast('🔄 Datos actualizados en vivo desde Google Sheets');
  },

  showSyncToast(message) {
    let toast = document.getElementById('adminLiveSyncToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'adminLiveSyncToast';
      toast.className = 'fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      <span>${message}</span>
    `;
    toast.classList.remove('translate-y-10', 'opacity-0');
    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0');
    }, 3500);
  },

  checkAdminAuth() {
    const session = DB.getAdminSession();
    const overlay = document.getElementById('adminLoginOverlay');
    if (overlay) {
      if (session) {
        overlay.classList.add('hidden');
        this.currentUser = session;
        this.currentRole = session.role || 'admin';
        this.applyRolePermissions();
      } else {
        overlay.classList.remove('hidden');
      }
    }
  },

  applyRolePermissions() {
    const session = this.currentUser || { username: 'admin', role: 'admin' };
    const badge = document.getElementById('userRoleBadge');
    if (badge) {
      if (session.role === 'visor') {
        badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-slate-900 shadow-sm hidden sm:inline';
        badge.innerHTML = `Usuario: <strong>${session.username}</strong> (Visor Reportes)`;
      } else {
        badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-sm hidden sm:inline';
        badge.innerHTML = `Usuario: <strong>${session.username}</strong> (Administrador)`;
      }
    }

    const isVisor = session.role === 'visor';

    // 1. En Empleados: Ocultar botón de crear empleado si es Visor
    const btnCreateEmp = document.getElementById('btnOpenCreateEmployee');
    if (btnCreateEmp) {
      btnCreateEmp.style.display = isVisor ? 'none' : '';
    }

    // 2. En Procesos: Ocultar botones de crear período, eliminar período, agregar fila y guardar si es Visor
    const btnNewPeriod = document.getElementById('btnNewPeriod');
    const btnDeletePeriod = document.getElementById('btnDeletePeriod');
    const btnAddRow = document.getElementById('btnAddRow');
    const btnSaveProc = document.getElementById('btnSaveProcesses');
    if (btnNewPeriod) btnNewPeriod.style.display = isVisor ? 'none' : '';
    if (btnDeletePeriod) btnDeletePeriod.style.display = isVisor ? 'none' : '';
    if (btnAddRow) btnAddRow.style.display = isVisor ? 'none' : '';
    if (btnSaveProc) btnSaveProc.style.display = isVisor ? 'none' : '';

    // Deshabilitar inputs de la tabla de procesos si es visor
    document.querySelectorAll('#processTableBody input').forEach(input => {
      input.disabled = isVisor;
    });

    // 3. En Configuración: Si es Visor, ocultar crear usuarios admin y ajustes críticos
    const btnOpenCreateAdmin = document.getElementById('btnOpenCreateAdminUser');
    if (btnOpenCreateAdmin) btnOpenCreateAdmin.style.display = isVisor ? 'none' : '';
    const btnResetFactory = document.getElementById('btnResetFactory');
    if (btnResetFactory) btnResetFactory.style.display = isVisor ? 'none' : '';
  },

  bindAdminLogin() {
    const form = document.getElementById('adminLoginForm');
    const err = document.getElementById('adminLoginError');
    const btnLogout = document.getElementById('btnAdminLogout');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('adminUsername')?.value || '';
        const pass = document.getElementById('adminPassword')?.value || '';
        const remember = document.getElementById('adminRemember')?.checked || false;

        const userObj = DB.validateAdmin(user, pass);
        if (userObj) {
          if (err) err.classList.add('hidden');
          DB.setAdminLoggedIn(userObj, remember);
          const overlay = document.getElementById('adminLoginOverlay');
          if (overlay) overlay.classList.add('hidden');
          this.currentUser = userObj;
          this.currentRole = userObj.role || 'admin';
          this.applyRolePermissions();
          this.renderDashboard();
          this.renderEmployees();
          this.renderAdminUsers();
        } else {
          if (err) err.classList.remove('hidden');
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar tu sesión actual?')) {
          DB.setAdminLoggedIn(null);
          this.currentUser = null;
          this.currentRole = 'admin';
          const overlay = document.getElementById('adminLoginOverlay');
          if (overlay) overlay.classList.remove('hidden');
          const passInput = document.getElementById('adminPassword');
          if (passInput) passInput.value = '';
        }
      });
    }
  },

  bindTabNavigation() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('tab-active');
        btn.classList.remove('tab-inactive');
      } else {
        btn.classList.remove('tab-active');
        btn.classList.add('tab-inactive');
      }
    });

    // Actualizar secciones
    document.querySelectorAll('.tab-content-section').forEach(sec => {
      if (sec.id === tabId) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    });

    // Refrescar contenidos específicos según la pestaña activa
    if (tabId === 'tab-dashboard') {
      this.renderDashboard();
    } else if (tabId === 'tab-procesos') {
      ProcesosModule.loadPeriods();
    } else if (tabId === 'tab-empleados') {
      this.renderEmployees();
    }
  },

  initFilters() {
    const empSelect = document.getElementById('filterEmployee');
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');

    // Poblar selector de empleados en filtro
    this.populateEmployeeFilters();

    const applyFilter = () => this.renderDashboard();

    if (empSelect) empSelect.addEventListener('change', applyFilter);
    if (dateFrom) dateFrom.addEventListener('change', applyFilter);
    if (dateTo) dateTo.addEventListener('change', applyFilter);

    const btnClearFilter = document.getElementById('btnClearFilter');
    if (btnClearFilter) {
      btnClearFilter.addEventListener('click', () => {
        if (empSelect) empSelect.value = '';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        this.renderDashboard();
      });
    }

    // Botones de exportación a Excel
    const btnExportConsolidated = document.getElementById('btnExportConsolidated');
    if (btnExportConsolidated) {
      btnExportConsolidated.addEventListener('click', () => {
        const from = dateFrom ? dateFrom.value : '';
        const to = dateTo ? dateTo.value : '';
        const emps = DB.getEmployees();
        const records = DB.getRecords({ fromDate: from, toDate: to });
        ExcelExport.exportConsolidated(emps, records, from, to);
      });
    }

    const btnExportFiltered = document.getElementById('btnExportFiltered');
    if (btnExportFiltered) {
      btnExportFiltered.addEventListener('click', () => {
        const empId = empSelect ? empSelect.value : '';
        const from = dateFrom ? dateFrom.value : '';
        const to = dateTo ? dateTo.value : '';

        if (empId) {
          const emp = DB.getEmployeeById(empId);
          const records = DB.getRecords({ employeeId: empId, fromDate: from, toDate: to });
          const vacations = DB.getVacations(empId);
          const periodLabel = (from && to) ? `${TimeUtils.formatDateDMY(from)} al ${TimeUtils.formatDateDMY(to)}` : 'Período Completo';
          ExcelExport.exportEmployeeOvertime(emp, records, vacations, periodLabel);
        } else {
          const emps = DB.getEmployees();
          const records = DB.getRecords({ fromDate: from, toDate: to });
          ExcelExport.exportConsolidated(emps, records, from, to);
        }
      });
    }
  },

  populateEmployeeFilters() {
    const empSelect = document.getElementById('filterEmployee');
    if (!empSelect) return;

    const employees = DB.getEmployees();
    empSelect.innerHTML = '<option value="">Todos los Empleados</option>';
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = `${emp.name} (${emp.area})`;
      empSelect.appendChild(opt);
    });
  },

  renderDashboard() {
    const empId = document.getElementById('filterEmployee')?.value || '';
    const fromDate = document.getElementById('filterDateFrom')?.value || '';
    const toDate = document.getElementById('filterDateTo')?.value || '';

    const records = DB.getRecords({ employeeId: empId, fromDate, toDate });
    const employees = DB.getEmployees();

    // Calcular KPIs
    let totalDecimalHours = 0;
    const activeEmpSet = new Set();

    records.forEach(r => {
      totalDecimalHours += (parseFloat(r.decimalHours) || 0);
      activeEmpSet.add(r.employeeId);
    });

    const kpiTotalHours = document.getElementById('kpiTotalHours');
    const kpiTotalRecords = document.getElementById('kpiTotalRecords');
    const kpiActiveEmployees = document.getElementById('kpiActiveEmployees');
    const kpiAverageHours = document.getElementById('kpiAverageHours');

    if (kpiTotalHours) kpiTotalHours.textContent = `${Math.round(totalDecimalHours * 100) / 100} h`;
    if (kpiTotalRecords) kpiTotalRecords.textContent = `${records.length} reportes`;
    if (kpiActiveEmployees) kpiActiveEmployees.textContent = `${activeEmpSet.size} empleados`;

    const avg = activeEmpSet.size > 0 ? (totalDecimalHours / activeEmpSet.size).toFixed(1) : '0';
    if (kpiAverageHours) kpiAverageHours.textContent = `${avg} h / emp`;

    // Renderizar Tabla
    this.renderRecordsTable(records);

    // Actualizar Gráficos
    this.renderCharts(records, employees);
  },

  renderRecordsTable(records) {
    const tbody = document.getElementById('adminRecordsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-500">No se encontraron registros de horas extras con los filtros aplicados.</td></tr>`;
      return;
    }

    const isVisor = this.currentRole === 'visor';

    records.forEach(r => {
      const emp = DB.getEmployeeById(r.employeeId);
      const exitInfo = DB.getProcessExitInfo(r.date, r.processType, r.justification);
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50 transition-colors';

      tr.innerHTML = `
        <td class="py-3 px-4 font-medium text-slate-800">
          ${TimeUtils.formatDateDMY(r.date)}
          <div class="text-xs text-slate-500">${TimeUtils.getDayName(r.date)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-semibold text-slate-900">${emp ? emp.name : 'N/A'}</div>
          <div class="text-xs text-blue-600 font-medium">${emp ? emp.area : ''} | ${emp ? emp.code : ''}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            ${r.decimalHours} hrs
          </span>
          <div class="text-xs text-slate-500 mt-0.5">${r.hoursText}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            ${exitInfo.processName}
          </span>
          <div class="text-xs font-mono font-bold mt-1 ${exitInfo.exitTime.includes(':') ? 'text-emerald-700' : 'text-slate-500'}">
            🕒 Salida: <strong>${exitInfo.exitTime}</strong>
          </div>
        </td>
        <td class="py-3 px-4 text-sm text-slate-700 max-w-md">
          <p class="line-clamp-2">${r.justification}</p>
        </td>
        <td class="py-3 px-4 text-center">
          ${r.hadVacation 
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Vacaciones: Sí</span>' 
            : '<span class="text-xs text-slate-400">No</span>'}
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <button class="btn-action-view text-xs font-semibold text-blue-600 hover:text-blue-800 mr-1.5" onclick="AdminApp.viewRecordDetail('${r.id}')" title="Ver detalle completo">
            Ver
          </button>
          ${!isVisor ? `
            <button class="btn-action-edit text-xs font-semibold text-emerald-600 hover:text-emerald-800 mr-1.5" onclick="AdminApp.editRecord('${r.id}')" title="Editar este registro">
              Editar
            </button>
            <button class="btn-action-delete text-xs font-semibold text-red-600 hover:text-red-800" onclick="AdminApp.deleteRecord('${r.id}')" title="Eliminar registro">
              ✕
            </button>
          ` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderCharts(records, employees) {
    if (typeof Chart === 'undefined') return;

    // 1. Gráfico de Horas Extras por Empleado
    const empHoursMap = {};
    employees.forEach(e => { empHoursMap[e.name] = 0; });
    records.forEach(r => {
      const emp = DB.getEmployeeById(r.employeeId);
      if (emp) {
        empHoursMap[emp.name] = (empHoursMap[emp.name] || 0) + (parseFloat(r.decimalHours) || 0);
      }
    });

    const labelsEmp = Object.keys(empHoursMap);
    const dataEmp = Object.values(empHoursMap).map(v => Math.round(v * 100) / 100);

    const ctxEmp = document.getElementById('chartEmployeesCanvas');
    if (ctxEmp) {
      if (this.chartEmployees) this.chartEmployees.destroy();
      this.chartEmployees = new Chart(ctxEmp, {
        type: 'bar',
        data: {
          labels: labelsEmp,
          datasets: [{
            label: 'Horas Extras Acumuladas',
            data: dataEmp,
            backgroundColor: '#2563eb',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Horas (h)' } }
          }
        }
      });
    }

    // 2. Gráfico por Proceso (Matanza, Deshuese, Vísceras, etc.)
    const processKeywords = {
      'Matanza': 0,
      'Deshuese': 0,
      'Vísceras': 0,
      'Carga / Cartón': 0,
      'Otros / Limpieza': 0
    };

    records.forEach(r => {
      const text = (r.justification || '').toLowerCase();
      const dec = parseFloat(r.decimalHours) || 0;
      if (text.includes('matanz')) {
        processKeywords['Matanza'] += dec;
      } else if (text.includes('deshues')) {
        processKeywords['Deshuese'] += dec;
      } else if (text.includes('viscer') || text.includes('víscer')) {
        processKeywords['Vísceras'] += dec;
      } else if (text.includes('carga') || text.includes('carton') || text.includes('cartón')) {
        processKeywords['Carga / Cartón'] += dec;
      } else {
        processKeywords['Otros / Limpieza'] += dec;
      }
    });

    const ctxProc = document.getElementById('chartProcessesCanvas');
    if (ctxProc) {
      if (this.chartProcesses) this.chartProcesses.destroy();
      this.chartProcesses = new Chart(ctxProc, {
        type: 'doughnut',
        data: {
          labels: Object.keys(processKeywords),
          datasets: [{
            data: Object.values(processKeywords).map(v => Math.round(v * 10) / 10),
            backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  },

  // --- GESTIÓN DE EMPLEADOS ---
  renderEmployees() {
    const listContainer = document.getElementById('employeesListContainer');
    if (!listContainer) return;

    const employees = DB.getEmployees();
    const allRecords = DB.getRecords();

    listContainer.innerHTML = '';
    if (employees.length === 0) {
      listContainer.innerHTML = '<p class="text-slate-500 py-6 text-center col-span-3">No hay empleados registrados. Haz clic en "Crear Empleado".</p>';
      return;
    }

    employees.forEach(emp => {
      const empRecords = allRecords.filter(r => r.employeeId === emp.id);
      const totalHours = empRecords.reduce((acc, r) => acc + (parseFloat(r.decimalHours) || 0), 0);
      const cleanTotal = Math.round(totalHours * 100) / 100;

      // URL para el empleado (usando la ruta actual del navegador o relativo)
      const currentUrl = window.location.href.split('?')[0].replace('index.html', '');
      const cleanPhone = TimeUtils.cleanPhone(emp.phone);
      const employeeUrl = cleanPhone ? `${currentUrl}empleado.html?phone=${cleanPhone}` : `${currentUrl}empleado.html?emp=${emp.id}`;

      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow';
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <span class="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">${emp.code}</span>
            <h3 class="text-lg font-bold text-slate-800 mt-1">${emp.name}</h3>
            <p class="text-sm text-blue-600 font-medium">${emp.area} - ${emp.role}</p>
            <p class="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
              📱 Tel: <span class="font-bold text-slate-700">${emp.phone || 'Sin teléfono'}</span>
            </p>
          </div>
          <div class="text-right">
            <span class="text-2xl font-black text-slate-900">${cleanTotal}</span>
            <span class="text-xs text-slate-500 block">Horas Totales</span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          <button class="btn-sm-primary flex items-center gap-1.5" onclick="AdminApp.copyEmployeeLink('${employeeUrl}', '${emp.name}')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            Copiar Enlace
          </button>
          <button class="btn-sm-whatsapp flex items-center gap-1.5" onclick="AdminApp.shareWhatsApp('${employeeUrl}', '${emp.name}', '${emp.phone || ''}')">
            WhatsApp
          </button>
          <button class="btn-sm-secondary flex items-center gap-1.5" onclick="AdminApp.showEmployeeQR('${employeeUrl}', '${emp.name}')">
            QR
          </button>
          <button class="btn-sm-excel flex items-center gap-1.5" onclick="AdminApp.exportSingleEmployeeExcel('${emp.id}')">
            Excel
          </button>
          ${!this.currentUser || this.currentUser.role !== 'visor' ? `
            <button class="btn-sm-secondary flex items-center gap-1" onclick="AdminApp.editEmployee('${emp.id}')" title="Editar empleado">
              Editar
            </button>
            <button class="btn-sm-danger ml-auto" onclick="AdminApp.deleteEmployee('${emp.id}')" title="Eliminar Empleado">
              Eliminar
            </button>
          ` : ''}
        </div>
      `;
      listContainer.appendChild(card);
    });
  },

  copyEmployeeLink(url, empName) {
    navigator.clipboard.writeText(url).then(() => {
      alert(`✅ Enlace copiado al portapapeles para ${empName}:\n${url}\n\nAl abrirlo en WhatsApp, se validará automáticamente su número de teléfono.`);
    }).catch(() => {
      prompt(`Copia el enlace para ${empName}:`, url);
    });
  },

  shareWhatsApp(url, empName, phone) {
    const text = encodeURIComponent(`Hola ${empName}, por favor ingresa a este enlace para registrar tus horas extras y justificación diaria del equipo HACCP:\n${url}\n(Tu teléfono registrado: ${phone})`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  },

  showEmployeeQR(url, empName) {
    const qrModal = document.getElementById('qrModal');
    const qrContainer = document.getElementById('qrCodeImage');
    const qrTitle = document.getElementById('qrModalTitle');
    const qrLink = document.getElementById('qrModalLink');

    if (qrModal && qrContainer) {
      if (qrTitle) qrTitle.textContent = `Código QR para ${empName}`;
      if (qrLink) qrLink.textContent = url;
      // Usar servicio estándar de QR rápido
      qrContainer.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
      qrModal.classList.remove('hidden');
    }
  },

  exportSingleEmployeeExcel(empId) {
    const emp = DB.getEmployeeById(empId);
    if (!emp) return;
    const records = DB.getRecords({ employeeId: empId });
    const vacations = DB.getVacations(empId);
    ExcelExport.exportEmployeeOvertime(emp, records, vacations);
  },

  async deleteEmployee(id) {
    if (confirm('¿Deseas eliminar este empleado? Se eliminará de Google Sheets y del sistema.')) {
      this.showSyncToast('⏳ Eliminando empleado de Google Sheets...');
      await DB.deleteEmployeeAsync(id);
      this.populateEmployeeFilters();
      this.renderEmployees();
      this.renderDashboard();
      this.showSyncToast('🗑️ Empleado eliminado en Google Sheets con éxito.');
    }
  },

  async deleteRecord(id) {
    if (confirm('¿Seguro que deseas eliminar este registro de horas extras?')) {
      this.showSyncToast('⏳ Eliminando registro de Google Sheets...');
      await DB.deleteRecordAsync(id);
      this.renderDashboard();
      this.showSyncToast('🗑️ Registro eliminado en Google Sheets con éxito.');
    }
  },

  viewRecordDetail(id) {
    const data = DB.load();
    const record = (data.records || []).find(r => r.id === id);
    if (!record) return;

    const emp = DB.getEmployeeById(record.employeeId);
    const exitInfo = DB.getProcessExitInfo(record.date, record.processType, record.justification);
    const detailModal = document.getElementById('recordDetailModal');
    const content = document.getElementById('recordDetailContent');

    if (detailModal && content) {
      let breakdownHtml = '';
      if (exitInfo.allTimes) {
        breakdownHtml = `
          <div class="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span class="text-slate-400 block font-semibold">Matanza:</span><strong class="text-slate-800">${exitInfo.allTimes.matanza}</strong></div>
            <div><span class="text-slate-400 block font-semibold">Vísceras:</span><strong class="text-slate-800">${exitInfo.allTimes.viscera}</strong></div>
            <div><span class="text-slate-400 block font-semibold">Deshuese:</span><strong class="text-slate-800">${exitInfo.allTimes.deshuese}</strong></div>
            <div><span class="text-slate-400 block font-semibold">Descarga:</span><strong class="text-slate-800">${exitInfo.allTimes.carton}</strong></div>
          </div>
        `;
      }

      content.innerHTML = `
        <div class="space-y-4">
          <div class="flex justify-between border-b pb-3">
            <div>
              <h4 class="font-bold text-lg text-slate-800">${emp ? emp.name : 'Empleado'}</h4>
              <p class="text-sm text-blue-600 font-medium">${emp ? emp.area : ''} - ${emp ? emp.code : ''}</p>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-500">Fecha del turno</span>
              <p class="font-bold text-slate-900">${TimeUtils.formatDateDMY(record.date)} (${TimeUtils.getDayName(record.date)})</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas Extras Registradas:</span>
              <p class="text-2xl font-black text-blue-700">${record.decimalHours} horas <span class="text-sm font-normal text-slate-600">(${record.hoursText})</span></p>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proceso & Salida (Planilla Oficial):</span>
              <div class="mt-1">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ${exitInfo.processName}
                </span>
                <p class="text-base font-bold mt-1 ${exitInfo.exitTime.includes(':') ? 'text-emerald-700' : 'text-slate-600'}">
                  🕒 Salida Oficial: ${exitInfo.exitTime}
                </p>
              </div>
            </div>
            ${breakdownHtml ? `<div class="col-span-1 sm:col-span-2">${breakdownHtml}</div>` : ''}
          </div>

          <div>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Justificación Detallada:</span>
            <div class="mt-1 p-3 bg-white rounded-lg text-slate-800 text-sm whitespace-pre-wrap border border-slate-200 shadow-inner">${record.justification}</div>
          </div>

          ${record.hadVacation ? `
            <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span class="font-bold text-amber-800 text-sm">Vacaciones Registradas:</span>
              <p class="text-xs text-amber-900 mt-1">Desde: <strong>${TimeUtils.formatDateDMY(record.vacationFrom)}</strong> | Hasta: <strong>${TimeUtils.formatDateDMY(record.vacationTo)}</strong> (${record.vacationDays} días)</p>
            </div>
          ` : ''}

          ${record.signature ? `
            <div>
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Firma Digital del Empleado:</span>
              <div class="mt-1 border rounded-lg p-2 bg-white flex justify-center">
                <img src="${record.signature}" class="max-h-28 object-contain" alt="Firma">
              </div>
            </div>
          ` : '<p class="text-xs text-slate-400 italic">Sin firma digital registrada en este turno.</p>'}
        </div>
      `;
      detailModal.classList.remove('hidden');
    }
  },

  // --- CONFIGURACIÓN & GOOGLE SHEETS ---
  loadGoogleSheetsConfig() {
    const config = DB.getConfig();
    const inputUrl = document.getElementById('googleSheetsUrlInput');
    if (inputUrl) {
      inputUrl.value = config.googleSheetsUrl || '';
    }

    const chkAutoSync = document.getElementById('chkAutoSyncEnabled');
    if (chkAutoSync) {
      chkAutoSync.checked = config.autoSyncEnabled !== false;
      chkAutoSync.addEventListener('change', () => {
        const current = DB.getConfig();
        DB.saveConfig({ ...current, autoSyncEnabled: chkAutoSync.checked });
        this.showSyncToast(chkAutoSync.checked ? '🟢 Auto-refresco en vivo activado' : '⏸️ Auto-refresco en vivo pausado');
      });
    }

    const selectInterval = document.getElementById('selectAutoSyncInterval');
    if (selectInterval) {
      if (config.autoRefreshIntervalMs) {
        selectInterval.value = String(config.autoRefreshIntervalMs);
      }
      selectInterval.addEventListener('change', () => {
        const current = DB.getConfig();
        const ms = parseInt(selectInterval.value, 10) || 30000;
        DB.saveConfig({ ...current, autoRefreshIntervalMs: ms });
        this.showSyncToast(`⏱️ Frecuencia de auto-refresco: ${ms / 1000}s`);
      });
    }

    const btnSave = document.getElementById('btnSaveConfig');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const val = (document.getElementById('googleSheetsUrlInput')?.value || '').trim();
        const autoSync = document.getElementById('chkAutoSyncEnabled') ? document.getElementById('chkAutoSyncEnabled').checked : true;
        const intervalMs = document.getElementById('selectAutoSyncInterval') ? (parseInt(document.getElementById('selectAutoSyncInterval').value, 10) || 30000) : 30000;

        DB.saveConfig({
          ...config,
          googleSheetsUrl: val,
          autoSyncEnabled: autoSync,
          autoRefreshIntervalMs: intervalMs
        });

        alert('✅ Configuración de Google Sheets guardada correctamente. Se inició la sincronización en vivo.');
        await this.pullDataFromGoogleSheets();
      });
    }

    const btnTest = document.getElementById('btnTestGoogleSheets');
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        const val = (document.getElementById('googleSheetsUrlInput')?.value || '').trim();
        if (!val) {
          alert('Por favor ingresa primero la URL del Web App de Google Apps Script.');
          return;
        }
        try {
          alert('Probando conexión enviando registro de prueba...');
          await fetch(val, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'ping', test: true, timestamp: new Date().toISOString() })
          });
          alert('✅ Solicitud enviada a Google Sheets exitosamente.');
        } catch (e) {
          alert('Conexión enviada (en modo cliente estático). Revisa tu hoja de Google Sheets para verificar la fila.');
        }
      });
    }

    // Botón para sincronizar únicamente Directorio de Empleados y Enlaces para WhatsApp
    const btnSyncEmployees = document.getElementById('btnSyncEmployeesSheets');
    if (btnSyncEmployees) {
      btnSyncEmployees.addEventListener('click', async () => {
        const conf = DB.getConfig();
        if (!conf.googleSheetsUrl) {
          alert('Por favor ingresa primero la URL de tu Google Apps Script en la Pestaña 4 (Configuración).');
          return;
        }

        btnSyncEmployees.disabled = true;
        btnSyncEmployees.textContent = '⏳ Sincronizando directorio...';
        try {
          const res = await DB.syncAllEmployeesToGoogleSheets();
          if (res.success) {
            alert(`✅ Directorio actualizado en Google Sheets:\n${res.count} colaboradores y sus enlaces de WhatsApp fueron guardados en la hoja "Empleados_Enlaces".`);
          } else {
            alert(`⚠️ Error al sincronizar: ${res.message || res.error}`);
          }
        } catch (err) {
          alert('✅ Solicitud de directorio enviada a Google Sheets.');
        } finally {
          btnSyncEmployees.disabled = false;
          btnSyncEmployees.innerHTML = `
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M21.17 3.25Q21.5 3.25 21.75 3.5 22 3.75 22 4.08V19.92Q22 20.25 21.75 20.5 21.5 20.75 21.17 20.75H7.83Q7.5 20.75 7.25 20.5 7 20.25 7 19.92V17H2.83Q2.5 17 2.25 16.75 2 16.5 2 16.17V7.83Q2 7.5 2.25 7.25 2.5 7 2.83 7H7V4.08Q7 3.75 7.25 3.5 7.5 3.25 7.83 3.25H21.17M7 15H3.5V9H7V15M20.5 4.75H8.5V19.25H20.5V4.75M16.5 12L18.5 16H16.2L15.2 13.8L14.2 16H11.9L13.9 12L12 8H14.3L15.2 10.2L16.1 8H18.4L16.5 12Z"/></svg>
            Sincronizar Directorio a Google Sheets
          `;
        }
      });
    }

    // Botón para sincronizar masivamente TODO el sistema a Google Sheets
    const btnSyncAll = document.getElementById('btnSyncAllToSheets');
    if (btnSyncAll) {
      btnSyncAll.addEventListener('click', async () => {
        const conf = DB.getConfig();
        if (!conf.googleSheetsUrl) {
          alert('Por favor ingresa primero la URL del Web App de Google Apps Script arriba y pulsa "Guardar URL".');
          return;
        }

        btnSyncAll.disabled = true;
        btnSyncAll.textContent = '⏳ Sincronizando todo el sistema...';
        try {
          const res = await DB.syncAllDataToGoogleSheets();
          if (res.success) {
            alert(`✅ Sincronización completa con Google Sheets exitosa:\n• ${res.empCount} Colaboradores y enlaces en "Empleados_Enlaces"\n• ${res.recCount} Boletas y justificaciones en "HorasExtras_HACCP"\n• ${res.procCount} Períodos de planilla en "SalidaProcesos"\n• ${res.usrCount || 0} Usuarios del Panel en "Usuarios_Panel"`);
          } else {
            alert(`⚠️ Error: ${res.message || res.error}`);
          }
        } catch (err) {
          alert('✅ Solicitud masiva enviada a Google Sheets.');
        } finally {
          btnSyncAll.disabled = false;
          btnSyncAll.textContent = '🚀 Sincronizar TODO a Google Sheets';
        }
      });
    }

    // Botón para Limpiar Registros Duplicados en Google Sheets
    const btnCleanDuplicates = document.getElementById('btnCleanDuplicates');
    if (btnCleanDuplicates) {
      btnCleanDuplicates.addEventListener('click', async () => {
        const conf = DB.getConfig();
        if (!conf.googleSheetsUrl) {
          alert('Por favor ingresa primero la URL del Web App de Google Apps Script arriba y pulsa "Guardar URL".');
          return;
        }

        const proceed = confirm(
          '¿Deseas analizar y eliminar registros duplicados en tus hojas de Google Sheets?\n\n' +
          'Esta acción es segura: conservará un registro único de cada colaborador y turno, ' +
          'eliminando únicamente repeticiones accidentales sin perder firmas ni observaciones.'
        );
        if (!proceed) return;

        btnCleanDuplicates.disabled = true;
        const origText = btnCleanDuplicates.textContent;
        btnCleanDuplicates.textContent = '⏳ Depurando duplicados en Google Sheets...';

        try {
          const res = await DB.cleanDuplicatesInGoogleSheets();
          if (res && res.status === 'success') {
            const sum = res.summary || {};
            alert(
              `✅ Depuración de duplicados completada:\n\n` +
              `• Duplicados en Horas Extras: ${sum.horasExtras || 0}\n` +
              `• Duplicados en Empleados: ${sum.empleados || 0}\n` +
              `• Duplicados en Salida de Procesos: ${sum.procesos || 0}\n` +
              `• Duplicados en Usuarios del Panel: ${sum.usuarios || 0}\n\n` +
              `Total de duplicados eliminados: ${res.totalRemoved || 0}\n` +
              `Google Sheets ha quedado 100% optimizado y limpio.`
            );
            await this.pullDataFromGoogleSheets();
          } else {
            alert(`⚠️ Error al depurar duplicados: ${res.message || res.error || 'Respuesta inesperada'}`);
          }
        } catch (err) {
          alert('⚠️ Error al comunicarse con Google Sheets: ' + err.message);
        } finally {
          btnCleanDuplicates.disabled = false;
          btnCleanDuplicates.textContent = origText;
        }
      });
    }

    // Botones para Cargar / Leer datos desde Google Sheets (Pull / Read)
    const handlePull = () => this.pullDataFromGoogleSheets();
    const btnPullHeader = document.getElementById('btnPullSheetsHeader');
    if (btnPullHeader) btnPullHeader.addEventListener('click', handlePull);
    const btnPullTab = document.getElementById('btnPullFromSheets');
    if (btnPullTab) btnPullTab.addEventListener('click', handlePull);

    const btnBackup = document.getElementById('btnExportBackup');
    if (btnBackup) {
      btnBackup.addEventListener('click', () => DB.exportBackupJSON());
    }

    const fileImport = document.getElementById('fileImportBackup');
    if (fileImport) {
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (DB.importBackupJSON(event.target.result)) {
            alert('✅ Copia de seguridad restaurada correctamente.');
            window.location.reload();
          } else {
            alert('Error al leer el archivo JSON de respaldo.');
          }
        };
        reader.readAsText(file);
      });
    }

    const btnResetFactory = document.getElementById('btnResetFactory');
    if (btnResetFactory) {
      btnResetFactory.addEventListener('click', () => {
        if (confirm('¿Deseas restaurar los datos iniciales de fábrica con el ejemplo de Álvaro Sequeira?')) {
          DB.resetToFactory();
          window.location.reload();
        }
      });
    }

  },

  // Realiza la lectura completa (Read) de las 4 hojas de Google Sheets
  async pullDataFromGoogleSheets() {
    const conf = DB.getConfig();
    if (!conf.googleSheetsUrl) {
      alert('Por favor ingresa primero la URL de tu Google Apps Script en la Pestaña 4 (Configuración).');
      return;
    }

    const btnPullHeader = document.getElementById('btnPullSheetsHeader');
    const btnPullTab = document.getElementById('btnPullFromSheets');

    if (btnPullHeader) {
      btnPullHeader.disabled = true;
      btnPullHeader.innerHTML = '<span>⏳ Cargando...</span>';
    }
    if (btnPullTab) {
      btnPullTab.disabled = true;
      btnPullTab.textContent = '⏳ Cargando desde Google Sheets...';
    }

    try {
      const res = await DB.loadAllFromGoogleSheets();
      if (res.success) {
        this.populateEmployeeFilters();
        this.renderDashboard();
        this.renderEmployees();
        this.renderAdminUsers();
        if (window.ProcesosModule) ProcesosModule.loadPeriods();

        alert(`✅ Datos cargados y sincronizados desde Google Sheets:\n• ${res.counts.employees} Empleados (Empleados_Enlaces)\n• ${res.counts.records} Registros de Horas Extras (HorasExtras_HACCP)\n• ${res.counts.processControls} Períodos de Planilla (SalidaProcesos)\n• ${res.counts.adminUsers} Usuarios del Panel (Usuarios_Panel)`);
      } else {
        alert(`⚠️ No se pudieron cargar los datos: ${res.message || res.error}`);
      }
    } catch (err) {
      alert(`⚠️ Error consultando Google Sheets: ${err.message || err}`);
    } finally {
      if (btnPullHeader) {
        btnPullHeader.disabled = false;
        btnPullHeader.innerHTML = `
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          <span class="hidden sm:inline">📥 Cargar de Google Sheets</span>
          <span class="sm:hidden">📥 Nube</span>
        `;
      }
      if (btnPullTab) {
        btnPullTab.disabled = false;
        btnPullTab.textContent = '📥 Cargar / Refrescar desde Google Sheets';
      }
    }
  },

  // --- GESTIÓN DE USUARIOS DEL PANEL (ADMIN Y VISOR) ---
  renderAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    const users = DB.getAdminUsers();
    tbody.innerHTML = '';

    const isVisor = this.currentRole === 'visor';

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400">No hay usuarios del panel registrados.</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50 transition-colors';
      const roleBadge = u.role === 'admin'
        ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Administrador</span>'
        : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Visor de Reportes</span>';

      const dateStr = u.createdAt ? TimeUtils.formatDateDMY(u.createdAt.substring(0, 10)) : 'Inicial';

      tr.innerHTML = `
        <td class="py-2.5 px-4 font-mono font-bold text-slate-800">${u.username}</td>
        <td class="py-2.5 px-4 text-slate-700 font-medium">${u.name || u.username}</td>
        <td class="py-2.5 px-4">${roleBadge}</td>
        <td class="py-2.5 px-4 text-slate-500">${dateStr}</td>
        <td class="py-2.5 px-4 text-center">
          ${!isVisor ? `
            <button type="button" class="text-xs font-semibold text-blue-600 hover:text-blue-800 mr-2" onclick="AdminApp.editAdminUser('${u.id}')">
              Editar
            </button>
            <button type="button" class="text-xs font-semibold text-red-600 hover:text-red-800" onclick="AdminApp.deleteAdminUser('${u.id}')">
              Eliminar
            </button>
          ` : '<span class="text-slate-400 text-xs italic">Solo lectura</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  bindAdminUserModals() {
    const btnOpen = document.getElementById('btnOpenCreateAdminUser');
    const modal = document.getElementById('createAdminUserModal');
    const btnClose = document.getElementById('btnCloseCreateAdminUser');
    const form = document.getElementById('createAdminUserForm');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        document.getElementById('adminUserEditId').value = '';
        document.getElementById('titleAdminUserModal').textContent = 'Crear Usuario del Panel';
        form.reset();
        const pass = document.getElementById('adminUserPassword');
        if (pass) {
          pass.required = true;
          pass.placeholder = '••••••••';
        }
        modal.classList.remove('hidden');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('adminUserEditId')?.value?.trim() || '';
        const name = document.getElementById('adminUserFullName')?.value?.trim() || '';
        const username = document.getElementById('adminUserLoginName')?.value?.trim() || '';
        const password = document.getElementById('adminUserPassword')?.value?.trim() || '';
        const role = document.getElementById('adminUserRole')?.value || 'visor';

        if (!username) {
          alert('El nombre de usuario es obligatorio.');
          return;
        }

        if (!id && !password) {
          alert('La contraseña es obligatoria para un nuevo usuario.');
          return;
        }

        if (!id) {
          const duplicateUser = (DB.getAdminUsers() || []).find(u => (u.username || '').trim().toLowerCase() === username.toLowerCase());
          if (duplicateUser) {
            alert(`⚠️ Ya existe un usuario con el nombre de acceso "${username}". Por favor elige otro nombre de usuario.`);
            return;
          }
        }

        const userData = {
          name,
          username,
          role
        };
        if (id) userData.id = id;
        if (password) userData.password = password;

        const submitBtn = form.querySelector('button[type="submit"]');
        const oldText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Guardando en Google Sheets...';
        }

        try {
          await DB.saveAdminUserAsync(userData);
          modal.classList.add('hidden');
          form.reset();
          this.renderAdminUsers();
          this.showSyncToast(`✅ Usuario "${username}" guardado en Google Sheets.`);
        } catch (err) {
          alert('Error al guardar usuario: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = oldText;
          }
        }
      });
    }
  },

  editAdminUser(id) {
    const users = DB.getAdminUsers();
    const user = users.find(u => u.id === id);
    if (!user) return;

    const modal = document.getElementById('createAdminUserModal');
    if (!modal) return;

    document.getElementById('adminUserEditId').value = user.id;
    document.getElementById('titleAdminUserModal').textContent = 'Editar Usuario del Panel';
    document.getElementById('adminUserFullName').value = user.name || '';
    document.getElementById('adminUserLoginName').value = user.username || '';
    document.getElementById('adminUserRole').value = user.role || 'visor';

    const passInput = document.getElementById('adminUserPassword');
    if (passInput) {
      passInput.value = '';
      passInput.required = false;
      passInput.placeholder = '(Dejar en blanco para mantener la actual)';
    }

    modal.classList.remove('hidden');
  },

  async deleteAdminUser(id) {
    const users = DB.getAdminUsers();
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (this.currentUser && this.currentUser.username === user.username) {
      alert('No puedes eliminar tu propio usuario mientras tienes la sesión activa.');
      return;
    }

    if (confirm(`¿Seguro que deseas eliminar al usuario "${user.username}" (${user.role})? Se eliminará de Google Sheets.`)) {
      this.showSyncToast('⏳ Eliminando usuario de Google Sheets...');
      await DB.deleteAdminUserAsync(id);
      this.renderAdminUsers();
      this.showSyncToast('🗑️ Usuario eliminado en Google Sheets con éxito.');
    }
  },

  editEmployee(id) {
    const emp = DB.getEmployeeById(id);
    if (!emp) return;

    const modal = document.getElementById('createEmployeeModal');
    if (!modal) return;

    const editIdEl = document.getElementById('empEditId');
    if (editIdEl) editIdEl.value = emp.id;

    const titleEl = document.getElementById('titleEmployeeModal');
    if (titleEl) titleEl.textContent = 'Editar Empleado';

    document.getElementById('empNewName').value = emp.name || '';
    document.getElementById('empNewCode').value = emp.code || '';
    document.getElementById('empNewPhone').value = emp.phone || '';
    document.getElementById('empNewArea').value = emp.area || 'Equipo HACCP';
    document.getElementById('empNewRole').value = emp.role || 'Inspector de Calidad';
    
    const activeEl = document.getElementById('empNewActive');
    if (activeEl) activeEl.value = emp.active !== false ? 'true' : 'false';

    modal.classList.remove('hidden');
  },

  openCreateRecordModal() {
    const modal = document.getElementById('recordModal');
    const form = document.getElementById('recordForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('recordEditId').value = '';
    document.getElementById('titleRecordModal').textContent = 'Registrar Horas Extras';
    document.getElementById('recordEditDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('recordEditHours').value = '1';
    document.getElementById('recordEditMinutes').value = '0';

    this.populateRecordEmployeeSelect();

    const vacFields = document.getElementById('recordVacationFields');
    if (vacFields) vacFields.classList.add('hidden');

    modal.classList.remove('hidden');
  },

  editRecord(id) {
    const records = DB.getRecords();
    const record = records.find(r => r.id === id);
    if (!record) return;

    const modal = document.getElementById('recordModal');
    const form = document.getElementById('recordForm');
    if (!modal || !form) return;

    document.getElementById('recordEditId').value = record.id;
    document.getElementById('titleRecordModal').textContent = 'Editar Registro de Horas Extras';
    this.populateRecordEmployeeSelect(record.employeeId);
    document.getElementById('recordEditDate').value = record.date || '';

    const dec = parseFloat(record.decimalHours) || 0;
    const totalMinutes = Math.round(dec * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    document.getElementById('recordEditHours').value = h;
    document.getElementById('recordEditMinutes').value = m;

    document.getElementById('recordEditProcess').value = record.processType || 'General';
    document.getElementById('recordEditJustification').value = record.justification || '';

    const chkVac = document.getElementById('recordEditHadVacation');
    const vacFields = document.getElementById('recordVacationFields');
    if (chkVac) chkVac.checked = !!record.hadVacation;
    if (vacFields) {
      if (record.hadVacation) {
        vacFields.classList.remove('hidden');
        document.getElementById('recordEditVacFrom').value = record.vacationFrom || '';
        document.getElementById('recordEditVacTo').value = record.vacationTo || '';
        document.getElementById('recordEditVacDays').value = record.vacationDays || 0;
      } else {
        vacFields.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  },

  populateRecordEmployeeSelect(selectedId = '') {
    const select = document.getElementById('recordEditEmployee');
    if (!select) return;
    const emps = DB.getEmployees();
    select.innerHTML = '';
    emps.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = `${emp.name} (${emp.code || emp.area})`;
      if (emp.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  },

  bindRecordModals() {
    const btnOpen = document.getElementById('btnOpenCreateRecord');
    const modal = document.getElementById('recordModal');
    const btnClose = document.getElementById('btnCloseRecordModal');
    const form = document.getElementById('recordForm');
    const chkVac = document.getElementById('recordEditHadVacation');
    const vacFields = document.getElementById('recordVacationFields');

    if (btnOpen) {
      btnOpen.addEventListener('click', () => this.openCreateRecordModal());
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (chkVac && vacFields) {
      chkVac.addEventListener('change', () => {
        if (chkVac.checked) vacFields.classList.remove('hidden');
        else vacFields.classList.add('hidden');
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('recordEditId')?.value?.trim();
        const employeeId = document.getElementById('recordEditEmployee')?.value;
        const date = document.getElementById('recordEditDate')?.value;
        const hours = parseInt(document.getElementById('recordEditHours')?.value || '0', 10);
        const minutes = parseInt(document.getElementById('recordEditMinutes')?.value || '0', 10);
        const processType = document.getElementById('recordEditProcess')?.value;
        const justification = document.getElementById('recordEditJustification')?.value?.trim();
        const hadVacation = document.getElementById('recordEditHadVacation')?.checked || false;
        const vacFrom = document.getElementById('recordEditVacFrom')?.value || '';
        const vacTo = document.getElementById('recordEditVacTo')?.value || '';
        const vacDays = parseInt(document.getElementById('recordEditVacDays')?.value || '0', 10);

        if (!employeeId || !date) {
          alert('Por favor selecciona empleado y fecha del turno.');
          return;
        }

        const decimal = TimeUtils.toDecimal(hours, minutes);
        const human = TimeUtils.toHuman(decimal);

        const recordData = {
          employeeId,
          date,
          hours,
          minutes,
          decimalHours: decimal,
          hoursText: human,
          processType,
          justification,
          hadVacation,
          vacationFrom: vacFrom,
          vacationTo: vacTo,
          vacationDays: vacDays
        };

        if (id) {
          recordData.id = id;
          const existing = (DB.getRecords() || []).find(r => r.id === id);
          if (existing && existing.signature) {
            recordData.signature = existing.signature;
          }
        } else {
          // Si es un nuevo registro, verificar si ya existe uno para este colaborador, fecha y proceso
          const existing = (DB.getRecords() || []).find(r => 
            r.employeeId === employeeId && 
            r.date === date && 
            (r.processType || 'General').trim().toLowerCase() === (processType || 'General').trim().toLowerCase()
          );
          if (existing) {
            const empName = DB.getEmployeeById(employeeId)?.name || 'el colaborador';
            const confirmUpdate = confirm(
              `Ya existe un registro para ${empName} en la fecha ${date} (${processType || 'General'}).\n\n¿Deseas actualizar el registro existente en lugar de crear un duplicado?`
            );
            if (confirmUpdate) {
              recordData.id = existing.id;
              if (existing.signature) recordData.signature = existing.signature;
            } else {
              return;
            }
          }
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const oldText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Guardando en Google Sheets...';
        }

        try {
          await DB.saveRecordAsync(recordData);
          if (modal) modal.classList.add('hidden');
          this.renderDashboard();
          this.showSyncToast(id ? '✅ Registro de horas actualizado en Google Sheets.' : '✅ Registro de horas guardado en Google Sheets.');
        } catch (err) {
          alert('Error al guardar registro: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = oldText;
          }
        }
      });
    }
  },

  bindModals() {
    // Modal Crear / Editar Empleado
    const btnOpenCreate = document.getElementById('btnOpenCreateEmployee');
    const modalCreate = document.getElementById('createEmployeeModal');
    const btnCloseCreate = document.getElementById('btnCloseCreateEmployee');
    const formCreate = document.getElementById('createEmployeeForm');

    if (btnOpenCreate && modalCreate) {
      btnOpenCreate.addEventListener('click', () => {
        formCreate.reset();
        const editIdEl = document.getElementById('empEditId');
        if (editIdEl) editIdEl.value = '';
        const titleEl = document.getElementById('titleEmployeeModal');
        if (titleEl) titleEl.textContent = 'Crear Nuevo Empleado';
        const activeEl = document.getElementById('empNewActive');
        if (activeEl) activeEl.value = 'true';
        modalCreate.classList.remove('hidden');
      });
    }
    if (btnCloseCreate && modalCreate) {
      btnCloseCreate.addEventListener('click', () => modalCreate.classList.add('hidden'));
    }

    if (formCreate) {
      formCreate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('empEditId')?.value?.trim();
        const name = document.getElementById('empNewName').value.trim();
        const code = document.getElementById('empNewCode').value.trim();
        const area = document.getElementById('empNewArea').value.trim();
        const role = document.getElementById('empNewRole').value.trim();
        const phone = document.getElementById('empNewPhone').value.trim();
        const active = document.getElementById('empNewActive')?.value !== 'false';

        if (!name || !code) {
          alert('Nombre y Código son requeridos.');
          return;
        }

        if (!editId) {
          const duplicateCode = (DB.getEmployees() || []).find(e => (e.code || '').trim().toUpperCase() === code.toUpperCase());
          if (duplicateCode) {
            alert(`⚠️ Ya existe un colaborador con el código "${code}" (${duplicateCode.name}). Por favor usa un código único o edita el colaborador existente.`);
            return;
          }
        }

        const empData = {
          name,
          code,
          area: area || 'Equipo HACCP',
          role: role || 'Inspector de Calidad',
          phone,
          active
        };

        if (editId) {
          empData.id = editId;
          const existing = DB.getEmployeeById(editId);
          if (existing && existing.createdAt) {
            empData.createdAt = existing.createdAt;
          }
        }

        const submitBtn = formCreate.querySelector('button[type="submit"]');
        const oldText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Guardando en Google Sheets...';
        }

        try {
          await DB.saveEmployeeAsync(empData);
          modalCreate.classList.add('hidden');
          formCreate.reset();
          this.populateEmployeeFilters();
          this.renderEmployees();
          this.renderDashboard();
          this.showSyncToast(editId 
            ? `✅ Empleado "${name}" actualizado en Google Sheets.` 
            : `✅ Empleado "${name}" creado en Google Sheets.`);
        } catch (err) {
          alert('Error al guardar empleado: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = oldText;
          }
        }
      });
    }

    // Modal QR
    const btnCloseQR = document.getElementById('btnCloseQRModal');
    const modalQR = document.getElementById('qrModal');
    if (btnCloseQR && modalQR) {
      btnCloseQR.addEventListener('click', () => modalQR.classList.add('hidden'));
    }

    // Modal Detalle
    const btnCloseDetail = document.getElementById('btnCloseRecordDetail');
    const modalDetail = document.getElementById('recordDetailModal');
    if (btnCloseDetail && modalDetail) {
      btnCloseDetail.addEventListener('click', () => modalDetail.classList.add('hidden'));
    }
  }
};

window.AdminApp = AdminApp;
