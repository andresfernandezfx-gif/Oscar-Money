// ========== OscarMoney - Capa de datos (localStorage) ==========

const STORAGE_KEY = 'oscar_money_data_v2';

const DEFAULT_CATEGORIES = [
  // Gastos (principales)
  { id: 'c1', name: 'Comida', icon: 'utensils', color: '#f97316', type: 'expense', parentId: null },
  { id: 'c1a', name: 'Almuerzo', icon: 'utensils', color: '#f97316', type: 'expense', parentId: 'c1' },
  { id: 'c1b', name: 'Cena', icon: 'utensils', color: '#f97316', type: 'expense', parentId: 'c1' },
  { id: 'c1c', name: 'Desayuno / Merienda', icon: 'coffee', color: '#f97316', type: 'expense', parentId: 'c1' },
  { id: 'c1d', name: 'Supermercado', icon: 'shopping-cart', color: '#f97316', type: 'expense', parentId: 'c1' },
  { id: 'c1e', name: 'Delivery / Restaurante', icon: 'motorcycle', color: '#f97316', type: 'expense', parentId: 'c1' },

  { id: 'c2', name: 'Transporte', icon: 'car', color: '#3b82f6', type: 'expense', parentId: null },
  { id: 'c2a', name: 'Combustible', icon: 'gas-pump', color: '#3b82f6', type: 'expense', parentId: 'c2' },
  { id: 'c2b', name: 'Uber / Taxi', icon: 'taxi', color: '#3b82f6', type: 'expense', parentId: 'c2' },
  { id: 'c2c', name: 'Bus / Pasaje', icon: 'bus', color: '#3b82f6', type: 'expense', parentId: 'c2' },
  { id: 'c2d', name: 'Mantenimiento vehículo', icon: 'wrench', color: '#3b82f6', type: 'expense', parentId: 'c2' },
  { id: 'c2e', name: 'Estacionamiento / Peaje', icon: 'parking', color: '#3b82f6', type: 'expense', parentId: 'c2' },

  { id: 'c3', name: 'Vivienda', icon: 'home', color: '#8b5cf6', type: 'expense', parentId: null },
  { id: 'c3a', name: 'Alquiler', icon: 'key', color: '#8b5cf6', type: 'expense', parentId: 'c3' },
  { id: 'c3b', name: 'Mantenimiento hogar', icon: 'tools', color: '#8b5cf6', type: 'expense', parentId: 'c3' },
  { id: 'c3c', name: 'Muebles / Decoración', icon: 'couch', color: '#8b5cf6', type: 'expense', parentId: 'c3' },

  { id: 'c4', name: 'Ocio', icon: 'gamepad', color: '#ec4899', type: 'expense', parentId: null },
  { id: 'c4a', name: 'Cine / Streaming', icon: 'film', color: '#ec4899', type: 'expense', parentId: 'c4' },
  { id: 'c4b', name: 'Salidas / Bares', icon: 'glass-cheers', color: '#ec4899', type: 'expense', parentId: 'c4' },
  { id: 'c4c', name: 'Hobbies', icon: 'puzzle-piece', color: '#ec4899', type: 'expense', parentId: 'c4' },

  { id: 'c5', name: 'Salud', icon: 'heart', color: '#ef4444', type: 'expense', parentId: null },
  { id: 'c5a', name: 'Farmacia', icon: 'pills', color: '#ef4444', type: 'expense', parentId: 'c5' },
  { id: 'c5b', name: 'Consulta médica', icon: 'user-md', color: '#ef4444', type: 'expense', parentId: 'c5' },
  { id: 'c5c', name: 'Dentista / Otros', icon: 'tooth', color: '#ef4444', type: 'expense', parentId: 'c5' },

  { id: 'c6', name: 'Compras', icon: 'shopping-bag', color: '#22c55e', type: 'expense', parentId: null },
  { id: 'c6a', name: 'Ropa', icon: 'tshirt', color: '#22c55e', type: 'expense', parentId: 'c6' },
  { id: 'c6b', name: 'Electrónica', icon: 'mobile-alt', color: '#22c55e', type: 'expense', parentId: 'c6' },
  { id: 'c6c', name: 'Otros compras', icon: 'shopping-bag', color: '#22c55e', type: 'expense', parentId: 'c6' },

  { id: 'c7', name: 'Suscripciones', icon: 'credit-card', color: '#6366f1', type: 'expense', parentId: null },
  { id: 'c7a', name: 'Streaming', icon: 'play-circle', color: '#6366f1', type: 'expense', parentId: 'c7' },
  { id: 'c7b', name: 'Software / Apps', icon: 'laptop', color: '#6366f1', type: 'expense', parentId: 'c7' },
  { id: 'c7c', name: 'Gimnasio / Club', icon: 'dumbbell', color: '#6366f1', type: 'expense', parentId: 'c7' },

  { id: 'c8', name: 'Servicios', icon: 'bolt', color: '#eab308', type: 'expense', parentId: null },
  { id: 'c8a', name: 'Luz', icon: 'lightbulb', color: '#eab308', type: 'expense', parentId: 'c8' },
  { id: 'c8b', name: 'Agua', icon: 'tint', color: '#eab308', type: 'expense', parentId: 'c8' },
  { id: 'c8c', name: 'Internet / Teléfono', icon: 'wifi', color: '#eab308', type: 'expense', parentId: 'c8' },
  { id: 'c8d', name: 'Gas', icon: 'fire', color: '#eab308', type: 'expense', parentId: 'c8' },

  { id: 'c14', name: 'Pago de deuda', icon: 'hand-holding-usd', color: '#ef4444', type: 'expense', parentId: null },
  { id: 'c15', name: 'Ahorro / Meta', icon: 'piggy-bank', color: '#14b8a6', type: 'expense', parentId: null },
  { id: 'c9', name: 'Otros', icon: 'ellipsis-h', color: '#94a3b8', type: 'expense', parentId: null },

  // Ingresos
  { id: 'c10', name: 'Salario', icon: 'money-bill-wave', color: '#22c55e', type: 'income', parentId: null },
  { id: 'c11', name: 'Freelance', icon: 'laptop', color: '#3b82f6', type: 'income', parentId: null },
  { id: 'c12', name: 'Inversiones', icon: 'chart-line', color: '#8b5cf6', type: 'income', parentId: null },
  { id: 'c13', name: 'Otros ingresos', icon: 'plus-circle', color: '#94a3b8', type: 'income', parentId: null },
];

