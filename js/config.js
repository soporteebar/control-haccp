/**
 * config.js - Configuración Centralizada del Sistema HACCP MACESA
 * 
 * Permite definir la URL del Web App de Google Apps Script para que funcione
 * automáticamente en GitHub Pages tanto en computadoras de escritorio como en
 * teléfonos móviles de los colaboradores (sin requerir configuración individual por teléfono).
 */

window.HACCP_DEFAULT_CONFIG = {
  // Pega aquí la URL de tu Web App de Google Apps Script (termina en /exec)
  // Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
  googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbxkef4ivfLzZHhC770571dBeo87F5MNKp0QjnQPG7rMULMjf2yWehg-gLHzTd03MXKD/exec',

  // Intervalo de auto-refresco y sondeo inteligente en vivo (en milisegundos)
  // 30000 = 30 segundos | 60000 = 1 minuto
  autoRefreshIntervalMs: 30000,

  // Activar auto-refresco automático por defecto
  autoSyncEnabled: true,

  // Nombre oficial de la empresa
  companyName: 'MATADERO CENTRAL S.A. (MACESA)',

  // Versión del conector
  version: '5.0-live'
};
