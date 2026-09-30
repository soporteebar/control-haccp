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

  // Normaliza cadenas de hora a formato estricto hh:mm (ej: "7:8" -> "07:08", "16:25:00" -> "16:25", Date -> "16:25")
  normalizeTimeString(str) {
    if (!str && str !== 0) return '';
    if (str instanceof Date) {
      const h = String(str.getHours()).padStart(2, '0');
      const m = String(str.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    const clean = String(str).trim();
    if (!clean || clean === '-' || clean.toLowerCase() === 'pendiente' || clean.toLowerCase() === 'sin registro') {
      return clean === '-' ? '' : clean;
    }
    // Extraer hh:mm de formatos con segundos o fechas completas
    const match = clean.match(/(\d{1,2}):(\d{1,2})/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2].padStart(2, '0');
      return `${h}:${m}`;
    }
    return clean;
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

  // Configuración del Sistema (Google Sheets & Auto-Refresco)
  getConfig() {
    const globalDefaults = (typeof window !== 'undefined' && window.HACCP_DEFAULT_CONFIG) ? window.HACCP_DEFAULT_CONFIG : {};
    const baseDefaults = {
      googleSheetsUrl: globalDefaults.googleSheetsUrl || '',
      autoRefreshIntervalMs: globalDefaults.autoRefreshIntervalMs || 30000,
      autoSyncEnabled: globalDefaults.autoSyncEnabled !== false,
      companyName: globalDefaults.companyName || 'MATADERO CENTRAL S.A. (MACESA)',
      version: '5.0-live'
    };

    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const userConfig = raw ? JSON.parse(raw) : {};
      return { ...baseDefaults, ...userConfig };
    } catch (e) {
      return baseDefaults;
    }
  },

  saveConfig(config) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      // Notificar al motor de sincronización para ajustar intervalo o URL
      if (this.SyncEngine && typeof this.SyncEngine.startAutoPolling === 'function') {
        this.SyncEngine.startAutoPolling();
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // =========================================================================
  // MOTOR DE SINCRONIZACIÓN EN VIVO (SyncEngine)
  // =========================================================================
  SyncEngine: {
    timerId: null,
    listeners: {
      syncState: [],
      dataUpdated: []
    },
    lastSyncTime: null,
    currentState: 'idle', // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
    _visibilityBound: false,
    _isPolling: false,

    onSyncStateChange(fn) {
      if (typeof fn === 'function') this.listeners.syncState.push(fn);
    },

    onDataUpdated(fn) {
      if (typeof fn === 'function') this.listeners.dataUpdated.push(fn);
    },

    emitSyncState(state, detail = null) {
      this.currentState = state;
      this.listeners.syncState.forEach(fn => {
        try { fn(state, detail); } catch (e) { console.error('Error en listener syncState:', e); }
      });
    },

    emitDataUpdated(summary) {
      this.listeners.dataUpdated.forEach(fn => {
        try { fn(summary); } catch (e) { console.error('Error en listener dataUpdated:', e); }
      });
    },

    computeDataHash(data) {
      if (!data) return '';
      const empPart = (data.employees || []).map(e => `${e.id}:${e.code}:${e.name}:${e.active !== false}`).join('|');
      const recPart = (data.records || []).map(r => `${r.id}:${r.date}:${r.decimalHours}:${r.processExitTime}:${r.processType}`).join('|');
      const procPart = (data.processControls || []).map(p => `${p.periodId}:${(p.rows || []).map(row => `${row.date}:${row.horaMatanza}:${row.horaViscera}:${row.horaDeshuese}:${row.horaDescargaCarton}`).join(';')}`).join('##');
      const usrPart = (data.adminUsers || []).map(u => `${u.id}:${u.username}:${u.role}`).join('|');
      return `${empPart}___${recPart}___${procPart}___${usrPart}`;
    },

    startAutoPolling(customIntervalMs) {
      this.stopAutoPolling();
      const config = DB.getConfig();
      if (!config.googleSheetsUrl || config.autoSyncEnabled === false) {
        this.emitSyncState('idle', { message: 'Sin URL de Google Sheets' });
        return;
      }

      const interval = customIntervalMs || config.autoRefreshIntervalMs || 30000;
      
      // Iniciar escucha del retorno a pestaña web (focus)
      this.bindVisibilityListener();

      this.timerId = setInterval(() => {
        this.pollChanges({ silent: true });
      }, interval);

      console.log(`📡 SyncEngine iniciado: Sondeo cada ${interval / 1000}s`);
    },

    stopAutoPolling() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    },

    bindVisibilityListener() {
      if (typeof window === 'undefined' || this._visibilityBound) return;
      this._visibilityBound = true;

      const triggerImmediatePoll = () => {
        if (document.visibilityState === 'visible') {
          // Si el usuario regresa a la pestaña (por ejemplo, después de editar en Google Sheets)
          this.pollChanges({ immediate: true, silent: false });
        }
      };

      window.addEventListener('focus', triggerImmediatePoll);
      document.addEventListener('visibilitychange', triggerImmediatePoll);
    },

    async pollChanges(options = {}) {
      if (this._isPolling) return;
      const config = DB.getConfig();
      if (!config.googleSheetsUrl) return;

      this._isPolling = true;
      try {
        if (!options.silent) this.emitSyncState('syncing');

        const prevData = DB.load();
        const prevHash = this.computeDataHash(prevData);

        const res = await DB.loadAllFromGoogleSheets({ silent: true });
        if (res && res.success) {
          const newData = DB.load();
          const newHash = this.computeDataHash(newData);
          this.lastSyncTime = new Date();
          this.emitSyncState('synced', { time: this.lastSyncTime });

          if (prevHash !== newHash) {
            console.log('🔄 Cambios detectados en Google Sheets. Notificando vistas...');
            this.emitDataUpdated({
              counts: res.counts,
              source: options.immediate ? 'focus_refresh' : 'polling_refresh',
              timestamp: this.lastSyncTime
            });
          }
        } else {
          this.emitSyncState('error', { error: res ? res.message : 'Error desconocido' });
        }
      } catch (err) {
        this.emitSyncState('error', { error: err.toString() });
      } finally {
        this._isPolling = false;
      }
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

    // Sincronizar automáticamente con Google Sheets
    this.syncAdminUserToGoogleSheets(user);

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

    // Notificar eliminación a Google Sheets
    this.syncAdminUserDeleteToGoogleSheets(id);

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

  // Busca colaborador de forma flexible por Teléfono, Código (ej: EMP-01), ID o Nombre
  findEmployee(query) {
    if (!query) return null;
    const q = String(query).trim();
    if (!q) return null;

    const employees = this.getEmployees();
    const qLower = q.toLowerCase();
    const qClean = qLower.replace(/[^a-z0-9]/g, '');

    // 1. Por ID directo (emp_01, etc.)
    let emp = employees.find(e => e.id && e.id.toLowerCase() === qLower);
    if (emp) return emp;

    // 2. Por Código (EMP-01, emp01, etc.)
    emp = employees.find(e => {
      if (!e.code) return false;
      const cLower = e.code.toLowerCase();
      const cClean = cLower.replace(/[^a-z0-9]/g, '');
      return cLower === qLower || cClean === qClean;
    });
    if (emp) return emp;

    // 3. Por Teléfono (completo o últimos 8 dígitos)
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 4) {
      emp = this.getEmployeeByPhone(q);
      if (emp) return emp;
    }

    // 4. Por Nombre Completo o coincidencia parcial
    emp = employees.find(e => e.name && e.name.toLowerCase() === qLower);
    if (emp) return emp;

    emp = employees.find(e => e.name && e.name.toLowerCase().includes(qLower));
    if (emp) return emp;

    return null;
  },

  // Busca colaborador consultando en memoria local y, si no se encuentra, en Google Sheets en vivo
  async findEmployeeAsync(query) {
    let emp = this.findEmployee(query);
    if (emp) return emp;

    // Si no está localmente, intentar refrescar desde Google Sheets
    const conf = this.getConfig();
    if (conf.googleSheetsUrl) {
      console.log('🔍 Colaborador no encontrado localmente. Consultando directorio en Google Sheets...');
      await this.loadAllFromGoogleSheets({ silent: true });
      emp = this.findEmployee(query);
    }
    return emp;
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

    // Sincronizar automáticamente con Google Sheets
    this.syncEmployeeToGoogleSheets(employee);

    return employee;
  },

  deleteEmployee(id) {
    const data = this.load();
    data.employees = data.employees.filter(e => e.id !== id);
    this.save(data);

    // Notificar eliminación a Google Sheets
    this.syncEmployeeDeleteToGoogleSheets(id);

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

    // Sincronizar eliminación en Google Sheets
    this.syncRecordDeleteToGoogleSheets(id);

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

    // Sincronizar eliminación en Google Sheets
    this.syncProcessDeleteToGoogleSheets(periodId);

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
      exitTime = foundRow.horaMatanza ? TimeUtils.normalizeTimeString(foundRow.horaMatanza) : 'Pendiente';
    } else if (displayName === 'Deshuese') {
      exitTime = foundRow.horaDeshuese ? TimeUtils.normalizeTimeString(foundRow.horaDeshuese) : 'Pendiente';
    } else if (displayName === 'Vísceras') {
      exitTime = foundRow.horaViscera ? TimeUtils.normalizeTimeString(foundRow.horaViscera) : 'Pendiente';
    } else if (displayName === 'Descarga Cartón' || displayName === 'Carga') {
      exitTime = foundRow.horaDescargaCarton ? TimeUtils.normalizeTimeString(foundRow.horaDescargaCarton) : 'Pendiente';
    } else {
      const parts = [];
      if (foundRow.horaMatanza) parts.push(`Mat: ${TimeUtils.normalizeTimeString(foundRow.horaMatanza)}`);
      if (foundRow.horaDeshuese) parts.push(`Desh: ${TimeUtils.normalizeTimeString(foundRow.horaDeshuese)}`);
      exitTime = parts.length > 0 ? parts.join(' | ') : 'Turno cerrado';
    }

    return {
      processName: displayName,
      exitTime: exitTime,
      allTimes: {
        matanza: TimeUtils.normalizeTimeString(foundRow.horaMatanza) || '-',
        viscera: TimeUtils.normalizeTimeString(foundRow.horaViscera) || '-',
        deshuese: TimeUtils.normalizeTimeString(foundRow.horaDeshuese) || '-',
        carton: TimeUtils.normalizeTimeString(foundRow.horaDescargaCarton) || '-'
      },
      rowObservaciones: foundRow.observaciones || ''
    };
  },

  // --- SINCRONIZACIÓN CON GOOGLE SHEETS ---

  // Obtener enlace web móvil del empleado
  getEmployeeWebUrl(emp) {
    if (typeof window === 'undefined' || !window.location) return '';
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/empleado\.html$/, '').replace(/\/$/, '');
    return `${origin}${path}/empleado.html?emp=${encodeURIComponent(emp.id)}`;
  },

  // Obtener enlace preformateado para enviar por WhatsApp
  getEmployeeWhatsAppUrl(emp) {
    const webUrl = this.getEmployeeWebUrl(emp);
    const cleanPhone = (emp.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(`Hola ${emp.name}, por favor ingresa a este enlace para registrar tus horas extras diarias del equipo HACCP:\n${webUrl}\n(Tu teléfono registrado: ${emp.phone || 'N/A'})`);
    return cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
  },

  // Sincronizar un colaborador individual a la hoja "Empleados_Enlaces"
  async syncEmployeeToGoogleSheets(employee) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true, message: 'URL no configurada' };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const webUrl = this.getEmployeeWebUrl(employee);
      const whatsappUrl = this.getEmployeeWhatsAppUrl(employee);

      const payload = {
        action: 'save_employee',
        id: employee.id,
        code: employee.code || '',
        name: employee.name || '',
        area: employee.area || 'Equipo HACCP',
        role: employee.role || 'Inspector de Calidad',
        phone: employee.phone || '',
        webUrl,
        whatsappUrl,
        active: employee.active !== false && employee.active !== 'INACTIVO' ? 'ACTIVO' : 'INACTIVO',
        timestamp: new Date().toISOString()
      };

      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('✅ Empleado y enlace WhatsApp sincronizados con Google Sheets:', employee.name);
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ No se pudo sincronizar empleado inmediatamente:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Marcar empleado inactivo en Google Sheets al eliminarlo
  async syncEmployeeDeleteToGoogleSheets(employeeId) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_employee',
          id: employeeId,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ Error notificando eliminación a Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Sincronizar todo el directorio de colaboradores y enlaces para WhatsApp
  async syncAllEmployeesToGoogleSheets() {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) {
      return { success: false, message: 'URL de Google Sheets no configurada. Ingresa la URL en la pestaña de Configuración.' };
    }

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const employees = this.getEmployees();
      const list = employees.map(emp => ({
        id: emp.id,
        code: emp.code || '',
        name: emp.name || '',
        area: emp.area || 'Equipo HACCP',
        role: emp.role || 'Inspector de Calidad',
        phone: emp.phone || '',
        webUrl: this.getEmployeeWebUrl(emp),
        whatsappUrl: this.getEmployeeWhatsAppUrl(emp),
        active: emp.active !== false && emp.active !== 'INACTIVO' ? 'ACTIVO' : 'INACTIVO'
      }));

      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_all_employees',
          employees: list,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, count: list.length, data };
    } catch (err) {
      console.error('Error sincronizando empleados con Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Sincronizar registro de horas extras a la hoja "HorasExtras_HACCP"
  async syncRecordToGoogleSheets(record) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const emp = this.getEmployeeById(record.employeeId);
      const exitInfo = this.getProcessExitInfo(record.date, record.processType, record.justification);

      const payload = {
        action: 'add_overtime',
        id: record.id,
        employeeName: emp ? emp.name : 'Desconocido',
        employeeCode: emp ? emp.code : '',
        area: emp ? emp.area : 'HACCP',
        processType: exitInfo.processName || record.processType || 'General',
        processExitTime: exitInfo.exitTime || '-',
        date: record.date,
        hoursText: record.hoursText,
        decimalHours: record.decimalHours,
        justification: record.justification,
        hadVacation: record.hadVacation ? 'SÍ' : 'NO',
        vacationFrom: record.vacationFrom || '',
        vacationTo: record.vacationTo || '',
        vacationDays: record.vacationDays || 0,
        hasSignature: !!record.signature,
        timestamp: record.createdAt || new Date().toISOString(),
        employeeId: record.employeeId || ''
      };

      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('✅ Registro sincronizado exitosamente con Google Sheets:', record.id);
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ No se pudo sincronizar inmediatamente con Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Eliminar registro de horas extras en Google Sheets
  async syncRecordDeleteToGoogleSheets(recordId) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_record',
          id: recordId,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('🗑️ Registro de horas eliminado de Google Sheets:', recordId);
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ Error al eliminar registro de Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Sincronizar control de procesos a la hoja "SalidaProcesos"
  async syncProcessesToGoogleSheets(periodData) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const payload = {
        action: 'save_process_control',
        periodId: periodData.periodId,
        periodTitle: periodData.periodTitle,
        rows: periodData.rows,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('✅ Salida de Procesos sincronizada con Google Sheets');
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ Error al sincronizar procesos con Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Eliminar período de salida de procesos en Google Sheets
  async syncProcessDeleteToGoogleSheets(periodId) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_process_period',
          periodId: periodId,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('🗑️ Período de procesos eliminado de Google Sheets:', periodId);
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ Error al eliminar período de Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Sincronizar usuario del panel a la hoja "Usuarios_Panel"
  async syncAdminUserToGoogleSheets(user) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const payload = {
        action: 'save_admin_user',
        id: user.id,
        username: user.username,
        password: user.password || '',
        name: user.name || user.username,
        role: user.role || 'visor',
        createdAt: user.createdAt || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      };

      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('✅ Usuario del panel sincronizado con Google Sheets:', user.username);
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ Error al sincronizar usuario con Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // Eliminar usuario del panel en Google Sheets
  async syncAdminUserDeleteToGoogleSheets(userId) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) return { success: false, offline: true };

    try {
      if (this.SyncEngine) this.SyncEngine.emitSyncState('syncing');
      const res = await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_admin_user',
          id: userId,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json().catch(() => ({ status: 'success' }));
      console.log('🗑️ Usuario del panel eliminado de Google Sheets:', userId);
      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
        this.SyncEngine.emitSyncState('synced', { time: this.SyncEngine.lastSyncTime });
      }
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ Error al eliminar usuario de Google Sheets:', err);
      if (this.SyncEngine) this.SyncEngine.emitSyncState('error', { error: err.toString() });
      return { success: false, error: err.toString() };
    }
  },

  // CRUD Asíncrono con confirmación en Google Sheets
  async saveEmployeeAsync(employee) {
    const emp = this.saveEmployee(employee);
    const syncRes = await this.syncEmployeeToGoogleSheets(emp);
    return { ...emp, cloudSynced: syncRes.success };
  },

  async deleteEmployeeAsync(id) {
    const deleted = this.deleteEmployee(id);
    const syncRes = await this.syncEmployeeDeleteToGoogleSheets(id);
    return { success: deleted, cloudSynced: syncRes.success };
  },

  async saveRecordAsync(record) {
    const rec = this.saveRecord(record);
    const syncRes = await this.syncRecordToGoogleSheets(rec);
    return { ...rec, cloudSynced: syncRes.success };
  },

  async deleteRecordAsync(id) {
    const deleted = this.deleteRecord(id);
    const syncRes = await this.syncRecordDeleteToGoogleSheets(id);
    return { success: deleted, cloudSynced: syncRes.success };
  },

  async saveProcessControlAsync(periodData) {
    const p = this.saveProcessControl(periodData);
    const syncRes = await this.syncProcessesToGoogleSheets(p);
    return { ...p, cloudSynced: syncRes.success };
  },

  async deleteProcessControlAsync(periodId) {
    const deleted = this.deleteProcessControl(periodId);
    const syncRes = await this.syncProcessDeleteToGoogleSheets(periodId);
    return { success: deleted, cloudSynced: syncRes.success };
  },

  async saveAdminUserAsync(user) {
    const u = this.saveAdminUser(user);
    const syncRes = await this.syncAdminUserToGoogleSheets(u);
    return { ...u, cloudSynced: syncRes.success };
  },

  async deleteAdminUserAsync(id) {
    const deleted = this.deleteAdminUser(id);
    const syncRes = await this.syncAdminUserDeleteToGoogleSheets(id);
    return { success: deleted, cloudSynced: syncRes.success };
  },

  // Sincronizar masivamente TODO el sistema a Google Sheets (Empleados, Procesos, Horas y Usuarios)
  async syncAllDataToGoogleSheets() {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) {
      return { success: false, message: 'URL de Google Sheets no configurada.' };
    }

    try {
      const employees = this.getEmployees().map(emp => ({
        id: emp.id,
        code: emp.code || '',
        name: emp.name || '',
        area: emp.area || 'Equipo HACCP',
        role: emp.role || 'Inspector de Calidad',
        phone: emp.phone || '',
        webUrl: this.getEmployeeWebUrl(emp),
        whatsappUrl: this.getEmployeeWhatsAppUrl(emp),
        active: emp.active !== false ? 'ACTIVO' : 'INACTIVO'
      }));

      const processControls = this.getProcessControls();
      const records = this.getRecords().map(r => {
        const emp = this.getEmployeeById(r.employeeId);
        const exitInfo = this.getProcessExitInfo(r.date, r.processType, r.justification);
        return {
          id: r.id,
          employeeId: r.employeeId,
          date: r.date,
          employeeName: emp ? emp.name : 'Desconocido',
          employeeCode: emp ? emp.code : '',
          area: emp ? emp.area : 'HACCP',
          processType: exitInfo.processName || r.processType || 'General',
          processExitTime: exitInfo.exitTime || '-',
          hoursText: r.hoursText,
          decimalHours: r.decimalHours,
          justification: r.justification,
          hadVacation: r.hadVacation ? 'SÍ' : 'NO',
          vacationFrom: r.vacationFrom || '',
          vacationTo: r.vacationTo || '',
          vacationDays: r.vacationDays || 0,
          hasSignature: !!r.signature,
          timestamp: r.createdAt || new Date().toISOString()
        };
      });

      const adminUsers = this.getAdminUsers();

      await fetch(config.googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_all_data',
          employees,
          processControls,
          records,
          adminUsers,
          timestamp: new Date().toISOString()
        })
      });

      return {
        success: true,
        empCount: employees.length,
        procCount: processControls.length,
        recCount: records.length,
        usrCount: adminUsers.length
      };
    } catch (err) {
      console.error('Error en sincronización masiva a Google Sheets:', err);
      return { success: false, error: err.toString() };
    }
  },

  // LEER / OBTENER TODOS LOS DATOS DESDE GOOGLE SHEETS (Read / Pull - Fuente de Verdad)
  async loadAllFromGoogleSheets(options = {}) {
    const config = this.getConfig();
    if (!config.googleSheetsUrl) {
      return { success: false, message: 'URL de Google Sheets no configurada. Ingrésala en la Pestaña de Configuración.' };
    }

    try {
      let result = null;
      // Intento 1: POST con action: 'get_all_data' (evita caching agresivo de navegadores)
      try {
        const res = await fetch(config.googleSheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'get_all_data', timestamp: new Date().toISOString() })
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch (postErr) {
        console.warn('POST read falló, intentando vía GET con query parameter...', postErr);
      }

      // Intento 2: GET fallback
      if (!result || !result.status) {
        const getUrl = config.googleSheetsUrl + (config.googleSheetsUrl.includes('?') ? '&' : '?') + 'action=get_all_data&_t=' + Date.now();
        const resGet = await fetch(getUrl);
        result = await resGet.json();
      }

      if (!result || result.status !== 'success') {
        return { success: false, message: result && result.error ? result.error : 'No se pudo obtener respuesta válida de Google Sheets' };
      }

      const localData = this.load();

      // 1. Empleados: Reemplazo directo desde Google Sheets
      let empCount = 0;
      if (Array.isArray(result.employees)) {
        localData.employees = result.employees;
        empCount = result.employees.length;
      }

      // 2. Horas Extras: Reemplazo directo preservando imágenes de firmas dibujadas localmente
      let recCount = 0;
      if (Array.isArray(result.records)) {
        const currentRecords = localData.records || [];
        const sigMap = {};
        currentRecords.forEach(r => {
          if (r.signature && typeof r.signature === 'string' && r.signature.startsWith('data:image')) {
            sigMap[r.id] = r.signature;
          }
        });

        localData.records = result.records.map(sheetRec => {
          if (!sheetRec.employeeId && sheetRec.employeeCode) {
            const foundEmp = (localData.employees || []).find(e => e.code === sheetRec.employeeCode || e.name === sheetRec.employeeName);
            if (foundEmp) sheetRec.employeeId = foundEmp.id;
          }
          return {
            ...sheetRec,
            signature: sigMap[sheetRec.id] || (sheetRec.signature && sheetRec.signature.startsWith('data:image') ? sheetRec.signature : null)
          };
        });

        localData.records.sort((a, b) => (a.date > b.date ? 1 : -1));
        recCount = localData.records.length;
      }

      // 3. Salida de Procesos: Reemplazo directo desde Google Sheets
      let procCount = 0;
      if (Array.isArray(result.processControls)) {
        localData.processControls = result.processControls.map(p => ({
          ...p,
          rows: (p.rows || []).map(r => ({
            ...r,
            horaMatanza: TimeUtils.normalizeTimeString(r.horaMatanza),
            horaViscera: TimeUtils.normalizeTimeString(r.horaViscera),
            horaDeshuese: TimeUtils.normalizeTimeString(r.horaDeshuese),
            horaDescargaCarton: TimeUtils.normalizeTimeString(r.horaDescargaCarton)
          }))
        }));
        procCount = localData.processControls.length;
      }

      // 4. Usuarios del Panel: Reemplazo directo desde Google Sheets
      let usrCount = 0;
      if (Array.isArray(result.adminUsers) && result.adminUsers.length > 0) {
        localData.adminUsers = result.adminUsers;
        usrCount = result.adminUsers.length;
      }

      // Guardar base de datos actualizada en LocalStorage
      this.save(localData);

      if (this.SyncEngine) {
        this.SyncEngine.lastSyncTime = new Date();
      }

      return {
        success: true,
        counts: {
          employees: empCount,
          records: recCount,
          processControls: procCount,
          adminUsers: usrCount
        }
      };

    } catch (err) {
      console.error('Error al cargar datos desde Google Sheets:', err);
      return { success: false, error: err.toString() };
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
  },

  // Inicialización de la capa de datos y motor en vivo
  init() {
    if (this.SyncEngine && typeof this.SyncEngine.startAutoPolling === 'function') {
      this.SyncEngine.startAutoPolling();
    }
  }
};

// Exportar globalmente
window.DB = DB;
window.TimeUtils = TimeUtils;