const DEFAULT_ACCOUNTS = [
  { id: 'a1', name: 'Efectivo', type: 'cash', balance: 0, color: '#22c55e' },
  { id: 'a2', name: 'Tarjeta', type: 'card', balance: 0, color: '#3b82f6' },
];


function ensureCategoriesWithSubs(data) {
  if (!data.categories) data.categories = DEFAULT_CATEGORIES.slice();
  const byId = {};
  data.categories.forEach(c => { byId[c.id] = c; });
  DEFAULT_CATEGORIES.forEach(def => {
    if (!byId[def.id]) {
      data.categories.push({ ...def });
    } else if (byId[def.id].parentId === undefined) {
      byId[def.id].parentId = def.parentId != null ? def.parentId : null;
    }
  });
  return data;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      // Migración: eliminar tarjeta si existe
      if (data.accounts) {
        data.accounts = data.accounts.map(a => {
          if (a.type === 'bank' || a.name === 'Cuenta Bancaria') {
            return { ...a, name: 'Tarjeta', type: 'card' };
          }
          return a;
        });
        const types = data.accounts.map(a => a.type);
        if (!types.includes('cash')) data.accounts.unshift({ id: 'a1', name: 'Efectivo', type: 'cash', balance: 0, color: '#22c55e' });
        if (!types.includes('card') && !types.includes('bank')) {
          data.accounts.push({ id: 'a2', name: 'Tarjeta', type: 'card', balance: 0, color: '#3b82f6' });
        }
      }
      if (!data.settings) data.settings = {};
      if (!Array.isArray(data.recurring)) data.recurring = [];
      if (!Array.isArray(data.templates)) data.templates = [];
      if (data.settings.onboardingDone == null) data.settings.onboardingDone = true;
      if (!data.settings.dash) data.settings.dash = {};
      return ensureCategoriesWithSubs(data);
    } catch (e) {
      console.error('Error loading data', e);
    }
  }
  const data = {
    accounts: DEFAULT_ACCOUNTS,
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    budgets: [],
    goals: [],
    debts: [],
    recurring: [],
    templates: [],
    settings: {
      currency: 'PYG',
      theme: 'light',
      lockEnabled: false,
      pin: '',
      hideBalance: false,
      hideExpenses: false,
      hideIncome: false,
      hideAccounts: false,
      estimatedIncome: 0,
      estimatedIncomeDate: ''
    }
  };
  saveData(data);
  return data;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Formateo de moneda con separador de miles
