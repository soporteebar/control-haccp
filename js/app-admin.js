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
    this.bindModals();
    ProcesosModule.init();
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
        <td class="py-3 px-4 text-center">
          <button class="btn-action-view text-xs font-semibold text-blue-600 hover:text-blue-800 mr-1" onclick="AdminApp.viewRecordDetail('${r.id}')" title="Ver detalle completo">
            Ver
          </button>
          ${!isVisor ? `
            <button class="btn-action-delete text-xs font-semibold text-red-600 hover:text-red-800" onclick="AdminApp.deleteRecord('${r.id}')" title="Eliminar">
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
          <button class="btn-sm-danger ml-auto" onclick="AdminApp.deleteEmployee('${emp.id}')" title="Eliminar Empleado">
            Eliminar
          </button>
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

  deleteEmployee(id) {
    if (confirm('¿Deseas eliminar este empleado? Sus registros se mantendrán pero ya no aparecerá activo.')) {
      DB.deleteEmployee(id);
      this.populateEmployeeFilters();
      this.renderEmployees();
      this.renderDashboard();
    }
  },

  deleteRecord(id) {
    if (confirm('¿Seguro que deseas eliminar este registro de horas extras?')) {
      DB.deleteRecord(id);
      this.renderDashboard();
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

    const btnSave = document.getElementById('btnSaveConfig');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const val = (document.getElementById('googleSheetsUrlInput')?.value || '').trim();
        DB.saveConfig({ ...config, googleSheetsUrl: val });
        alert('✅ Configuración de Google Sheets guardada correctamente.');
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
      form.addEventListener('submit', (e) => {
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

        const userData = {
          name,
          username,
          role
        };
        if (id) userData.id = id;
        if (password) userData.password = password;

        DB.saveAdminUser(userData);
        modal.classList.add('hidden');
        form.reset();
        this.renderAdminUsers();
        alert(`✅ Usuario "${username}" (${role === 'admin' ? 'Administrador' : 'Visor'}) guardado con éxito.`);
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

  deleteAdminUser(id) {
    const users = DB.getAdminUsers();
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (this.currentUser && this.currentUser.username === user.username) {
      alert('No puedes eliminar tu propio usuario mientras tienes la sesión activa.');
      return;
    }

    if (confirm(`¿Seguro que deseas eliminar al usuario "${user.username}" (${user.role})?`)) {
      if (DB.deleteAdminUser(id)) {
        this.renderAdminUsers();
        alert('Usuario eliminado del panel.');
      }
    }
  },

  bindModals() {
    // Modal Crear Empleado
    const btnOpenCreate = document.getElementById('btnOpenCreateEmployee');
    const modalCreate = document.getElementById('createEmployeeModal');
    const btnCloseCreate = document.getElementById('btnCloseCreateEmployee');
    const formCreate = document.getElementById('createEmployeeForm');

    if (btnOpenCreate && modalCreate) {
      btnOpenCreate.addEventListener('click', () => modalCreate.classList.remove('hidden'));
    }
    if (btnCloseCreate && modalCreate) {
      btnCloseCreate.addEventListener('click', () => modalCreate.classList.add('hidden'));
    }

    if (formCreate) {
      formCreate.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('empNewName').value.trim();
        const code = document.getElementById('empNewCode').value.trim();
        const area = document.getElementById('empNewArea').value.trim();
        const role = document.getElementById('empNewRole').value.trim();
        const phone = document.getElementById('empNewPhone').value.trim();

        if (!name || !code) {
          alert('Nombre y Código son requeridos.');
          return;
        }

        DB.saveEmployee({
          name,
          code,
          area: area || 'Equipo HACCP',
          role: role || 'Inspector',
          phone,
          active: true
        });

        modalCreate.classList.add('hidden');
        formCreate.reset();
        this.populateEmployeeFilters();
        this.renderEmployees();
        this.renderDashboard();
        alert(`✅ Empleado ${name} creado con éxito. Ahora puedes copiar su enlace personalizado.`);
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
