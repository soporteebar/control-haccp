/**
 * db.js - Capa de Datos y Persistencia para Sistema HACCP
 * Compatible con GitHub Pages (LocalStorage + Sincronización Google Sheets)
 */

const DB_KEY = 'HACCP_APP_DATA_V1';
const CONFIG_KEY = 'HACCP_CONFIG_V1';

// Formato y conversión de horas
const TimeUtils = {
  // Convierte horas y minutos a decimal (ej: 1h y 25min -> 1.42)
  toDecimal(hours, minutes) {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    return Math.round((h + (m / 60)) * 100) / 100;
  },

  // Convierte decimal a texto amigable (ej: 1.42 -> "1h y 25m")
  toHuman(decimal) {
    if (!decimal && decimal !== 0) return '0h';
    const totalMinutes = Math.round(decimal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} minutos`;
    if (m === 0) return `${h} ${h === 1 ? 'hora' : 'horas'}`;
    return `${h}h y ${m} minutos`;
  },

  // Normaliza cadenas de hora tipo "7:8" -> "07:08", "16:5" -> "16:05"
  normalizeTimeString(str) {
    if (!str) return '';
    const clean = str.trim();
    const parts = clean.split(':');
    if (parts.length === 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      return `${h}:${m}`;
    }
    return str;
  },

  // Obtiene nombre del día de una fecha YYYY-MM-DD
  getDayName(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()] || '';
  },

  // Formato dd/mm/yyyy
  formatDateDMY(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  },

  // Limpia número de teléfono dejando solo dígitos
  cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }
};

const DB = {
  // Datos semilla iniciales basados en los documentos reales
  getInitialData() {
    return {
      _version: 2,
      employees: [
        {
          id: 'emp_01',
          code: 'EMP-01',
          name: 'Álvaro José Sequeira Amador',
          role: 'Inspector de Calidad',
          area: 'Equipo HACCP',
          phone: '+505 8888-0001',
          active: true,
          createdAt: '2026-08-01'
        },
        {
          id: 'emp_02',
          code: 'EMP-02',
          name: 'Carlos Eduardo Mendoza Ruiz',
          role: 'Operador Línea',
          area: 'Deshuese y Vísceras',
          phone: '+505 8888-0002',
          active: true,
          createdAt: '2026-08-01'
        },
        {
          id: 'emp_03',
          code: 'EMP-03',
          name: 'Marta Elena Solís Vega',
          role: 'Supervisora de Inocuidad',
          area: 'Equipo HACCP',
          phone: '+505 8888-0003',
          active: true,
          createdAt: '2026-08-01'
        }
      ],
      records: [
        {
          id: 'rec_01',
          employeeId: 'emp_01',
          date: '2026-08-26',
          hours: 1,
          minutes: 25,
          decimalHours: 1.42,
          hoursText: '1h y 25 minutos',
          justification: 'Proceso de Matanza extendido hasta las 4:25pm debido a inspección exhaustiva de puntos críticos de control (PCC) ante ingreso tardío de ganado.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-08-26T16:30:00'
        },
        {
          id: 'rec_02',
          employeeId: 'emp_01',
          date: '2026-08-27',
          hours: 0,
          minutes: 55,
          decimalHours: 0.92,
          hoursText: '55 minutos',
          justification: 'Proceso de Matanza 3:55pm. Verificación de eviscerado, lavado de canales y toma de temperaturas reglamentarias de refrigeración.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-08-27T16:00:00'
        },
        {
          id: 'rec_03',
          employeeId: 'emp_01',
          date: '2026-08-28',
          hours: 1,
          minutes: 25,
          decimalHours: 1.42,
          hoursText: '1h y 25 minutos',
          justification: 'Proceso de Matanza 4:25pm. Monitoreo del flujo continuo en línea de sacrificio e inspección de sellado sanitario.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-08-28T16:30:00'
        },
        {
          id: 'rec_04',
          employeeId: 'emp_01',
          date: '2026-08-29',
          hours: 1,
          minutes: 30,
          decimalHours: 1.50,
          hoursText: '1h y 30 minutos',
          justification: 'Proceso de Matanza 4:30pm. Cierre de faena semanal, desinfección de cámaras frigoríficas y validación de parámetros sanitarios.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-08-29T16:40:00'
        },
        {
          id: 'rec_05',
          employeeId: 'emp_01',
          date: '2026-08-31',
          hours: 4,
          minutes: 5,
          decimalHours: 4.08,
          hoursText: '4h y 5 minutos',
          justification: 'Pic Deshuese y Proceso de Vísceras 6:05pm. Supervisión completa de la línea de despiece fino, envasado al vacío y control estricto de temperatura en sala de deshuese.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-08-31T18:15:00'
        },
        {
          id: 'rec_06',
          employeeId: 'emp_01',
          date: '2026-09-01',
          hours: 2,
          minutes: 55,
          decimalHours: 2.92,
          hoursText: '2h y 55 minutos',
          justification: 'Pic Deshuese y Proceso de Vísceras 6:30pm. Control de pesaje, rotulado de trazabilidad por lote y empaque en cajas para despacho inmediato.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-01T18:35:00'
        },
        {
          id: 'rec_07',
          employeeId: 'emp_01',
          date: '2026-09-02',
          hours: 3,
          minutes: 15,
          decimalHours: 3.25,
          hoursText: '3h y 15 minutos',
          justification: 'Pic Deshuese y Proceso de Vísceras 5:15pm. Acompañamiento a auditores internos y muestreo microbiológico de superficies en contacto con alimentos.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-02T17:25:00'
        },
        {
          id: 'rec_08',
          employeeId: 'emp_01',
          date: '2026-09-03',
          hours: 3,
          minutes: 30,
          decimalHours: 3.50,
          hoursText: '3h y 30 minutos',
          justification: 'Pic Deshuese y Proceso de Vísceras 5:30pm. Apoyo en línea ante alto volumen de cortes especiales para exportación y cierre de lote.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-03T17:40:00'
        },
        {
          id: 'rec_09',
          employeeId: 'emp_01',
          date: '2026-09-04',
          hours: 2,
          minutes: 0,
          decimalHours: 2.00,
          hoursText: '2 horas',
          justification: 'Proceso de Deshuese 4:00pm. Cuadratura de inventario de cortes primarios y secundarios.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-04T16:05:00'
        },
        {
          id: 'rec_10',
          employeeId: 'emp_01',
          date: '2026-09-05',
          hours: 3,
          minutes: 25,
          decimalHours: 3.42,
          hoursText: '3h y 25 minutos',
          justification: 'Proceso de Deshuese. Muestreo de corte y verificación de pH en cuartos refrigerados.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-05T16:30:00'
        },
        {
          id: 'rec_11',
          employeeId: 'emp_01',
          date: '2026-09-07',
          hours: 2,
          minutes: 0,
          decimalHours: 2.00,
          hoursText: '2 horas',
          justification: 'Carga de contenedores refrigerados con destino a puerto para exportación.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-07T16:10:00'
        },
        {
          id: 'rec_12',
          employeeId: 'emp_01',
          date: '2026-09-08',
          hours: 1,
          minutes: 55,
          decimalHours: 1.92,
          hoursText: '1h y 55 minutos',
          justification: 'Apoyo Deshuese e inspección final de sanidad e higiene en área de empaque.',
          hadVacation: false,
          signature: null,
          createdAt: '2026-09-08T16:00:00'
        }
      ],
      vacations: [
        {
          id: 'vac_01',
          employeeId: 'emp_01',
          taken: false,
          fromDate: '',
          toDate: '',
          daysCount: 0,
          notes: 'Período regular sin descanso vacacional registrado.'
        }
      ],
      adminUsers: [
        {
          id: 'adm_01',
          username: 'admin',
          password: 'Admin25#',
          name: 'Administrador General',
          role: 'admin',
          createdAt: '2026-08-01'
        },
        {
          id: 'adm_02',
          username: 'visor',
          password: 'VisorDM',
          name: 'Supervisor / Visor de Reportes',
          role: 'visor',
          createdAt: '2026-08-01'
        }
      ],
      processControls: [
        {
          periodId: '2026-08-26_2026-09-10',
          periodTitle: '26/08/2026 al 10/09/2026',
          rows: [
            { date: '2026-08-26', day: 'Miércoles', horaMatanza: '16:25', horaViscera: '17:15', horaDeshuese: '18:00', horaDescargaCarton: '18:45', observaciones: 'Recepción tardía de lote' },
            { date: '2026-08-27', day: 'Jueves', horaMatanza: '15:55', horaViscera: '16:40', horaDeshuese: '17:30', horaDescargaCarton: '18:00', observaciones: 'Faena continua' },
            { date: '2026-08-28', day: 'Viernes', horaMatanza: '16:25', horaViscera: '17:10', horaDeshuese: '17:50', horaDescargaCarton: '18:30', observaciones: 'Inspección PCC' },
            { date: '2026-08-29', day: 'Sábado', horaMatanza: '16:30', horaViscera: '17:00', horaDeshuese: '17:45', horaDescargaCarton: '18:15', observaciones: 'Despacho extraordinario' },
            { date: '2026-08-31', day: 'Lunes', horaMatanza: '15:30', horaViscera: '18:05', horaDeshuese: '18:05', horaDescargaCarton: '19:00', observaciones: 'Limpieza e inspección de sala' },
            { date: '2026-09-01', day: 'Martes', horaMatanza: '15:45', horaViscera: '18:30', horaDeshuese: '18:30', horaDescargaCarton: '19:15', observaciones: 'Empaque de cajas para exportación' },
            { date: '2026-09-02', day: 'Miércoles', horaMatanza: '15:00', horaViscera: '17:15', horaDeshuese: '17:15', horaDescargaCarton: '18:00', observaciones: 'Muestreo microbiológico' },
            { date: '2026-09-03', day: 'Jueves', horaMatanza: '15:10', horaViscera: '17:30', horaDeshuese: '17:30', horaDescargaCarton: '18:10', observaciones: 'Cierre de lote' },
            { date: '2026-09-04', day: 'Viernes', horaMatanza: '15:00', horaViscera: '15:45', horaDeshuese: '16:00', horaDescargaCarton: '17:00', observaciones: 'Cuadratura de inventario' },
            { date: '2026-09-05', day: 'Sábado', horaMatanza: '15:15', horaViscera: '16:00', horaDeshuese: '16:45', horaDescargaCarton: '17:30', observaciones: 'Muestreo de cortes refrigerados' },
            { date: '2026-09-07', day: 'Lunes', horaMatanza: '15:00', horaViscera: '15:30', horaDeshuese: '16:00', horaDescargaCarton: '16:00', observaciones: 'Carga de contenedores' },
            { date: '2026-09-08', day: 'Martes', horaMatanza: '15:00', horaViscera: '15:30', horaDeshuese: '16:15', horaDescargaCarton: '17:00', observaciones: 'Apoyo deshuese y empaque' }
          ]
        },
        {
          periodId: '2026-09-26_2026-10-10',
          periodTitle: '26/09/2026 al 10/10/2026',
          rows: [
            { date: '2026-09-26', day: 'Sábado', horaMatanza: '16:25', horaViscera: '17:10', horaDeshuese: '18:05', horaDescargaCarton: '19:00', observaciones: 'Turno extendido por recepción' },
            { date: '2026-09-28', day: 'Lunes', horaMatanza: '15:55', horaViscera: '16:30', horaDeshuese: '17:15', horaDescargaCarton: '18:00', observaciones: 'Operación normal' },
            { date: '2026-09-29', day: 'Martes', horaMatanza: '15:30', horaViscera: '16:15', horaDeshuese: '17:00', horaDescargaCarton: '17:45', observaciones: '' },
            { date: '2026-09-30', day: 'Miércoles', horaMatanza: '16:10', horaViscera: '16:50', horaDeshuese: '17:40', horaDescargaCarton: '18:20', observaciones: 'Lote especial' },
            { date: '2026-10-01', day: 'Jueves', horaMatanza: '15:45', horaViscera: '16:20', horaDeshuese: '17:10', horaDescargaCarton: '17:50', observaciones: '' },
            { date: '2026-10-02', day: 'Viernes', horaMatanza: '16:00', horaViscera: '16:45', horaDeshuese: '17:50', horaDescargaCarton: '18:30', observaciones: 'Mantenimiento en sierra' },
            { date: '2026-10-03', day: 'Sábado', horaMatanza: '14:30', horaViscera: '15:10', horaDeshuese: '16:00', horaDescargaCarton: '16:40', observaciones: 'Medio turno' },
            { date: '2026-10-05', day: 'Lunes', horaMatanza: '15:35', horaViscera: '16:15', horaDeshuese: '17:05', horaDescargaCarton: '17:45', observaciones: '' },
            { date: '2026-10-06', day: 'Martes', horaMatanza: '15:40', horaViscera: '16:20', horaDeshuese: '17:00', horaDescargaCarton: '17:40', observaciones: '' },
            { date: '2026-10-07', day: 'Miércoles', horaMatanza: '16:05', horaViscera: '16:45', horaDeshuese: '17:35', horaDescargaCarton: '18:15', observaciones: '' },
            { date: '2026-10-08', day: 'Jueves', horaMatanza: '15:50', horaViscera: '16:30', horaDeshuese: '17:15', horaDescargaCarton: '18:00', observaciones: '' },
            { date: '2026-10-09', day: 'Viernes', horaMatanza: '16:15', horaViscera: '17:00', horaDeshuese: '18:00', horaDescargaCarton: '18:45', observaciones: 'Alto volumen de matanza' },
            { date: '2026-10-10', day: 'Sábado', horaMatanza: '14:15', horaViscera: '14:55', horaDeshuese: '15:45', horaDescargaCarton: '16:30', observaciones: 'Cierre de período' }
          ]
        }
      ]
    };
  },

  // Carga toda la base de datos de localStorage
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        const initial = this.getInitialData();
        this.save(initial);
        return initial;
      }
      const data = JSON.parse(raw);
      let modified = false;

      // Migración única: Asegurar que existan adminUsers y períodos iniciales si es versión antigua
      if (!data._version || data._version < 2) {
        if (!data.adminUsers || data.adminUsers.length === 0) {
          data.adminUsers = this.getInitialData().adminUsers;
          modified = true;
        }
        if (data.processControls && !data.processControls.some(p => p.periodId === '2026-08-26_2026-09-10')) {
          const augustPeriod = this.getInitialData().processControls.find(p => p.periodId === '2026-08-26_2026-09-10');
          if (augustPeriod) {
            data.processControls.unshift(augustPeriod);
            modified = true;
          }
        }
        data._version = 2;
        modified = true;
      }

      if (modified) {
        this.save(data);
      }
      return data;
    } catch (e) {
      console.error('Error al cargar LocalStorage:', e);
      return this.getInitialData();
    }
  },

  // Guarda la base de datos en localStorage
  save(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error al guardar en LocalStorage:', e);
      return false;
    }
  },

  // Configuración del Sistema (Google Sheets)
  getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const defaults = {
        googleSheetsUrl: '',
        autoSync: false,
        companyName: 'MACESA'
      };
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch (e) {
      return {
        googleSheetsUrl: '',
        autoSync: false,
        companyName: 'MACESA'
      };
    }
  },

  saveConfig(config) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- GESTIÓN DE USUARIOS DEL PANEL (ADMIN Y VISOR) ---
  getAdminUsers() {
    const data = this.load();
    if (!data.adminUsers || data.adminUsers.length === 0) {
      data.adminUsers = this.getInitialData().adminUsers;
      this.save(data);
    }
    return data.adminUsers;
  },

  saveAdminUser(user) {
    const data = this.load();
    if (!data.adminUsers) data.adminUsers = this.getAdminUsers();

    if (!user.id) {
      user.id = 'adm_' + Date.now();
      user.createdAt = new Date().toISOString().split('T')[0];
      data.adminUsers.push(user);
    } else {
      const idx = data.adminUsers.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        data.adminUsers[idx] = { ...data.adminUsers[idx], ...user };
      } else {
        data.adminUsers.push(user);
      }
    }
    this.save(data);
    return user;
  },

  deleteAdminUser(id) {
    const data = this.load();
    if (!data.adminUsers) return false;
    // Evitar eliminar el único usuario admin
    const admins = data.adminUsers.filter(u => u.role === 'admin');
    const target = data.adminUsers.find(u => u.id === id);
    if (target && target.role === 'admin' && admins.length <= 1) {
      alert('No se puede eliminar el único usuario con rol de Administrador.');
      return false;
    }
    data.adminUsers = data.adminUsers.filter(u => u.id !== id);
    this.save(data);
    return true;
  },

  validateAdmin(username, password) {
    const users = this.getAdminUsers();
    const uClean = (username || '').trim().toLowerCase();
    const pClean = (password || '').trim();
    const found = users.find(u => u.username.toLowerCase() === uClean && u.password === pClean);
    return found || null;
  },

  getAdminSession() {
    const raw = sessionStorage.getItem('HACCP_ADMIN_USER') || localStorage.getItem('HACCP_ADMIN_USER');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  isAdminLoggedIn() {
    return !!this.getAdminSession();
  },

  setAdminLoggedIn(userObj, remember = false) {
    if (userObj) {
      const sessionStr = JSON.stringify(userObj);
      sessionStorage.setItem('HACCP_ADMIN_USER', sessionStr);
      if (remember) {
        localStorage.setItem('HACCP_ADMIN_USER', sessionStr);
      }
    } else {
      sessionStorage.removeItem('HACCP_ADMIN_USER');
      localStorage.removeItem('HACCP_ADMIN_USER');
    }
  },

  // --- MÉTODOS PARA EMPLEADOS ---
  getEmployees() {
    const data = this.load();
    return data.employees || [];
  },

  getEmployeeById(id) {
    const employees = this.getEmployees();
    return employees.find(e => e.id === id || e.code === id) || null;
  },

  getEmployeeByPhone(inputPhone) {
    if (!inputPhone) return null;
    const cleanInput = inputPhone.replace(/\D/g, '');
    if (!cleanInput) return null;

    const employees = this.getEmployees();
    return employees.find(emp => {
      if (!emp.phone) return false;
      const cleanEmp = emp.phone.replace(/\D/g, '');
      if (cleanEmp === cleanInput) return true;
      // Permite comparar los últimos 8 dígitos (formato estándar de telefonía)
      if (cleanEmp.length >= 8 && cleanInput.length >= 8) {
        const empLast8 = cleanEmp.slice(-8);
        const inputLast8 = cleanInput.slice(-8);
        return empLast8 === inputLast8;
      }
      return false;
    }) || null;
  },

  saveEmployee(employee) {
    const data = this.load();
    if (!employee.id) {
      employee.id = 'emp_' + Date.now();
      employee.createdAt = new Date().toISOString().split('T')[0];
      data.employees.push(employee);
    } else {
      const idx = data.employees.findIndex(e => e.id === employee.id);
      if (idx >= 0) {
        data.employees[idx] = { ...data.employees[idx], ...employee };
      } else {
        data.employees.push(employee);
      }
    }
    this.save(data);
    return employee;
  },

  deleteEmployee(id) {
    const data = this.load();
    data.employees = data.employees.filter(e => e.id !== id);
    this.save(data);
    return true;
  },

  // --- MÉTODOS PARA REGISTROS DE HORAS EXTRAS ---
  getRecords(filters = {}) {
    const data = this.load();
    let records = data.records || [];

    if (filters.employeeId) {
      records = records.filter(r => r.employeeId === filters.employeeId);
    }
    if (filters.fromDate) {
      records = records.filter(r => r.date >= filters.fromDate);
    }
    if (filters.toDate) {
      records = records.filter(r => r.date <= filters.toDate);
    }

    // Orden cronológico
    records.sort((a, b) => (a.date > b.date ? 1 : -1));
    return records;
  },

  saveRecord(record) {
    const data = this.load();
    if (!record.id) {
      record.id = 'rec_' + Date.now();
      record.createdAt = new Date().toISOString();
      data.records.push(record);
    } else {
      const idx = data.records.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        data.records[idx] = { ...data.records[idx], ...record };
      } else {
        data.records.push(record);
      }
    }
    this.save(data);

    // Intentar sincronización con Google Sheets en segundo plano
    this.syncRecordToGoogleSheets(record);

    return record;
  },

  deleteRecord(id) {
    const data = this.load();
    data.records = data.records.filter(r => r.id !== id);
    this.save(data);
    return true;
  },

  // --- MÉTODOS PARA VACACIONES ---
  getVacations(employeeId) {
    const data = this.load();
    const list = data.vacations || [];
    if (!employeeId) return list;
    return list.filter(v => v.employeeId === employeeId);
  },

  saveVacation(vacation) {
    const data = this.load();
    if (!vacation.id) {
      vacation.id = 'vac_' + Date.now();
      data.vacations.push(vacation);
    } else {
      const idx = data.vacations.findIndex(v => v.id === vacation.id);
      if (idx >= 0) {
        data.vacations[idx] = { ...data.vacations[idx], ...vacation };
      } else {
        data.vacations.push(vacation);
      }
    }
    this.save(data);
    return vacation;
  },

  // --- MÉTODOS PARA SALIDA DE PROCESOS ---
  getProcessControls() {
    const data = this.load();
    return data.processControls || [];
  },

  getProcessControlByPeriod(periodId) {
    const list = this.getProcessControls();
    return list.find(p => p.periodId === periodId) || null;
  },

  saveProcessControl(periodData) {
    const data = this.load();
    if (!data.processControls) data.processControls = [];
    const idx = data.processControls.findIndex(p => p.periodId === periodData.periodId);
    if (idx >= 0) {
      data.processControls[idx] = periodData;
    } else {
      data.processControls.push(periodData);
    }
    this.save(data);

    // Sincronizar a Google Sheets
    this.syncProcessesToGoogleSheets(periodData);
    return periodData;
  },

  deleteProcessControl(periodId) {
    const data = this.load();
    if (!data.processControls) return false;
    data.processControls = data.processControls.filter(p => p.periodId !== periodId);
    this.save(data);
    return true;
  },

  // Obtiene la hora de salida oficial de la planilla de procesos para una fecha y proceso
  getProcessExitInfo(dateStr, processType = '', justification = '') {
    if (!dateStr) return { processName: '-', exitTime: '-' };

    let proc = (processType || '').toLowerCase();
    const text = (justification || '').toLowerCase();

    if (!proc || proc === 'general' || proc === 'varios') {
      if (text.includes('matanz')) proc = 'matanza';
      else if (text.includes('deshues')) proc = 'deshuese';
      else if (text.includes('viscer') || text.includes('víscer')) proc = 'visceras';
      else if (text.includes('carton') || text.includes('cartón')) proc = 'carton';
      else if (text.includes('carga')) proc = 'carga';
      else proc = 'general';
    }

    const periods = this.getProcessControls();
    let foundRow = null;

    for (const p of periods) {
      if (p.rows && Array.isArray(p.rows)) {
        const r = p.rows.find(row => row.date === dateStr);
        if (r) {
          foundRow = r;
          break;
        }
      }
    }

    let displayName = 'General';
    if (proc.includes('matanz')) displayName = 'Matanza';
    else if (proc.includes('deshues')) displayName = 'Deshuese';
    else if (proc.includes('viscer') || proc.includes('víscer')) displayName = 'Vísceras';
    else if (proc.includes('carton') || proc.includes('cartón')) displayName = 'Descarga Cartón';
    else if (proc.includes('carga')) displayName = 'Carga';

    if (!foundRow) {
      return {
        processName: displayName,
        exitTime: 'Sin registro',
        allTimes: null
      };
    }

    let exitTime = '';
    if (displayName === 'Matanza') {
      exitTime = foundRow.horaMatanza || 'Pendiente';
    } else if (displayName === 'Deshuese') {
      exitTime = foundRow.horaDeshuese || 'Pendiente';
    } else if (displayName === 'Vísceras') {
      exitTime = foundRow.horaViscera || 'Pendiente';
    } else if (displayName === 'Descarga Cartón' || displayName === 'Carga') {
      exitTime = foundRow.horaDescargaCarton || 'Pendiente';
    } else {
      const parts = [];
      if (foundRow.horaMatanza) parts.push(`Mat: ${foundRow.horaMatanza}`);
      if (foundRow.horaDeshuese) parts.push(`Desh: ${foundRow.horaDeshuese}`);
      exitTime = parts.length > 0 ? parts.join(' | ') : 'Turno cerrado';
    }

    return {
      processName: displayName,
      exitTime: exitTime,
      allTimes: {
        matanza: foundRow.horaMatanza || '-',
        viscera: foundRow.horaViscera || '-',
        deshuese: foundRow.horaDeshuese || '-',
        carton: foundRow.horaDescargaCarton || '-'
      },
      rowObservaciones: foundRow.observaciones || ''
    };
  },

  // --- SINCRONIZACIÓN CON GOOGLE SHEETS ---
  async syncRecordToGoogleSheets(record) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return;

    try {
      const emp = this.getEmployeeById(record.employeeId);
      const payload = {
        action: 'add_overtime',
        id: record.id,
        employeeName: emp ? emp.name : 'Desconocido',
        employeeCode: emp ? emp.code : '',
        area: emp ? emp.area : 'HACCP',
        date: record.date,
        hoursText: record.hoursText,
        decimalHours: record.decimalHours,
        justification: record.justification,
        hadVacation: record.hadVacation ? 'SÍ' : 'NO',
        vacationFrom: record.vacationFrom || '',
        vacationTo: record.vacationTo || '',
        vacationDays: record.vacationDays || 0,
        hasSignature: !!record.signature,
        timestamp: record.createdAt || new Date().toISOString()
      };

      // Se usa mode: 'no-cors' para Apps Script Web App en GitHub Pages
      await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      console.log('✅ Registro sincronizado exitosamente con Google Sheets');
    } catch (err) {
      console.warn('⚠️ No se pudo sincronizar inmediatamente con Google Sheets:', err);
    }
  },

  async syncProcessesToGoogleSheets(periodData) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return;

    try {
      const payload = {
        action: 'save_process_control',
        periodId: periodData.periodId,
        periodTitle: periodData.periodTitle,
        rows: periodData.rows,
        timestamp: new Date().toISOString()
      };

      await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      console.log('✅ Salida de Procesos sincronizada con Google Sheets');
    } catch (err) {
      console.warn('⚠️ Error al sincronizar procesos con Google Sheets:', err);
    }
  },

  // Exportar e Importar Copia de Seguridad completa en archivo JSON
  exportBackupJSON() {
    const data = this.load();
    const config = this.getConfig();
    const fullBackup = { data, config, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_haccp_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackupJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.data) {
        this.save(parsed.data);
      }
      if (parsed.config) {
        this.saveConfig(parsed.config);
      }
      return true;
    } catch (e) {
      console.error('Error importando JSON:', e);
      return false;
    }
  },

  // Restablecer datos de fábrica
  resetToFactory() {
    const initial = this.getInitialData();
    this.save(initial);
    return initial;
  }
};

// Exportar globalmente
window.DB = DB;
window.TimeUtils = TimeUtils;