function formatMoney(amount, currency = null) {
  const data = loadData();
  const code = currency || data.settings.currency || 'PYG';
  const symbols = { PYG: '₲', USD: '$', EUR: '€', BRL: 'R$', ARS: '$', CLP: '$' };
  const symbol = symbols[code] || code + ' ';
  const decimals = code === 'PYG' ? 0 : 2;
  const formatted = Number(amount || 0).toLocaleString('es-PY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return symbol + formatted;
}

// Formatear número mientras se escribe (separador de miles)
function formatNumberInput(value) {
  // Quitar todo lo que no sea dígito
  let num = value.toString().replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('es-PY');
}

// Convertir texto formateado a número (1.500.000 o 1500000)
function parseFormattedNumber(str) {
  if (!str && str !== 0) return 0;
  let s = str.toString().trim();
  if (!s) return 0;
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return 0;
  if (s.indexOf('.') >= 0 && s.indexOf(',') >= 0) {
    // 1.500.000,50
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    // 1.500.000
    s = s.replace(/\./g, '');
  } else if ((s.match(/\./g) || []).length === 1) {
    // Un solo punto: miles (50.000) o decimal (50.5)
    const parts = s.split('.');
    if (parts[1] && parts[1].length === 3) {
      s = parts[0] + parts[1]; // separador de miles
    }
    // si no, dejar como decimal JS
  } else if ((s.match(/,/g) || []).length > 1) {
    s = s.replace(/,/g, '');
  } else if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) {
    const parts = s.split(',');
    if (parts[1] && parts[1].length === 3) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
  }
  return parseFloat(s) || 0;
}

// Montos dichos por voz: 1.500.000, 1500000, "un millon quinientos mil"
function parseSpokenAmount(text) {
  if (!text) return 0;
  const original = text.toString();
  let t = original.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const candidates = [];
  const reNum = /\d{1,3}(?:[.\s]\d{3})+(?:[,.]\d+)?|\d{4,}(?:[,.]\d+)?|\d+/g;
  let m;
  while ((m = reNum.exec(t)) !== null) {
    const raw = m[0].replace(/\s/g, '');
    const val = parseFormattedNumber(raw);
    if (val > 0) candidates.push({ val: val, len: raw.replace(/\D/g, '').length });
  }
  if (candidates.length) {
    candidates.sort(function(a, b) { return b.len - a.len || b.val - a.val; });
    const big = candidates.find(function(c) { return c.len >= 6; });
    if (big) return big.val;
    return Math.max.apply(null, candidates.map(function(c) { return c.val; }));
  }

  const units = {
    cero:0, un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5,
    seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12,
    trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17,
    dieciocho:18, diecinueve:19, veinte:20, treinta:30, cuarenta:40,
    cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90
  };
  const hundreds = {
    cien:100, ciento:100, doscientos:200, trescientos:300, cuatrocientos:400,
    quinientos:500, seiscientos:600, setecientos:700, ochocientos:800, novecientos:900
  };

  function parseUnderThousand(words) {
    var n = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (hundreds[w] != null) n += hundreds[w];
      else if (units[w] != null) n += units[w];
    }
    return n;
  }

  var total = 0;
  if (/millon/.test(t)) {
    var parts = t.split(/millones|millon/);
    var left = (parts[0] || '').trim().split(/\s+/).filter(Boolean);
    var mill = parseUnderThousand(left);
    if (mill === 0) mill = 1;
    total += mill * 1000000;
    t = (parts.slice(1).join(' ') || '').trim();
  }
  if (/\bmil\b/.test(t)) {
    var parts2 = t.split(/\bmil\b/);
    var left2 = (parts2[0] || '').trim().split(/\s+/).filter(Boolean);
    var thousands = parseUnderThousand(left2);
    if (thousands === 0) thousands = 1;
    total += thousands * 1000;
    t = (parts2.slice(1).join(' ') || '').trim();
  }
  total += parseUnderThousand(t.split(/\s+/).filter(Boolean));
  return total > 0 ? total : 0;
}


// Parsear YYYY-MM-DD como fecha LOCAL (evita desfase de 1 día por UTC)
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const s = String(dateStr).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toLocalDateStr(d) {
  const x = d instanceof Date ? d : parseLocalDate(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function isSameMonth(d1, d2) {
  const a = parseLocalDate(d1);
  const b = parseLocalDate(d2);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function monthName(monthIndex) {
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return names[monthIndex];
}

function formatDate(dateStr) {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}
