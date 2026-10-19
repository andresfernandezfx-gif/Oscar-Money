// ========== OscarMoney - Lógica principal (v2) ==========

let data = loadData();
let currentPage = 'dashboard';

let isUnlocked = false;
let currentPin = '';

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  setupNavigation();
  setupModal();
  setupLockScreen();
  setupProfessionalFeatures();
    
  data = loadData();
  if (data.settings.lockEnabled && data.settings.pin) {
    showLockScreen();
  } else {
    isUnlocked = true;
    render();
  }
});

// ========== LOCK SCREEN ==========
function setupLockScreen() {
  document.querySelectorAll('.pin-btn[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentPin.length >= 4) return;
      currentPin += btn.dataset.num;
      updatePinDots();
      if (currentPin.length === 4) {
        setTimeout(checkPin, 150);
      }
    });
  });
  
  document.getElementById('btn-del')?.addEventListener('click', () => {
    currentPin = currentPin.slice(0, -1);
    updatePinDots();
    document.getElementById('lock-error').classList.add('hidden');
  });
  
  document.getElementById('btn-bio')?.addEventListener('click', tryBiometric);
}

function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < currentPin.length);
  });
}

function checkPin() {
  data = loadData();
  if (currentPin === data.settings.pin) {
    unlockApp();
  } else {
    document.getElementById('lock-error').classList.remove('hidden');
    currentPin = '';
    updatePinDots();
    // Shake effect
    const display = document.getElementById('pin-display');
    display.style.animation = 'none';
    setTimeout(() => { display.style.animation = 'shake 0.4s'; }, 10);
  }
}

function unlockApp() {
  isUnlocked = true;
  currentPin = '';
  document.getElementById('lock-screen').classList.add('hidden');
  document.body.classList.remove('locked');
  document.getElementById('modal')?.classList.add('hidden');
  render();
}

function showLockScreen() {
  isUnlocked = false;
  currentPin = '';
  updatePinDots();
  document.getElementById('lock-error').classList.add('hidden');
  document.getElementById('lock-screen').classList.remove('hidden');
  document.body.classList.add('locked');
  document.getElementById('modal')?.classList.add('hidden');
}

async function tryBiometric() {
  // On iOS Safari, WebAuthn can trigger Face ID / Touch ID if previously registered
  // For simplicity we show a message and allow PIN. Full WebAuthn needs server.
  // We simulate by checking if PublicKeyCredential is available
  if (!window.PublicKeyCredential) {
    showToast('Biometría no disponible. Usa el código.');
    return;
  }
  try {
    // Simple check - real implementation would use credentials.get()
    // For PWA without server we use a local approach
    showToast('Usa tu código PIN (Face ID requiere configuración extra)');
  } catch (e) {
    showToast('Usa el código PIN');
  }
}

function openLockSettings() {
  data = loadData();
  const enabled = data.settings.lockEnabled;
  openModal('Bloqueo de app', `
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="checkbox" id="lock-toggle" ${enabled ? 'checked' : ''} style="width:20px;height:20px" />
        Activar bloqueo con código
      </label>
    </div>
    <div id="pin-setup" style="${enabled ? '' : 'display:none'}">
      <div class="form-group">
        <label>Código de 4 dígitos</label>
        <input type="password" id="new-pin" class="form-control" maxlength="4" inputmode="numeric" placeholder="••••" pattern="[0-9]*" />
      </div>
      <div class="form-group">
        <label>Confirmar código</label>
        <input type="password" id="confirm-pin" class="form-control" maxlength="4" inputmode="numeric" placeholder="••••" pattern="[0-9]*" />
      </div>
    </div>
    <button class="btn btn-primary" onclick="saveLockSettings()">Guardar</button>
  `);
  
  document.getElementById('lock-toggle')?.addEventListener('change', (e) => {
    document.getElementById('pin-setup').style.display = e.target.checked ? '' : 'none';
  });
}

function saveLockSettings() {
  const enabled = document.getElementById('lock-toggle').checked;
  if (enabled) {
    const pin = document.getElementById('new-pin').value;
    const confirm = document.getElementById('confirm-pin').value;
    if (!/^[0-9]{4}$/.test(pin)) {
      showToast('El código debe ser de 4 dígitos');
      return;
    }
    if (pin !== confirm) {
      showToast('Los códigos no coinciden');
      return;
    }
    data.settings.pin = pin;
    data.settings.lockEnabled = true;
  } else {
    data.settings.lockEnabled = false;
    data.settings.pin = '';
  }
  saveData(data);
  closeModal();
  showToast(enabled ? 'Bloqueo activado' : 'Bloqueo desactivado');
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', data.settings.theme || 'light');
  const icon = document.querySelector('#btn-theme i');
  if (icon) icon.className = data.settings.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

document.getElementById('btn-theme')?.addEventListener('click', () => {
  data.settings.theme = data.settings.theme === 'dark' ? 'light' : 'dark';
  saveData(data);
  applyTheme();
});

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === 'add') {
        openAddTransaction();
        return;
      }
      currentPage = page;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
}

function setTitle(title) {
  document.getElementById('page-title').textContent = title;
}

function render() {
  data = loadData();
  const main = document.getElementById('main-content');
  switch (currentPage) {
    case 'dashboard': renderDashboard(main); break;
    case 'transactions': renderTransactions(main); break;
    case 'budgets': renderBudgets(main); break;
    case 'more': renderMore(main); break;
    default: renderDashboard(main);
  }
}

// ========== DASHBOARD ==========
function renderDashboard(el) {
  setTitle('OscarMoney');
  if (!data.settings) data.settings = {};
  if (!data.settings.dash) data.settings.dash = {};
  const dash = data.settings.dash;
  const now = new Date();
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  const monthTx = data.transactions.filter(t => isSameMonth(t.date, now));
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const recent = [...data.transactions].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date)).slice(0, 5);
  const activeGoals = data.goals.filter(g => g.current < g.target);
  const activeDebts = data.debts.filter(d => d.paid < d.total);
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthBudgets = data.budgets.filter(b => b.month === month && b.year === year);
  const recurringList = (data.recurring || []).filter(r => r.active !== false).slice(0, 5);
  const prev = getMonthTotals(-1);
  const expDiff = expense - prev.expense;
  const incDiff = income - prev.income;

  const blur = (key) => dash[key] ? 'hidden-balance' : '';
  const eyeIcon = (key) => dash[key] ? 'fa-eye-slash' : 'fa-eye';

  // Alertas
  let alerts = [];
  monthBudgets.forEach(b => {
    const spent = budgetSpent(b, now);
    if (b.amount > 0 && spent >= b.amount) {
      const cat = data.categories.find(c => c.id === b.categoryId);
      alerts.push('Presupuesto de ' + (cat?.name || 'categoría') + ' excedido');
    } else if (b.amount > 0 && spent / b.amount >= 0.8) {
      const cat = data.categories.find(c => c.id === b.categoryId);
      alerts.push((cat?.name || 'Categoría') + ' al ' + Math.round(spent / b.amount * 100) + '% del presupuesto');
    }
  });
  activeDebts.filter(d => d.fecha).forEach(d => {
    const diff = (parseLocalDate(d.fecha) - now) / 86400000;
    if (diff >= 0 && diff <= 7) alerts.push('Cuota de ' + d.name + ' vence ' + formatDate(d.fecha));
  });

  el.innerHTML = `
    <div class="card" style="text-align:center">
      <div class="card-title" style="display:flex;justify-content:center;align-items:center;gap:8px">
        Balance total
        <button class="icon-btn" style="width:28px;height:28px;font-size:0.9rem" onclick="toggleHideBalance()">
          <i class="fas ${data.settings.hideBalance ? 'fa-eye-slash' : 'fa-eye'}"></i>
        </button>
      </div>
      <div class="balance ${totalBalance >= 0 ? 'positive' : 'negative'} ${data.settings.hideBalance ? 'hidden-balance' : ''}">${formatMoney(totalBalance)}</div>
    </div>

    <div class="grid-2">
      <div class="stat-card income">
        <div class="label" style="display:flex;align-items:center;justify-content:center;gap:6px">
          <span><i class="fas fa-arrow-down"></i> Ingresos</span>
          <button class="icon-btn" style="width:24px;height:24px;font-size:0.75rem;padding:0" onclick="event.stopPropagation();toggleHideIncome()">
            <i class="fas ${data.settings.hideIncome ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </button>
        </div>
        <div class="value ${data.settings.hideIncome ? 'hidden-balance' : ''}">${formatMoney(income)}</div>
      </div>
      <div class="stat-card expense">
        <div class="label" style="display:flex;align-items:center;justify-content:center;gap:6px">
          <span><i class="fas fa-arrow-up"></i> Gastos</span>
          <button class="icon-btn" style="width:24px;height:24px;font-size:0.75rem;padding:0" onclick="event.stopPropagation();toggleHideExpenses()">
            <i class="fas ${data.settings.hideExpenses ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </button>
        </div>
        <div class="value ${data.settings.hideExpenses ? 'hidden-balance' : ''}">${formatMoney(expense)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>vs ${prev.label}</span>
        <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideVs')">
          <i class="fas ${eyeIcon('hideVs')}"></i>
        </button>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-top:6px">
        <span>Ingresos</span>
        <span class="${blur('hideVs')}" style="color:${incDiff>=0?'var(--success)':'var(--danger)'}">${incDiff>=0?'+':''}${formatMoney(incDiff)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-top:4px">
        <span>Gastos</span>
        <span class="${blur('hideVs')}" style="color:${expDiff>0?'var(--danger)':'var(--success)'}">${expDiff>=0?'+':''}${formatMoney(expDiff)}</span>
      </div>
    </div>

    ${alerts.length ? `
    <div class="card" style="border-left:4px solid var(--warning)">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Alertas</span>
        <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideAlerts')">
          <i class="fas ${eyeIcon('hideAlerts')}"></i>
        </button>
      </div>
      <div class="${blur('hideAlerts')}">
        ${alerts.slice(0,4).map(a => `<div style="font-size:0.85rem;margin-top:6px">⚠️ ${a}</div>`).join('')}
      </div>
    </div>
    ` : ''}

    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>Mis cuentas</span>
      <button class="icon-btn" style="width:28px;height:28px;font-size:0.85rem" onclick="toggleHideAccounts()">
        <i class="fas ${data.settings.hideAccounts ? 'fa-eye-slash' : 'fa-eye'}"></i>
      </button>
    </div>
    <div class="accounts-scroll">
      ${data.accounts.map(a => `
        <div class="account-chip">
          <div class="name">${a.name}</div>
          <div class="balance ${data.settings.hideAccounts ? 'hidden-balance' : ''}">${formatMoney(a.balance)}</div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="cursor:pointer" onclick="renderCashFlow()">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600">Flujo de caja</div>
          <div style="font-size:0.8rem;color:var(--text-secondary)">Ver proyección de saldo</div>
        </div>
        <i class="fas fa-chevron-right" style="color:var(--text-secondary)"></i>
      </div>
    </div>

    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>Presupuestos del mes</span>
      <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideBudgets')">
        <i class="fas ${eyeIcon('hideBudgets')}"></i>
      </button>
    </div>
    ${monthBudgets.length > 0 ? monthBudgets.slice(0, 4).map(b => {
      const cat = data.categories.find(c => c.id === b.categoryId) || { name: '?', icon: 'circle', color: '#94a3b8' };
      const spent = budgetSpent(b, now);
      const pct = b.amount > 0 ? Math.min(spent / b.amount, 1) : 0;
      const exceeded = spent > b.amount;
      return `
        <div class="card" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="item-icon" style="background:${cat.color}22;color:${cat.color};width:32px;height:32px;font-size:0.9rem">
                <i class="fas fa-${cat.icon}"></i>
              </div>
              <strong>${cat.name}</strong>
            </div>
            ${exceeded ? '<span style="color:var(--danger);font-size:0.75rem;font-weight:700">¡Excedido!</span>' : `<span class="${blur('hideBudgets')}" style="font-size:0.8rem;color:var(--text-secondary)">${Math.round(pct*100)}%</span>`}
          </div>
          <div class="progress-bar ${blur('hideBudgets')}">
            <div class="progress-fill" style="width:${pct*100}%;background:${exceeded ? 'var(--danger)' : cat.color}"></div>
          </div>
          <div class="${blur('hideBudgets')}" style="font-size:0.8rem;color:var(--text-secondary);display:flex;justify-content:space-between;margin-top:4px">
            <span>${formatMoney(spent)} gastado${b.deadline ? ' · vence ' + formatDate(b.deadline) : ''}${b.note ? ' · ' + b.note : ''}</span>
            <span>${formatMoney(b.amount)} límite</span>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="card" style="cursor:pointer" onclick="currentPage='budgets';document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));document.querySelector('[data-page=budgets]')?.classList.add('active');render()">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Sin presupuestos. Tocá para crear uno.</div>
      </div>
    `}

    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>Recurrentes</span>
      <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideRecurring')">
        <i class="fas ${eyeIcon('hideRecurring')}"></i>
      </button>
    </div>
    ${recurringList.length > 0 ? `
      <div class="card">
        ${recurringList.map(r => {
          const cat = data.categories.find(c => c.id === r.categoryId);
          return `
            <div class="list-item" style="cursor:default">
              <div class="item-info">
                <div class="name">${r.name || cat?.name || 'Recurrente'}</div>
                <div class="sub">${r.frequency === 'weekly' ? 'Semanal' : r.frequency === 'yearly' ? 'Anual' : 'Mensual'} · Próximo ${r.nextDate ? formatDate(r.nextDate) : '—'}</div>
              </div>
              <div class="item-amount ${r.type} ${blur('hideRecurring')}">${r.type === 'income' ? '+' : '-'}${formatMoney(r.amount)}</div>
            </div>
          `;
        }).join('')}
        <button class="chip" style="margin-top:8px" onclick="openRecurringPage()">Ver todos</button>
      </div>
    ` : `
      <div class="card">
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">Salario, alquiler, suscripciones...</div>
        <button class="chip" onclick="openRecurringPage()">Configurar recurrentes</button>
      </div>
    `}

    ${activeGoals.length > 0 ? `
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>Metas de ahorro</span>
        <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideGoals')">
          <i class="fas ${eyeIcon('hideGoals')}"></i>
        </button>
      </div>
      ${activeGoals.slice(0, 3).map(g => {
        const pct = g.target > 0 ? Math.min(g.current / g.target, 1) : 0;
        return `
          <div class="card" style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${g.name}</strong>
              <span class="${blur('hideGoals')}" style="color:var(--primary);font-weight:700">${Math.round(pct*100)}%</span>
            </div>
            <div class="progress-bar ${blur('hideGoals')}">
              <div class="progress-fill" style="width:${pct*100}%;background:#14b8a6"></div>
            </div>
            <div class="${blur('hideGoals')}" style="font-size:0.8rem;color:var(--text-secondary);display:flex;justify-content:space-between;margin-top:4px">
              <span>${formatMoney(g.current)} / ${formatMoney(g.target)}${g.deadline ? ' · límite ' + formatDate(g.deadline) : ''}</span>
              <button class="chip" style="padding:4px 10px;font-size:0.75rem" onclick="openContributeGoal('${g.id}')">Aportar</button>
            </div>
          </div>
        `;
      }).join('')}
    ` : ''}

    ${activeDebts.length > 0 ? `
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>Deudas pendientes</span>
        <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideDebts')">
          <i class="fas ${eyeIcon('hideDebts')}"></i>
        </button>
      </div>
      ${activeDebts.slice(0, 3).map(d => {
        const pct = d.total > 0 ? Math.min(d.paid / d.total, 1) : 0;
        return `
          <div class="card" style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${d.name}</strong>
              <span class="${blur('hideDebts')}" style="font-weight:700">${Math.round(pct*100)}%</span>
            </div>
            <div class="progress-bar ${blur('hideDebts')}">
              <div class="progress-fill" style="width:${pct*100}%;background:var(--danger)"></div>
            </div>
            <div class="${blur('hideDebts')}" style="font-size:0.8rem;color:var(--text-secondary);display:flex;justify-content:space-between;margin-top:4px">
              <span>${(d.cuotas ? (d.cuotasPagadas||0) + '/' + d.cuotas + ' cuotas · ' : '')}Resta ${formatMoney(d.total - d.paid)}${d.fecha ? ' · vence ' + formatDate(d.fecha) : ''}</span>
              <button class="chip" style="padding:4px 10px;font-size:0.75rem" onclick="openPayDebt('${d.id}')">Pagar</button>
            </div>
          </div>
        `;
      }).join('')}
    ` : ''}

    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>Últimos movimientos</span>
      <button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem" onclick="toggleDashSection('hideRecent')">
        <i class="fas ${eyeIcon('hideRecent')}"></i>
      </button>
    </div>
    <div class="card">
      ${recent.length === 0 ? `
        <div class="empty-state"><i class="fas fa-inbox"></i><p>Sin movimientos todavía</p>
          <button class="btn btn-primary" style="margin-top:10px" onclick="openAddTransaction()">Cargar movimiento</button>
        </div>
      ` : recent.map(t => {
        const cat = categoryDisplay(t.categoryId);
        const sign = t.type === 'income' ? '+' : '-';
        return `
          <div class="list-item" onclick="openEditTransaction('${t.id}')">
            <div class="item-icon" style="background:${cat.color}22;color:${cat.color}">
              <i class="fas fa-${cat.icon}"></i>
            </div>
            <div class="item-info">
              <div class="name">${cat.name}</div>
              <div class="sub">${t.note || formatDate(t.date)}</div>
            </div>
            <div class="item-amount ${t.type} ${blur('hideRecent')}">
              ${sign}${formatMoney(t.amount)}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function transactionRow(t) {
  const cat = categoryDisplay(t.categoryId);
  const sign = t.type === 'income' ? '+' : '-';
  return `
    <div class="list-item" onclick="openEditTransaction('${t.id}')">
      <div class="item-icon" style="background:${cat.color}22;color:${cat.color}">
        <i class="fas fa-${cat.icon}"></i>
      </div>
      <div class="item-info">
        <div class="name">${cat.name}</div>
        <div class="sub">${t.note || formatDate(t.date)}</div>
      </div>
      <div class="item-amount ${t.type}">
        ${sign}${formatMoney(t.amount)}
      </div>
    </div>
  `;
}

// ========== TRANSACTIONS + CHART ==========
function renderTransactions(el) {
  setTitle('Movimientos');
  const now = new Date();
  const monthTx = data.transactions.filter(t => isSameMonth(t.date, now));
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const sorted = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  const expenseByCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    const cat = data.categories.find(c => c.id === t.categoryId);
    const name = cat ? cat.name : 'Otros';
    expenseByCat[name] = (expenseByCat[name] || 0) + t.amount;
  });
  const chartData = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxVal = chartData.length ? Math.max(...chartData.map(d => d[1])) : 1;

  el.innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:8px">Resumen del mes (${monthName(now.getMonth())})</div>
      <div class="grid-2" style="margin-bottom:12px">
        <div>
          <div style="font-size:0.8rem;color:var(--text-secondary)">Ingresos</div>
          <div style="font-weight:700;color:var(--success);font-size:1.1rem">${formatMoney(income)}</div>
        </div>
        <div>
          <div style="font-size:0.8rem;color:var(--text-secondary)">Gastos</div>
          <div style="font-weight:700;color:var(--danger);font-size:1.1rem">${formatMoney(expense)}</div>
        </div>
      </div>
      <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:6px">
        Balance: <strong style="color:${income - expense >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatMoney(income - expense)}</strong>
      </div>
      ${chartData.length > 0 ? `
        <div style="margin-top:14px">
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px">Gastos por categoría</div>
          ${chartData.map(([name, val]) => {
            const pct = (val / maxVal) * 100;
            return `
              <div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
                  <span>${name}</span>
                  <span>${formatMoney(val)}</span>
                </div>
                <div class="progress-bar" style="height:6px">
                  <div class="progress-fill" style="width:${pct}%;background:var(--primary)"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div style="font-size:0.85rem;color:var(--text-secondary)">Sin gastos este mes</div>'}
    </div>

    <div class="form-group" style="margin-bottom:10px">
      <input type="search" id="tx-search" class="form-control" placeholder="Buscar por nota, monto, categoría..." />
    </div>
    <div class="filters" id="tx-filters">
      <button class="chip active" data-filter="all">Todos</button>
      <button class="chip" data-filter="income">Ingresos</button>
      <button class="chip" data-filter="expense">Gastos</button>
    </div>
    <div class="card" id="tx-list">
      ${sorted.length === 0 ? `
        <div class="empty-state"><i class="fas fa-list"></i><p>No hay movimientos</p></div>
      ` : sorted.map(t => transactionRow(t)).join('')}
    </div>
  `;

  
  const searchInput = document.getElementById('tx-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filter = document.querySelector('#tx-filters .chip.active')?.dataset.filter || 'all';
      let list = [...data.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
      if (filter !== 'all') list = list.filter(t => t.type === filter);
      if (q) {
        list = list.filter(t => {
          const cat = data.categories.find(c => c.id === t.categoryId)?.name || '';
          const acc = data.accounts.find(a => a.id === t.accountId)?.name || '';
          return (t.note || '').toLowerCase().includes(q)
            || cat.toLowerCase().includes(q)
            || acc.toLowerCase().includes(q)
            || String(t.amount).includes(q)
            || formatMoney(t.amount).toLowerCase().includes(q);
        });
      }
      const box = document.getElementById('tx-list');
      if (box) {
        box.innerHTML = list.length === 0
          ? '<div class="empty-state"><i class="fas fa-search"></i><p>Sin resultados</p></div>'
          : list.map(t => transactionRow(t)).join('');
      }
    });
  }

  document.querySelectorAll('#tx-filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#tx-filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      const filtered = filter === 'all' ? sorted : sorted.filter(t => t.type === filter);
      document.getElementById('tx-list').innerHTML = filtered.length
        ? filtered.map(t => transactionRow(t)).join('')
        : `<div class="empty-state"><p>Sin resultados</p></div>`;
    });
  });
}

// ========== BUDGETS ==========
function renderBudgets(el) {
  setTitle('Presupuestos');
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthBudgets = data.budgets.filter(b => b.month === month && b.year === year);

  el.innerHTML = `
    <div class="card" style="text-align:center">
      <div class="card-title">${monthName(month)} ${year}</div>
    </div>
    <button class="btn btn-primary" style="margin-bottom:16px" onclick="openAddBudget()">
      <i class="fas fa-plus"></i> Nuevo presupuesto
    </button>
    ${monthBudgets.length === 0 ? `
      <div class="empty-state"><i class="fas fa-chart-pie"></i><p>No tienes presupuestos este mes</p></div>
    ` : monthBudgets.map(b => {
      const cat = data.categories.find(c => c.id === b.categoryId) || { name: '?', icon: 'circle', color: '#94a3b8' };
      const spent = budgetSpent(b, now);
      const pct = b.amount > 0 ? Math.min(spent / b.amount, 1) : 0;
      const exceeded = spent > b.amount;
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="item-icon" style="background:${cat.color}22;color:${cat.color};width:36px;height:36px">
                <i class="fas fa-${cat.icon}"></i>
              </div>
              <div>
                <strong>${cat.name}</strong>
                ${b.deadline ? `<div style="font-size:0.75rem;color:var(--text-secondary)">Límite: ${formatDate(b.deadline)}</div>` : ''}
                ${b.note ? `<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">${b.note}</div>` : ''}
              </div>
            </div>
            ${exceeded ? '<span style="color:var(--danger);font-size:0.8rem;font-weight:700">¡Excedido!</span>' : ''}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct*100}%;background:${exceeded ? 'var(--danger)' : cat.color}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-secondary);margin-top:4px">
            <span>${formatMoney(spent)} gastado</span>
            <span>${formatMoney(b.amount)} límite</span>
          </div>
          <div style="margin-top:10px;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap">
            <button class="chip" style="padding:6px 12px;font-size:0.8rem" onclick="openEditBudget('${b.id}')">Editar</button>
            <button class="chip" style="padding:6px 12px;font-size:0.8rem" onclick="resetBudgetSpent('${b.id}')">Restablecer gastado</button>
            <button class="chip" style="padding:6px 12px;font-size:0.8rem;color:var(--danger)" onclick="deleteBudget('${b.id}')">Eliminar</button>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ========== MORE ==========
function renderMore(el) {
  setTitle('Más');
  el.innerHTML = `
    <div class="menu-list">
      <button class="menu-item" onclick="renderCashFlow()">
        <i class="fas fa-chart-line"></i> Flujo de caja
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="renderGoalsPage()">
        <i class="fas fa-flag"></i> Metas de ahorro
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="renderDebtsPage()">
        <i class="fas fa-credit-card"></i> Deudas
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="renderAccountsPage()">
        <i class="fas fa-wallet"></i> Cuentas
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="openLockSettings()">
        <i class="fas fa-lock"></i> Bloqueo / PIN
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="openCurrencySettings()">
        <i class="fas fa-coins"></i> Moneda (${data.settings.currency})
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="openRecurringPage()">
        <i class="fas fa-redo"></i> Recurrentes
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="openTemplatesPage()">
        <i class="fas fa-bookmark"></i> Plantillas
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="exportMonthReport()">
        <i class="fas fa-file-csv"></i> Reporte del mes (CSV)
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="exportData()">
        <i class="fas fa-file-export"></i> Exportar backup
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="importData()">
        <i class="fas fa-file-import"></i> Importar backup
        <i class="fas fa-chevron-right arrow"></i>
      </button>
      <button class="menu-item" onclick="confirmReset()" style="color:var(--danger)">
        <i class="fas fa-trash" style="color:var(--danger)"></i> Borrar todos los datos
      </button>
    </div>
  `;
}


function renderCashFlow() {
  setTitle('Flujo de caja');
  const el = document.getElementById('main-content');
  const now = new Date();
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  
  const monthTx = data.transactions.filter(t => isSameMonth(t.date, now));
  const incomeMonth = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseMonth = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  const estimatedIncome = data.settings.estimatedIncome || 0;
  const estimatedIncomeDate = data.settings.estimatedIncomeDate || '';
  
  const activeDebts = data.debts.filter(d => d.paid < d.total);
  const totalDebtRemaining = activeDebts.reduce((s, d) => s + (d.total - d.paid), 0);
  const monthlyDebtPayments = activeDebts.reduce((s, d) => {
    const cuotas = d.cuotas || 1;
    const cuotasPagadas = d.cuotasPagadas || 0;
    if (cuotasPagadas >= cuotas) return s;
    return s + (d.cuotaMonto || Math.round(d.total / cuotas));
  }, 0);
  
  const fixedDebts = activeDebts.filter(d => d.esFijo);
  const fixedMonthly = fixedDebts.reduce((s, d) => s + (d.cuotaMonto || Math.round(d.total / (d.cuotas || 1))), 0);
  
  const pendingIncome = Math.max(0, estimatedIncome - incomeMonth);
  const afterEstimatedIncome = totalBalance + pendingIncome;
  const afterCuotas = afterEstimatedIncome - monthlyDebtPayments;
  const afterFixed = afterEstimatedIncome - fixedMonthly;
  const afterAllDebts = afterEstimatedIncome - totalDebtRemaining;
  
  // Proyección de ahorro
  const activeGoals = data.goals.filter(g => g.current < g.target);
  const totalGoalsRemaining = activeGoals.reduce((s, g) => s + (g.target - g.current), 0);
  // Disponible para ahorrar = después de cuotas del mes
  const availableToSave = Math.max(0, afterCuotas);
  // Meses estimados para completar metas (si destinara todo lo disponible)
  const monthsToGoals = availableToSave > 0 && totalGoalsRemaining > 0
    ? Math.ceil(totalGoalsRemaining / availableToSave)
    : null;
  
  el.innerHTML = `
    <div class="card" style="text-align:center;margin-bottom:12px">
      <div class="card-title">Saldo actual</div>
      <div class="balance ${totalBalance >= 0 ? 'positive' : 'negative'}">${formatMoney(totalBalance)}</div>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:10px">Ingreso estimado del mes</div>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:10px">
        Si aún no cargaste tu salario, indícalo aquí con la fecha esperada.
      </p>
      <div class="form-group">
        <label>Monto estimado</label>
        <input type="text" id="estimated-income" class="form-control" placeholder="0" inputmode="numeric" value="${estimatedIncome ? formatNumberInput(estimatedIncome) : ''}" />
      </div>
      <div class="form-group">
        <label>Fecha esperada del ingreso</label>
        <input type="date" id="estimated-income-date" class="form-control" value="${estimatedIncomeDate}" />
      </div>
      <button class="btn btn-primary" onclick="saveEstimatedIncome()">Actualizar proyección</button>
      ${incomeMonth > 0 ? `<p style="font-size:0.75rem;color:var(--text-secondary);margin-top:8px">Ya tienes ${formatMoney(incomeMonth)} de ingresos cargados este mes.</p>` : ''}
      ${estimatedIncomeDate ? `<p style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px">Ingreso estimado para: ${formatDate(estimatedIncomeDate)}</p>` : ''}
    </div>

    <div class="section-title">Resumen del mes (${monthName(now.getMonth())})</div>
    <div class="card">
      <div class="list-item" style="border:none;padding:8px 0">
        <div class="item-info"><div class="name">Ingresos cargados</div></div>
        <div class="item-amount income">+${formatMoney(incomeMonth)}</div>
      </div>
      <div class="list-item" style="border:none;padding:8px 0">
        <div class="item-info"><div class="name">Ingreso estimado</div></div>
        <div class="item-amount income">+${formatMoney(estimatedIncome)}</div>
      </div>
      <div class="list-item" style="border:none;padding:8px 0">
        <div class="item-info"><div class="name">Gastos cargados</div></div>
        <div class="item-amount expense">-${formatMoney(expenseMonth)}</div>
      </div>
      <div class="list-item" style="border:none;padding:8px 0">
        <div class="item-info"><div class="name">Cuotas de deudas (mes)</div></div>
        <div class="item-amount expense">-${formatMoney(monthlyDebtPayments)}</div>
      </div>
    </div>

    <div class="section-title">Proyecciones de saldo</div>
    <div class="card">
      <div style="margin-bottom:14px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Con ingreso estimado pendiente</div>
        <div style="font-size:1.3rem;font-weight:700;color:${afterEstimatedIncome >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatMoney(afterEstimatedIncome)}
        </div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Después de pagar cuotas del mes</div>
        <div style="font-size:1.3rem;font-weight:700;color:${afterCuotas >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatMoney(afterCuotas)}
        </div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Después de gastos fijos</div>
        <div style="font-size:1.3rem;font-weight:700;color:${afterFixed >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatMoney(afterFixed)}
        </div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Si liquidaras todas las deudas</div>
        <div style="font-size:1.3rem;font-weight:700;color:${afterAllDebts >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatMoney(afterAllDebts)}
        </div>
      </div>
    </div>

    <div class="section-title">Proyección de ahorro</div>
    <div class="card">
      <div style="margin-bottom:14px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Disponible para ahorrar (después de cuotas)</div>
        <div style="font-size:1.3rem;font-weight:700;color:var(--primary)">
          ${formatMoney(availableToSave)}
        </div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Total faltante en metas</div>
        <div style="font-size:1.1rem;font-weight:700">
          ${formatMoney(totalGoalsRemaining)}
        </div>
      </div>
      ${monthsToGoals !== null ? `
        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:0.85rem;color:var(--text-secondary)">Meses estimados para completar metas</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--primary)">
            ${monthsToGoals} mes${monthsToGoals !== 1 ? 'es' : ''}
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">Si destinás todo lo disponible cada mes</div>
        </div>
      ` : activeGoals.length === 0 ? `
        <div style="border-top:1px solid var(--border);padding-top:14px;font-size:0.85rem;color:var(--text-secondary)">
          No tienes metas de ahorro activas. Crea una en Más → Metas de ahorro.
        </div>
      ` : `
        <div style="border-top:1px solid var(--border);padding-top:14px;font-size:0.85rem;color:var(--text-secondary)">
          No hay saldo disponible para proyectar ahorro este mes.
        </div>
      `}
      ${activeGoals.length > 0 ? `
        <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
          ${activeGoals.map(g => {
            const faltante = g.target - g.current;
            const meses = availableToSave > 0 ? Math.ceil(faltante / availableToSave) : '—';
            return `
              <div class="list-item" style="padding:6px 0">
                <div class="item-info">
                  <div class="name">${g.name}</div>
                  <div class="sub">Falta ${formatMoney(faltante)}</div>
                </div>
                <div style="font-size:0.85rem;font-weight:600;color:var(--primary)">${meses !== '—' ? meses + ' mes(es)' : '—'}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>

    ${activeDebts.length > 0 ? `
      <div class="section-title">Detalle de deudas</div>
      <div class="card">
        ${activeDebts.map(d => {
          const cuotas = d.cuotas || 1;
          const pagadas = d.cuotasPagadas || 0;
          const cuota = d.cuotaMonto || Math.round(d.total / cuotas);
          return `
            <div class="list-item">
              <div class="item-info">
                <div class="name">${d.name} ${d.esFijo ? '📌' : ''}</div>
                <div class="sub">${pagadas}/${cuotas} cuotas · cuota ${formatMoney(cuota)}${d.fecha ? ' · vence ' + formatDate(d.fecha) : ''}</div>
              </div>
              <div class="item-amount expense">${formatMoney(d.total - d.paid)}</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <button class="btn btn-outline" style="margin-top:12px" onclick="currentPage='more';render()">← Volver</button>
  `;
  
  setupAmountInput('estimated-income');
}

function saveEstimatedIncome() {
  const val = parseFormattedNumber(document.getElementById('estimated-income').value) || 0;
  const fecha = document.getElementById('estimated-income-date').value || '';
  data.settings.estimatedIncome = val;
  data.settings.estimatedIncomeDate = fecha;
  saveData(data);
  showToast('Proyección actualizada');
  renderCashFlow();
}

function renderGoalsPage() {
  setTitle('Metas de ahorro');
  const el = document.getElementById('main-content');
  el.innerHTML = `
    <button class="btn btn-primary" style="margin-bottom:16px" onclick="openAddGoal()">
      <i class="fas fa-plus"></i> Nueva meta
    </button>
    ${data.goals.length === 0 ? `
      <div class="empty-state"><i class="fas fa-flag"></i><p>Sin metas todavía</p></div>
    ` : data.goals.map(g => {
      const pct = g.target > 0 ? Math.min(g.current / g.target, 1) : 0;
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between">
            <strong>${g.name}</strong>
            <span style="color:var(--primary);font-weight:700">${Math.round(pct*100)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct*100}%;background:#14b8a6"></div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px">
            <div>${formatMoney(g.current)} de ${formatMoney(g.target)}</div>
            ${g.deadline ? `<div style="margin-top:2px">Límite: ${formatDate(g.deadline)}</div>` : ''}
            ${g.nextAporte ? `<div style="margin-top:2px">Próximo aporte: ${formatDate(g.nextAporte)}</div>` : ''}
          </div>
          <div style="margin-top:8px;text-align:right">
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button class="chip" style="padding:4px 10px" onclick="openEditGoal('${g.id}')">Editar</button>
              <button class="chip" style="padding:4px 10px" onclick="openContributeGoal('${g.id}')">Aportar</button>
            </div>
          </div>
        </div>
      `;
    }).join('')}
    <button class="btn btn-outline" style="margin-top:12px" onclick="currentPage='more';render()">← Volver</button>
  `;
}

function renderDebtsPage() {
  setTitle('Deudas');
  const el = document.getElementById('main-content');
  el.innerHTML = `
    <button class="btn btn-primary" style="margin-bottom:16px" onclick="openAddDebt()">
      <i class="fas fa-plus"></i> Nueva deuda
    </button>
    ${data.debts.length === 0 ? `
      <div class="empty-state"><i class="fas fa-credit-card"></i><p>Sin deudas registradas</p></div>
    ` : data.debts.map(d => {
      const pct = d.total > 0 ? Math.min(d.paid / d.total, 1) : 0;
      const cuotas = d.cuotas || 1;
      const cuotasPagadas = d.cuotasPagadas || 0;
      const cuotasRestantes = Math.max(cuotas - cuotasPagadas, 0);
      const cuotaMonto = d.cuotaMonto || Math.round(d.total / cuotas);
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <strong>${d.name}</strong>
              ${d.esFijo ? '<span style="font-size:0.7rem;background:#6366f1;color:#fff;padding:2px 6px;border-radius:8px;margin-left:6px">Fijo</span>' : ''}
            </div>
            <span style="font-weight:700">${Math.round(pct*100)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct*100}%;background:var(--danger)"></div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px">
              <span>Total: ${formatMoney(d.total)}</span>
              <span>Pagado: ${formatMoney(d.paid)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px">
              <span>Cuota: ${formatMoney(cuotaMonto)}</span>
              <span>${cuotasPagadas}/${cuotas} cuotas</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <span>Restan ${cuotasRestantes} cuotas · ${formatMoney(d.total - d.paid)}</span>
              <div style="display:flex;gap:6px">
                <button class="chip" style="padding:4px 10px" onclick="openEditDebt('${d.id}')">Editar</button>
                <button class="chip" style="padding:4px 10px" onclick="openPayDebt('${d.id}')">Pagar cuota</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
    <button class="btn btn-outline" style="margin-top:12px" onclick="currentPage='more';render()">← Volver</button>
  `;
}

function renderAccountsPage() {
  setTitle('Cuentas');
  const el = document.getElementById('main-content');
  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
      <button class="chip" onclick="toggleHideAccounts()">
        <i class="fas ${data.settings.hideAccounts ? 'fa-eye-slash' : 'fa-eye'}"></i>
        ${data.settings.hideAccounts ? 'Mostrar saldos' : 'Ocultar saldos'}
      </button>
    </div>
    ${data.accounts.map(a => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${a.name}</strong>
          <div style="font-size:0.85rem;color:var(--text-secondary)">${a.type === 'cash' ? 'Efectivo' : 'Tarjeta'}</div>
        </div>
        <div style="font-weight:700;font-size:1.1rem" class="${data.settings.hideAccounts ? 'hidden-balance' : ''}">${formatMoney(a.balance)}</div>
      </div>
    `).join('')}
    <button class="btn btn-outline" style="margin-top:12px" onclick="currentPage='more';render()">← Volver</button>
  `;
}


// ========== MODAL ==========
function setupModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
}

function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}


function mainCategories(type) {
  return (data.categories || []).filter(c => c.type === type && !c.parentId);
}
function subCategories(parentId) {
  return (data.categories || []).filter(c => c.parentId === parentId);
}
function categoryLabel(catId) {
  const cat = (data.categories || []).find(c => c.id === catId);
  if (!cat) return 'Sin categoría';
  if (cat.parentId) {
    const parent = data.categories.find(c => c.id === cat.parentId);
    return (parent ? parent.name + ' · ' : '') + cat.name;
  }
  return cat.name;
}
function categoryDisplay(catId) {
  const cat = (data.categories || []).find(c => c.id === catId) || { name: 'Sin categoría', icon: 'circle', color: '#94a3b8' };
  if (cat.parentId) {
    const parent = data.categories.find(c => c.id === cat.parentId);
    return {
      ...cat,
      name: categoryLabel(catId),
      color: (parent && parent.color) || cat.color,
      icon: cat.icon || (parent && parent.icon) || 'circle'
    };
  }
  return cat;
}
function onParentCategoryChange(parentSelectId, subSelectId) {
  const parentId = document.getElementById(parentSelectId) && document.getElementById(parentSelectId).value;
  const subSel = document.getElementById(subSelectId);
  if (!subSel) return;
  const subs = subCategories(parentId);
  if (!subs.length) {
    subSel.innerHTML = '<option value="">— Sin subcategoría —</option>';
    subSel.disabled = true;
  } else {
    subSel.disabled = false;
    subSel.innerHTML = '<option value="">— General —</option>' +
      subs.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
  }
}
function resolveCategoryId(parentSelectId, subSelectId) {
  const subEl = document.getElementById(subSelectId);
  const sub = subEl && subEl.value;
  if (sub) return sub;
  const parentEl = document.getElementById(parentSelectId);
  return parentEl ? parentEl.value : '';
}

function accountsBankFirst() {
  const list = [...data.accounts];
  list.sort((a, b) => {
    const rank = (t) => (t === 'card' || t === 'bank') ? 0 : (t === 'cash' ? 2 : 1);
    return rank(a.type) - rank(b.type);
  });
  return list;
}

function budgetSpent(b, now) {
  const resetAt = b.spentResetAt ? b.spentResetAt.slice(0, 10) : null;
  const matchCat = (catId) => {
    if (catId === b.categoryId) return true;
    const cat = data.categories.find(c => c.id === catId);
    return cat && cat.parentId === b.categoryId;
  };
  return data.transactions
    .filter(t => {
      if (t.type !== 'expense' || !matchCat(t.categoryId)) return false;
      if (!isSameMonth(t.date, now)) return false;
      if (resetAt && String(t.date).slice(0, 10) < resetAt) return false;
      return true;
    })
    .reduce((s, t) => s + t.amount, 0);
}

function setupAmountInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', (e) => {
    const cursor = e.target.selectionStart;
    const oldLen = e.target.value.length;
    e.target.value = formatNumberInput(e.target.value);
    const newLen = e.target.value.length;
    e.target.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
  });
}

// ========== ADD TRANSACTION ==========
function openAddTransaction() {
  const cats = data.categories;
  const accs = data.accounts;
  openModal('Nuevo movimiento', `
    <div class="segmented" id="type-seg">
      <button class="active" data-type="expense">Gasto</button>
      <button data-type="income">Ingreso</button>
    </div>
    <div class="form-group" style="margin-top:16px">
      <label>Monto</label>
      <input type="text" id="tx-amount" class="form-control" placeholder="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Cuenta</label>
      <select id="tx-account" class="form-control">
        ${accs.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Categoría</label>
      <select id="tx-category" class="form-control" onchange="onParentCategoryChange('tx-category','tx-subcategory')">
        ${mainCategories('expense').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Subcategoría</label>
      <select id="tx-subcategory" class="form-control">
        <option value="">— General —</option>
        ${subCategories('c1').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Fecha</label>
      <input type="date" id="tx-date" class="form-control" value="${toLocalDateStr(new Date())}" />
    </div>
    <div class="form-group">
      <label>Nota (opcional)</label>
      <input type="text" id="tx-note" class="form-control" placeholder="Ej: Supermercado" />
    </div>
    <button class="btn btn-outline btn-voice-hold" style="margin-bottom:10px;user-select:none;-webkit-user-select:none;touch-action:none" id="btn-voice-tx">
      <i class="fas fa-microphone"></i> Mantener para hablar
    </button>
    <p id="voice-status" style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin-bottom:10px;min-height:1.2em">Mantené el botón y hablá con naturalidad. Ej: registra un gasto de 200.000 por almuerzo en doña brigida</p>
    <button class="btn btn-primary" onclick="saveTransaction()">Guardar</button>
  `);

  setupAmountInput('tx-amount');
  bindVoiceHoldButton();

  document.querySelectorAll('#type-seg button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#type-seg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      const select = document.getElementById('tx-category');
      select.innerHTML = mainCategories(type)
        .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      onParentCategoryChange('tx-category','tx-subcategory');
    });
  });
  onParentCategoryChange('tx-category','tx-subcategory');
}

function saveTransaction() {
  const type = document.querySelector('#type-seg button.active').dataset.type;
  const amount = parseFormattedNumber(document.getElementById('tx-amount').value);
  const accountId = document.getElementById('tx-account').value;
  const categoryId = resolveCategoryId('tx-category', 'tx-subcategory');
  const date = document.getElementById('tx-date').value;
  const note = document.getElementById('tx-note').value.trim();

  if (!amount || amount <= 0) {
    showToast('Ingresa un monto válido');
    return;
  }

  const tx = {
    id: uid(),
    type,
    amount,
    accountId,
    categoryId,
    date,
    note,
    createdAt: new Date().toISOString()
  };

  data.transactions.push(tx);
  const acc = data.accounts.find(a => a.id === accountId);
  if (acc) acc.balance += (type === 'income' ? amount : -amount);

  saveData(data);
  closeModal();
  showToast(type === 'income' ? 'Ingreso guardado' : 'Gasto guardado');
  render();
}

function openEditTransaction(id) {
  const t = data.transactions.find(x => x.id === id);
  if (!t) return;
  openModal('Movimiento', `
    <div style="margin-bottom:16px">${transactionRow(t)}</div>
    <button class="btn btn-danger" onclick="softDeleteTransaction('${id}')">
      <i class="fas fa-trash"></i> Eliminar movimiento
    </button>
  `);
}

function softDeleteTransaction(id) {
  const idx = data.transactions.findIndex(t => t.id === id);
  if (idx < 0) return;
  const tx = data.transactions[idx];
  const acc = data.accounts.find(a => a.id === tx.accountId);
  if (acc) {
    if (tx.type === 'income') acc.balance -= tx.amount;
    else acc.balance += tx.amount;
  }
  data.transactions.splice(idx, 1);
  saveData(data);
  lastDeleted = { tx };
  try { closeModal(); } catch(e) {}
  showUndoToast('Movimiento eliminado');
  render();
}

// ========== PAY DEBT ==========
function openPayDebt(debtId) {
  const debt = data.debts.find(d => d.id === debtId);
  if (!debt) return;
  const remaining = debt.total - debt.paid;
  const cuotas = debt.cuotas || 1;
  const cuotasPagadas = debt.cuotasPagadas || 0;
  const cuotaMonto = debt.cuotaMonto || Math.round(debt.total / cuotas);
  const sugerido = Math.min(cuotaMonto, remaining);
  openModal('Pagar cuota', `
    <p style="margin-bottom:8px"><strong>${debt.name}</strong></p>
    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:4px">
      Cuotas: ${cuotasPagadas}/${cuotas} · Resta ${formatMoney(remaining)}
    </p>
    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px">
      Valor cuota: ${formatMoney(cuotaMonto)}
    </p>
    <div class="form-group">
      <label>Monto a pagar</label>
      <input type="text" id="pay-amount" class="form-control" placeholder="0" inputmode="numeric" value="${formatNumberInput(sugerido)}" />
    </div>
    <div class="form-group">
      <label>Desde cuenta</label>
      <select id="pay-account" class="form-control">
        ${accountsBankFirst().map(a => `<option value="${a.id}">${a.name} (${formatMoney(a.balance)})</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" onclick="savePayDebt('${debtId}')">Registrar pago</button>
  `);
  setupAmountInput('pay-amount');
}

function savePayDebt(debtId) {
  const debt = data.debts.find(d => d.id === debtId);
  if (!debt) return;
  const amount = parseFormattedNumber(document.getElementById('pay-amount').value);
  const accountId = document.getElementById('pay-account').value;
  if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
  const acc = data.accounts.find(a => a.id === accountId);
  if (!acc || acc.balance < amount) { showToast('Saldo insuficiente en la cuenta'); return; }

  debt.paid = Math.min(debt.paid + amount, debt.total);
  // Incrementar cuotas pagadas si el pago es >= cuota
  const cuotaMonto = debt.cuotaMonto || Math.round(debt.total / (debt.cuotas || 1));
  if (!debt.cuotasPagadas) debt.cuotasPagadas = 0;
  if (amount >= cuotaMonto * 0.9) { // tolerancia
    debt.cuotasPagadas = Math.min((debt.cuotasPagadas || 0) + 1, debt.cuotas || 1);
  }
  // Si ya pagó todo, marcar cuotas completas
  if (debt.paid >= debt.total) {
    debt.cuotasPagadas = debt.cuotas || 1;
  }

  const cat = data.categories.find(c => c.id === 'c14');
  data.transactions.push({
    id: uid(), type: 'expense', amount, accountId,
    categoryId: cat ? cat.id : 'c9',
    date: toLocalDateStr(new Date()),
    note: 'Pago deuda: ' + debt.name + (debt.cuotas ? ' (cuota ' + debt.cuotasPagadas + '/' + debt.cuotas + ')' : ''),
    createdAt: new Date().toISOString()
  });
  acc.balance -= amount;

  saveData(data);
  closeModal();
  showToast(debt.paid >= debt.total ? '¡Deuda liquidada!' : 'Pago registrado');
  render();
}

// ========== CONTRIBUTE TO GOAL ==========
function openContributeGoal(goalId) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal) return;
  const remaining = goal.target - goal.current;
  openModal('Aportar a meta', `
    <p style="margin-bottom:12px"><strong>${goal.name}</strong></p>
    <p style="color:var(--text-secondary);margin-bottom:16px">Falta: ${formatMoney(remaining)}</p>
    <div class="form-group">
      <label>Monto a aportar</label>
      <input type="text" id="goal-amount" class="form-control" placeholder="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Desde cuenta</label>
      <select id="goal-account" class="form-control">
        ${accountsBankFirst().map(a => `<option value="${a.id}">${a.name} (${formatMoney(a.balance)})</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" onclick="saveContributeGoal('${goalId}')">Aportar</button>
  `);
  setupAmountInput('goal-amount');
}

function saveContributeGoal(goalId) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal) return;
  const amount = parseFormattedNumber(document.getElementById('goal-amount').value);
  const accountId = document.getElementById('goal-account').value;
  if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
  const acc = data.accounts.find(a => a.id === accountId);
  if (!acc || acc.balance < amount) { showToast('Saldo insuficiente en la cuenta'); return; }

  goal.current = Math.min(goal.current + amount, goal.target);

  const cat = data.categories.find(c => c.id === 'c15');
  data.transactions.push({
    id: uid(), type: 'expense', amount, accountId,
    categoryId: cat ? cat.id : 'c9',
    date: toLocalDateStr(new Date()),
    note: 'Aporte meta: ' + goal.name,
    createdAt: new Date().toISOString()
  });
  acc.balance -= amount;

  saveData(data);
  closeModal();
  showToast(goal.current >= goal.target ? '¡Meta completada!' : 'Aporte registrado');
  render();
}

// ========== ADD FORMS ==========
function resetBudgetSpent(budgetId) {
  const b = data.budgets.find(x => x.id === budgetId);
  if (!b) return;
  b.spentResetAt = new Date().toISOString();
  saveData(data);
  showToast('Gastado restablecido a 0');
  if (currentPage === 'budgets') renderBudgets(document.getElementById('main-content'));
  else render();
}

function openAddBudget() {
  const expenseCats = mainCategories('expense');
  openModal('Nuevo presupuesto', `
    <div class="form-group">
      <label>Categoría</label>
      <select id="bdg-cat" class="form-control">
        ${expenseCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Monto límite mensual</label>
      <input type="text" id="bdg-amount" class="form-control" placeholder="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Fecha límite (opcional)</label>
      <input type="date" id="bdg-deadline" class="form-control" />
    </div>
    <div class="form-group">
      <label>Nota (opcional)</label>
      <input type="text" id="bdg-note" class="form-control" placeholder="Ej: Solo supermercado, sin delivery" />
    </div>
    <button class="btn btn-primary" onclick="saveBudget()">Guardar presupuesto</button>
  `);
  setupAmountInput('bdg-amount');
}

function saveBudget() {
  const categoryId = document.getElementById('bdg-cat').value;
  const amount = parseFormattedNumber(document.getElementById('bdg-amount').value);
  const deadline = document.getElementById('bdg-deadline').value || null;
  const note = (document.getElementById('bdg-note') && document.getElementById('bdg-note').value || '').trim();
  if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
  const now = new Date();
  data.budgets.push({
    id: uid(),
    categoryId,
    amount,
    month: now.getMonth(),
    year: now.getFullYear(),
    deadline,
    note,
    spentResetAt: null
  });
  saveData(data);
  closeModal();
  showToast('Presupuesto creado');
  render();
}


function openEditBudget(budgetId) {
  const b = data.budgets.find(x => x.id === budgetId);
  if (!b) return;
  const expenseCats = mainCategories('expense');
  openModal('Editar presupuesto', `
    <div class="form-group">
      <label>Categoría</label>
      <select id="bdg-cat" class="form-control">
        ${expenseCats.map(c => `<option value="${c.id}" ${c.id === b.categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Monto límite mensual</label>
      <input type="text" id="bdg-amount" class="form-control" inputmode="numeric" value="${formatNumberInput(b.amount)}" />
    </div>
    <div class="form-group">
      <label>Fecha límite (opcional)</label>
      <input type="date" id="bdg-deadline" class="form-control" value="${b.deadline || ''}" />
    </div>
    <div class="form-group">
      <label>Nota (opcional)</label>
      <input type="text" id="bdg-note" class="form-control" value="${(b.note || '').replace(/"/g, '&quot;')}" placeholder="Ej: Solo supermercado" />
    </div>
    <button class="btn btn-primary" onclick="saveEditBudget('${budgetId}')">Guardar cambios</button>
    <button class="btn btn-danger" style="margin-top:8px" onclick="deleteBudget('${budgetId}')">Eliminar presupuesto</button>
  `);
  setupAmountInput('bdg-amount');
}

function saveEditBudget(budgetId) {
  const b = data.budgets.find(x => x.id === budgetId);
  if (!b) return;
  const categoryId = document.getElementById('bdg-cat').value;
  const amount = parseFormattedNumber(document.getElementById('bdg-amount').value);
  const deadline = document.getElementById('bdg-deadline').value || null;
  const note = (document.getElementById('bdg-note') && document.getElementById('bdg-note').value || '').trim();
  if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
  b.categoryId = categoryId;
  b.amount = amount;
  b.deadline = deadline;
  b.note = note;
  saveData(data);
  closeModal();
  showToast('Presupuesto actualizado');
  currentPage = 'budgets';
  render();
}

function deleteBudget(budgetId) {
  if (!confirm('¿Eliminar este presupuesto?')) return;
  data.budgets = data.budgets.filter(b => b.id !== budgetId);
  saveData(data);
  try { closeModal(); } catch (e) {}
  showToast('Presupuesto eliminado');
  currentPage = 'budgets';
  render();
}

function openEditRecurring(recId) {
  const r = (data.recurring || []).find(x => x.id === recId);
  if (!r) return;
  const cats = data.categories.filter(c => !c.parentId);
  openModal('Editar recurrente', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="rec-name" class="form-control" value="${(r.name || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="form-group">
      <label>Tipo</label>
      <select id="rec-type" class="form-control">
        <option value="expense" ${r.type === 'expense' ? 'selected' : ''}>Gasto</option>
        <option value="income" ${r.type === 'income' ? 'selected' : ''}>Ingreso</option>
      </select>
    </div>
    <div class="form-group">
      <label>Monto</label>
      <input type="text" id="rec-amount" class="form-control" inputmode="numeric" value="${formatNumberInput(r.amount)}" />
    </div>
    <div class="form-group">
      <label>Categoría</label>
      <select id="rec-cat" class="form-control">
        ${cats.map(c => `<option value="${c.id}" ${c.id === r.categoryId ? 'selected' : ''}>${c.name} (${c.type === 'income' ? 'Ingreso' : 'Gasto'})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Cuenta</label>
      <select id="rec-acc" class="form-control">
        ${accountsBankFirst().map(a => `<option value="${a.id}" ${a.id === r.accountId ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Frecuencia</label>
      <select id="rec-freq" class="form-control">
        <option value="monthly" ${r.frequency === 'monthly' || !r.frequency ? 'selected' : ''}>Mensual</option>
        <option value="weekly" ${r.frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
        <option value="yearly" ${r.frequency === 'yearly' ? 'selected' : ''}>Anual</option>
      </select>
    </div>
    <div class="form-group">
      <label>Próxima fecha</label>
      <input type="date" id="rec-next" class="form-control" value="${r.nextDate || ''}" />
    </div>
    <div class="form-group">
      <label>Nota</label>
      <input type="text" id="rec-note" class="form-control" value="${(r.note || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="rec-active" style="width:18px;height:18px" ${r.active !== false ? 'checked' : ''} />
        Activo (generar automáticamente)
      </label>
    </div>
    <button class="btn btn-primary" onclick="saveEditRecurring('${recId}')">Guardar cambios</button>
    <button class="btn btn-danger" style="margin-top:8px" onclick="deleteRecurring('${recId}')">Eliminar recurrente</button>
  `);
  setupAmountInput('rec-amount');
}

function saveEditRecurring(recId) {
  const r = (data.recurring || []).find(x => x.id === recId);
  if (!r) return;
  const name = document.getElementById('rec-name').value.trim();
  const type = document.getElementById('rec-type').value;
  const amount = parseFormattedNumber(document.getElementById('rec-amount').value);
  const categoryId = document.getElementById('rec-cat').value;
  const accountId = document.getElementById('rec-acc').value;
  const frequency = document.getElementById('rec-freq').value;
  const nextDate = document.getElementById('rec-next').value;
  const note = document.getElementById('rec-note').value.trim();
  const active = document.getElementById('rec-active').checked;
  if (!name || !amount || amount <= 0 || !nextDate) { showToast('Completa nombre, monto y fecha'); return; }
  r.name = name;
  r.type = type;
  r.amount = amount;
  r.categoryId = categoryId;
  r.accountId = accountId;
  r.frequency = frequency;
  r.nextDate = nextDate;
  r.note = note;
  r.active = active;
  saveData(data);
  closeModal();
  showToast('Recurrente actualizado');
  openRecurringPage();
}


function openAddGoal() {
  openModal('Nueva meta de ahorro', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="goal-name" class="form-control" placeholder="Ej: Viaje a Brasil" />
    </div>
    <div class="form-group">
      <label>Monto objetivo</label>
      <input type="text" id="goal-target" class="form-control" placeholder="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Ya ahorrado</label>
      <input type="text" id="goal-current" class="form-control" value="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Fecha límite</label>
      <input type="date" id="goal-deadline" class="form-control" />
    </div>
    <div class="form-group">
      <label>Fecha del próximo aporte (opcional)</label>
      <input type="date" id="goal-next-aporte" class="form-control" />
    </div>
    <button class="btn btn-primary" onclick="saveGoal()">Crear meta</button>
  `);
  setupAmountInput('goal-target');
  setupAmountInput('goal-current');
}

function saveGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFormattedNumber(document.getElementById('goal-target').value);
  const current = parseFormattedNumber(document.getElementById('goal-current').value) || 0;
  const deadline = document.getElementById('goal-deadline').value || null;
  const nextAporte = document.getElementById('goal-next-aporte').value || null;
  if (!name || !target || target <= 0) { showToast('Completa los datos'); return; }
  data.goals.push({ id: uid(), name, target, current, deadline, nextAporte });
  saveData(data);
  closeModal();
  showToast('Meta creada');
  renderGoalsPage();
}


function openEditDebt(debtId) {
  const debt = data.debts.find(d => d.id === debtId);
  if (!debt) return;
  openModal('Editar deuda', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="debt-name" class="form-control" value="${(debt.name || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="form-group">
      <label>Monto total</label>
      <input type="text" id="debt-total" class="form-control" inputmode="numeric" value="${formatNumberInput(debt.total)}" />
    </div>
    <div class="form-group">
      <label>Cantidad de cuotas</label>
      <input type="number" id="debt-cuotas" class="form-control" min="1" value="${debt.cuotas || 1}" />
    </div>
    <div class="form-group">
      <label>Cuotas ya pagadas</label>
      <input type="number" id="debt-cuotas-pagadas" class="form-control" min="0" value="${debt.cuotasPagadas || 0}" />
    </div>
    <div class="form-group">
      <label>Ya pagado (monto)</label>
      <input type="text" id="debt-paid" class="form-control" inputmode="numeric" value="${formatNumberInput(debt.paid || 0)}" />
    </div>
    <div class="form-group">
      <label>Fecha de la próxima cuota / vencimiento</label>
      <input type="date" id="debt-fecha" class="form-control" value="${debt.fecha || ''}" />
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="debt-fijo" style="width:18px;height:18px" ${debt.esFijo ? 'checked' : ''} />
        Es un gasto fijo mensual
      </label>
    </div>
    <button class="btn btn-primary" onclick="saveEditDebt('${debtId}')">Guardar cambios</button>
    <button class="btn btn-danger" style="margin-top:8px" onclick="deleteDebt('${debtId}')">Eliminar deuda</button>
  `);
  setupAmountInput('debt-total');
  setupAmountInput('debt-paid');
}

function saveEditDebt(debtId) {
  const debt = data.debts.find(d => d.id === debtId);
  if (!debt) return;
  const name = document.getElementById('debt-name').value.trim();
  const total = parseFormattedNumber(document.getElementById('debt-total').value);
  const paid = parseFormattedNumber(document.getElementById('debt-paid').value) || 0;
  const cuotas = parseInt(document.getElementById('debt-cuotas').value) || 1;
  const cuotasPagadas = parseInt(document.getElementById('debt-cuotas-pagadas').value) || 0;
  const esFijo = document.getElementById('debt-fijo').checked;
  const fecha = document.getElementById('debt-fecha').value || null;
  if (!name || !total || total <= 0) { showToast('Completa los datos'); return; }
  if (cuotasPagadas > cuotas) { showToast('Cuotas pagadas no puede ser mayor al total'); return; }
  debt.name = name;
  debt.total = total;
  debt.paid = paid;
  debt.cuotas = cuotas;
  debt.cuotasPagadas = cuotasPagadas;
  debt.cuotaMonto = Math.round(total / cuotas);
  debt.esFijo = esFijo;
  debt.fecha = fecha;
  saveData(data);
  closeModal();
  showToast('Deuda actualizada');
  renderDebtsPage();
}

function deleteDebt(debtId) {
  data.debts = data.debts.filter(d => d.id !== debtId);
  saveData(data);
  closeModal();
  showToast('Deuda eliminada');
  renderDebtsPage();
}

function openEditGoal(goalId) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal) return;
  openModal('Editar meta', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="goal-name" class="form-control" value="${(goal.name || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="form-group">
      <label>Monto objetivo</label>
      <input type="text" id="goal-target" class="form-control" inputmode="numeric" value="${formatNumberInput(goal.target)}" />
    </div>
    <div class="form-group">
      <label>Ya ahorrado</label>
      <input type="text" id="goal-current" class="form-control" inputmode="numeric" value="${formatNumberInput(goal.current || 0)}" />
    </div>
    <div class="form-group">
      <label>Fecha límite</label>
      <input type="date" id="goal-deadline" class="form-control" value="${goal.deadline || ''}" />
    </div>
    <div class="form-group">
      <label>Fecha del próximo aporte</label>
      <input type="date" id="goal-next-aporte" class="form-control" value="${goal.nextAporte || ''}" />
    </div>
    <button class="btn btn-primary" onclick="saveEditGoal('${goalId}')">Guardar cambios</button>
    <button class="btn btn-danger" style="margin-top:8px" onclick="deleteGoal('${goalId}')">Eliminar meta</button>
  `);
  setupAmountInput('goal-target');
  setupAmountInput('goal-current');
}

function saveEditGoal(goalId) {
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal) return;
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFormattedNumber(document.getElementById('goal-target').value);
  const current = parseFormattedNumber(document.getElementById('goal-current').value) || 0;
  const deadline = document.getElementById('goal-deadline').value || null;
  const nextAporte = document.getElementById('goal-next-aporte').value || null;
  if (!name || !target || target <= 0) { showToast('Completa los datos'); return; }
  goal.name = name;
  goal.target = target;
  goal.current = current;
  goal.deadline = deadline;
  goal.nextAporte = nextAporte;
  saveData(data);
  closeModal();
  showToast('Meta actualizada');
  renderGoalsPage();
}

function deleteGoal(goalId) {
  data.goals = data.goals.filter(g => g.id !== goalId);
  saveData(data);
  closeModal();
  showToast('Meta eliminada');
  renderGoalsPage();
}


function openAddDebt() {
  openModal('Nueva deuda', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="debt-name" class="form-control" placeholder="Ej: Préstamo banco / TV en cuotas" />
    </div>
    <div class="form-group">
      <label>Monto total</label>
      <input type="text" id="debt-total" class="form-control" placeholder="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Cantidad de cuotas</label>
      <input type="number" id="debt-cuotas" class="form-control" placeholder="Ej: 12" min="1" value="1" />
    </div>
    <div class="form-group">
      <label>Cuotas ya pagadas</label>
      <input type="number" id="debt-cuotas-pagadas" class="form-control" placeholder="0" min="0" value="0" />
    </div>
    <div class="form-group">
      <label>Ya pagado (monto)</label>
      <input type="text" id="debt-paid" class="form-control" value="0" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Fecha de la próxima cuota / vencimiento</label>
      <input type="date" id="debt-fecha" class="form-control" value="${toLocalDateStr(new Date())}" />
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="debt-fijo" style="width:18px;height:18px" />
        Es un gasto fijo mensual
      </label>
    </div>
    <button class="btn btn-primary" onclick="saveDebt()">Guardar deuda</button>
  `);
  setupAmountInput('debt-total');
  setupAmountInput('debt-paid');
}

function saveDebt() {
  const name = document.getElementById('debt-name').value.trim();
  const total = parseFormattedNumber(document.getElementById('debt-total').value);
  const paid = parseFormattedNumber(document.getElementById('debt-paid').value) || 0;
  const cuotas = parseInt(document.getElementById('debt-cuotas').value) || 1;
  const cuotasPagadas = parseInt(document.getElementById('debt-cuotas-pagadas').value) || 0;
  const esFijo = document.getElementById('debt-fijo').checked;
  const fecha = document.getElementById('debt-fecha').value || null;
  if (!name || !total || total <= 0) { showToast('Completa los datos'); return; }
  if (cuotasPagadas > cuotas) { showToast('Cuotas pagadas no puede ser mayor al total'); return; }
  const cuotaMonto = Math.round(total / cuotas);
  data.debts.push({
    id: uid(),
    name,
    total,
    paid,
    cuotas,
    cuotasPagadas,
    cuotaMonto,
    esFijo,
    fecha
  });
  saveData(data);
  closeModal();
  showToast('Deuda registrada');
  renderDebtsPage();
}

function openCurrencySettings() {
  const currencies = ['PYG', 'USD', 'EUR', 'BRL', 'ARS', 'CLP'];
  openModal('Moneda', `
    <div class="form-group">
      <label>Selecciona la moneda</label>
      <select id="currency-select" class="form-control">
        ${currencies.map(c => `<option value="${c}" ${data.settings.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" onclick="saveCurrency()">Guardar</button>
  `);
}

function saveCurrency() {
  data.settings.currency = document.getElementById('currency-select').value;
  saveData(data);
  closeModal();
  showToast('Moneda actualizada');
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'OscarMoney_backup_' + toLocalDateStr(new Date()) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Datos exportados');
}

function confirmReset() {
  openModal('Borrar todo', `
    <p style="margin-bottom:20px;color:var(--text-secondary)">
      Se eliminarán todos los datos. Esta acción no se puede deshacer.
    </p>
    <button class="btn btn-danger" onclick="resetAllData()">Sí, borrar todo</button>
  `);
}

function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  data = loadData();
  closeModal();
  showToast('Datos borrados');
  currentPage = 'dashboard';
  render();
}

function toggleHideBalance() {
  data.settings.hideBalance = !data.settings.hideBalance;
  saveData(data);
  render();
}

function toggleHideExpenses() {
  data = loadData();
  if (!data.settings) data.settings = {};
  data.settings.hideExpenses = !data.settings.hideExpenses;
  saveData(data);
  render();
}

function toggleDashSection(key) {
  data = loadData();
  if (!data.settings) data.settings = {};
  if (!data.settings.dash) data.settings.dash = {};
  data.settings.dash[key] = !data.settings.dash[key];
  saveData(data);
  render();
}

function toggleHideAccounts() {
  data = loadData();
  if (!data.settings) data.settings = {};
  data.settings.hideAccounts = !data.settings.hideAccounts;
  saveData(data);
  render();
}

function toggleHideIncome() {
  data = loadData();
  if (!data.settings) data.settings = {};
  data.settings.hideIncome = !data.settings.hideIncome;
  saveData(data);
  render();
}






// ========== VOICE INPUT (mantener presionado) ==========
let activeRecognition = null;
let voiceHolding = false;

function bindVoiceHoldButton() {
  const btn = document.getElementById('btn-voice-tx');
  if (!btn) return;

  const start = (e) => {
    e.preventDefault();
    if (voiceHolding) return;
    voiceHolding = true;
    startVoiceTransaction();
  };
  const stop = (e) => {
    if (e) e.preventDefault();
    if (!voiceHolding) return;
    voiceHolding = false;
    stopVoiceTransaction();
  };

  btn.onmousedown = start;
  btn.onmouseup = stop;
  btn.onmouseleave = stop;
  btn.ontouchstart = start;
  btn.ontouchend = stop;
  btn.ontouchcancel = stop;
  // avoid click firing after touch
  btn.onclick = (e) => e.preventDefault();
}

function startVoiceTransaction() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const status = document.getElementById('voice-status');
  const btn = document.getElementById('btn-voice-tx');

  if (!SpeechRecognition) {
    if (status) status.textContent = 'Tu navegador no soporta dictado por voz.';
    showToast('Voz no disponible en este dispositivo');
    voiceHolding = false;
    return;
  }

  // Stop previous if any
  if (activeRecognition) {
    try { activeRecognition.stop(); } catch (e) {}
    activeRecognition = null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-PY';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 3;
  activeRecognition = recognition;

  if (status) status.textContent = 'Escuchando... soltá para terminar';
  if (btn) {
    btn.classList.add('listening');
    btn.innerHTML = '<i class="fas fa-microphone"></i> Escuchando... soltá';
  }

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t + ' ';
      else interim += t;
    }
    if (status) {
      const shown = (finalTranscript + interim).trim();
      status.textContent = shown ? ('Oyendo: "' + shown + '"') : 'Escuchando... soltá para terminar';
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted') return;
    if (status) {
      status.textContent = event.error === 'not-allowed'
        ? 'Permite el micrófono en Ajustes → Safari'
        : ('Error: ' + event.error);
    }
    resetVoiceButton();
  };

  recognition.onend = () => {
    const text = finalTranscript.trim();
    if (text) {
      if (status) status.textContent = 'Oí: "' + text + '"';
      parseVoiceCommand(text);
    } else if (voiceHolding) {
      // still holding but ended unexpectedly - try restart
      try { recognition.start(); return; } catch (e) {}
    } else {
      if (status && status.textContent.indexOf('Oí:') !== 0 && status.textContent.indexOf('Ingreso') !== 0 && status.textContent.indexOf('Gasto') !== 0) {
        status.textContent = 'No se escuchó nada. Mantené presionado e intentá de nuevo.';
      }
    }
    activeRecognition = null;
    resetVoiceButton();
  };

  try {
    recognition.start();
  } catch (e) {
    if (status) status.textContent = 'No se pudo iniciar el micrófono';
    resetVoiceButton();
  }
}

function stopVoiceTransaction() {
  const status = document.getElementById('voice-status');
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch (e) {}
  }
  if (status && status.textContent.indexOf('Escuchando') === 0) {
    status.textContent = 'Procesando...';
  }
}

function resetVoiceButton() {
  const btn = document.getElementById('btn-voice-tx');
  if (btn) {
    btn.classList.remove('listening');
    btn.innerHTML = '<i class="fas fa-microphone"></i> Mantener para hablar';
  }
  voiceHolding = false;
}

function parseVoiceCommand(text) {
  let original = (text || '').trim();
  let work = original.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\/\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Quitar muletillas al inicio
  work = work.replace(/^(por favor|registra|registrar|registre|anota|anotar|anote|agrega|agregar|carga|cargar|pon|poner|nuevo|nueva)\s+/g, '');
  work = work.replace(/^(un|una|el|la)\s+/g, '');
  original = original.replace(/^(por favor|registra|registrar|registre|anota|anotar|anote|agrega|agregar|carga|cargar)[\s,]+/i, '').trim();

  // --- Tipo ---
  let type = 'expense';
  if (/\b(ingreso|ingresos|ingresar|cobre|cobre|recib|salario|sueldo|me pagaron|deposito|me depositaron|transferencia recibida)\b/.test(work)) {
    type = 'income';
  }
  if (/\b(gasto|gastos|gaste|pague|pague|compra|compre|egreso|saque|pague|pago de)\b/.test(work)) {
    type = 'expense';
  }

  // --- Monto: "de 200.000", "por valor de 100000", "200 mil", etc. ---
  let amount = 0;
  if (typeof parseSpokenAmount === 'function') {
    amount = parseSpokenAmount(original);
  }
  // Patrones explícitos de monto en la frase
  const amountPatterns = [
    /(?:de|por valor de|por|monto de|importe de|suma de)\s+(\d{1,3}(?:[.\s]\d{3})+|\d{4,}|\d+)/i,
    /(\d{1,3}(?:[.\s]\d{3}){1,}|\d{5,})/
  ];
  if (!amount || amount < 100) {
    for (const re of amountPatterns) {
      const m = original.match(re) || work.match(re);
      if (m) {
        const v = parseFormattedNumber(m[1].replace(/\s/g, ''));
        if (v > amount) amount = v;
      }
    }
  }
  // "200 mil" / "1 millon"
  const milMatch = work.match(/\b(\d+)\s*mil\b/);
  if (milMatch) {
    const v = parseInt(milMatch[1], 10) * 1000;
    if (v > amount) amount = v;
  }

  // --- Cuenta ---
  let accountId = null;
  const accounts = accountsBankFirst();
  if (/\b(efectivo|cash|plata en mano|en mano|en efectivo)\b/.test(work)) {
    accountId = (accounts.find(a => a.type === 'cash') || accounts[0])?.id;
  } else if (/\b(tarjeta|credito|debito|card|con tarjeta)\b/.test(work)) {
    accountId = (accounts.find(a => a.type === 'card' || a.type === 'bank' || /tarjeta/i.test(a.name)) || accounts[0])?.id;
  } else {
    accountId = accounts[0]?.id;
  }

  // --- Fecha ---
  let dateStr = toLocalDateStr(new Date());
  const today = new Date();
  if (/\bhoy\b/.test(work)) {
    dateStr = toLocalDateStr(today);
  } else if (/\bayer\b/.test(work)) {
    const d = new Date(today); d.setDate(d.getDate() - 1);
    dateStr = toLocalDateStr(d);
  } else if (/\banteayer\b/.test(work)) {
    const d = new Date(today); d.setDate(d.getDate() - 2);
    dateStr = toLocalDateStr(d);
  } else {
    const months = {
      enero:0, febrero:1, marzo:2, abril:3, mayo:4, junio:5,
      julio:6, agosto:7, septiembre:8, setiembre:8, octubre:9,
      noviembre:10, diciembre:11
    };
    let m = work.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      let year = m[3] ? parseInt(m[3], 10) : today.getFullYear();
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) dateStr = toLocalDateStr(d);
    } else {
      m = work.match(/\b(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/);
      if (m) {
        const day = parseInt(m[1], 10);
        const month = months[m[2]];
        const d = new Date(today.getFullYear(), month, day);
        if (!isNaN(d.getTime())) dateStr = toLocalDateStr(d);
      }
    }
  }

  // --- Categoría (palabras clave naturales) ---
  const expenseKeywords = {
    'c1a': ['almuerzo', 'almorzar'],
    'c1b': ['cena', 'cenar'],
    'c1c': ['desayuno', 'merienda', 'cafe', 'cafeteria'],
    'c1d': ['super', 'supermercado', 'mercado'],
    'c1e': ['delivery', 'restaurante', 'pedido'],
    'c1': ['comida'],
    'c2a': ['combustible', 'nafta', 'gasolina', 'diesel'],
    'c2b': ['uber', 'taxi', 'remis'],
    'c2c': ['bus', 'pasaje', 'colectivo'],
    'c2d': ['mantenimiento', 'taller', 'mecanico'],
    'c2e': ['estacionamiento', 'peaje', 'parking'],
    'c2': ['transporte', 'viaje'],
    'c3a': ['alquiler', 'renta'],
    'c3': ['vivienda', 'hipoteca', 'casa', 'departamento'],
    'c4a': ['cine', 'netflix', 'streaming'],
    'c4b': ['salida', 'bar', 'fiesta'],
    'c4': ['ocio', 'entretenimiento', 'juego'],
    'c5a': ['farmacia', 'remedio', 'medicamento'],
    'c5b': ['medico', 'consulta', 'hospital'],
    'c5c': ['dentista'],
    'c5': ['salud'],
    'c6a': ['ropa'],
    'c6b': ['electronica', 'celular', 'telefono nuevo'],
    'c6': ['compra', 'compras', 'shopping', 'tienda'],
    'c7a': ['spotify', 'youtube', 'disney'],
    'c7b': ['software', 'app', 'apps'],
    'c7c': ['gimnasio', 'gym', 'club'],
    'c7': ['suscripcion'],
    'c8a': ['luz', 'ande'],
    'c8b': ['agua', 'essap'],
    'c8c': ['internet', 'telefono', 'celular plan'],
    'c8d': ['gas'],
    'c8': ['servicio', 'servicios'],
    'c14': ['deuda', 'cuota', 'prestamo'],
    'c15': ['ahorro', 'meta', 'guardar']
  };
  const incomeKeywords = {
    'c10': ['salario', 'sueldo', 'nomina', 'pago del mes', 'quincena'],
    'c11': ['freelance', 'cliente', 'proyecto', 'trabajo extra'],
    'c12': ['inversion', 'dividendo', 'interes', 'rendimiento'],
    'c13': ['regalo', 'extra', 'otro ingreso', 'aguinaldo']
  };

  let categoryId = type === 'income' ? 'c10' : 'c9';
  const map = type === 'income' ? incomeKeywords : expenseKeywords;
  for (const [id, words] of Object.entries(map)) {
    if (words.some(w => w.length > 2 && work.includes(w.replace(/\s/g,'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')) || work.includes(w))) {
      categoryId = id;
      break;
    }
  }
  // almuerzo/cena -> comida
  if (/\b(almuerzo|almorzar)\b/.test(work)) categoryId = 'c1a';
  else if (/\bcena|cenar\b/.test(work)) categoryId = 'c1b';
  else if (/\b(desayuno|merienda)\b/.test(work)) categoryId = 'c1c';

  // --- Nota / lugar / descripción ---
  // Prioridad: "en doña brigida", "por almuerzo en X", texto entre "en" y fin
  let note = '';
  const enLugar = original.match(/\ben\s+(.+?)(?:\s+(?:hoy|ayer|anteayer|con\s+tarjeta|con\s+efectivo|en\s+efectivo))?\s*$/i);
  const porConcepto = original.match(/\bpor\s+(.+?)(?:\s+en\s+|\s+hoy|\s+ayer|$)/i);

  if (enLugar && enLugar[1]) {
    note = enLugar[1].trim();
    // si también hay "por almuerzo", combinar
    if (porConcepto && porConcepto[1] && !note.toLowerCase().includes(porConcepto[1].toLowerCase().slice(0, 8))) {
      const concepto = porConcepto[1].replace(/\ben\s+.*/i, '').trim();
      if (concepto && concepto.length < 40) {
        note = concepto + ' - ' + note;
      }
    }
  } else if (porConcepto && porConcepto[1]) {
    note = porConcepto[1].replace(/\ben\s+/i, '').trim();
  }

  // Limpiar nota de basura residual
  if (note) {
    note = note
      .replace(/\b(con\s+)?(tarjeta|efectivo|cash)\b/gi, '')
      .replace(/\b(hoy|ayer|anteayer)\b/gi, '')
      .replace(/\b(por valor de|valor de)\b/gi, '')
      .replace(/\b\d{1,3}(?:[.\s]\d{3})+\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (!note || note.length < 2) {
    // Fallback: quitar palabras de comando y dejar resto
    note = original
      .replace(/\b(registra|registrar|registre|anota|anotar|agrega|agregar|un|una|el|la|gasto|gastos|ingreso|ingresos|compra|de|por valor de|por|monto|importe)\b/gi, ' ')
      .replace(/\b(efectivo|tarjeta|hoy|ayer|anteayer|con)\b/gi, ' ')
      .replace(/\b\d{1,3}(?:[.\s]\d{3})+\b/g, ' ')
      .replace(/\b\d+\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (note.length < 2) note = '';
  }

  // --- Aplicar al formulario ---
  const typeSeg = document.getElementById('type-seg');
  const amountInput = document.getElementById('tx-amount');
  const catSelect = document.getElementById('tx-category');
  const accSelect = document.getElementById('tx-account');
  const dateInput = document.getElementById('tx-date');
  const noteInput = document.getElementById('tx-note');

  if (typeSeg) {
    typeSeg.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.type === type);
    });
    const cats = data.categories.filter(c => c.type === type);
    if (catSelect) {
      catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  }

  if (amountInput && amount > 0) {
    amountInput.value = formatNumberInput(String(Math.round(amount)));
  }
  if (catSelect && categoryId) {
    if ([...catSelect.options].some(o => o.value === categoryId)) {
      catSelect.value = categoryId;
    }
  }
  if (accSelect && accountId) {
    if ([...accSelect.options].some(o => o.value === accountId)) {
      accSelect.value = accountId;
    }
  }
  if (dateInput && dateStr) {
    dateInput.value = dateStr;
  }
  if (noteInput && note) {
    noteInput.value = note;
  }

  const status = document.getElementById('voice-status');
  const cat = data.categories.find(c => c.id === categoryId);
  const acc = data.accounts.find(a => a.id === accountId);
  if (status) {
    status.textContent =
      (type === 'income' ? 'Ingreso' : 'Gasto') +
      (amount ? ' ' + formatMoney(amount) : '') +
      (acc ? ' · ' + acc.name : '') +
      (cat ? ' · ' + cat.name : '') +
      (note ? ' · "' + note + '"' : '') +
      (dateStr ? ' · ' + formatDate(dateStr) : '') +
      ' — revisá y guardá';
  }

  if (amount > 0) showToast('Datos cargados por voz');
  else showToast('No detecté el monto. Completá manualmente');
}


function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2200);
}

// ========== MEJORAS PROFESIONALES ==========
let lastDeleted = null;
let undoTimer = null;
let lastActivity = Date.now();

function touchActivity() {
  lastActivity = Date.now();
}

function setupProfessionalFeatures() {
  ['click', 'touchstart', 'keydown'].forEach(ev => {
    document.addEventListener(ev, touchActivity, { passive: true });
  });
  setInterval(() => {
    if (!data?.settings?.lockEnabled || !data?.settings?.pin) return;
    if (!isUnlocked) return;
    const mins = data.settings.autoLockMinutes || 5;
    if (mins > 0 && Date.now() - lastActivity > mins * 60 * 1000) {
      showLockScreen();
      showToast('Bloqueo por inactividad');
    }
  }, 15000);

  // Procesar recurrentes al iniciar
  processRecurringTransactions();

  // Onboarding desactivado
  if (data && data.settings && !data.settings.onboardingDone) {
    data.settings.onboardingDone = true;
    saveData(data);
  }
}

function showOnboarding() {
  openModal('Bienvenido a OscarMoney', `
    <p style="color:var(--text-secondary);margin-bottom:14px;font-size:0.9rem">
      En 3 pasos dejás la app lista para usar.
    </p>
    <div class="form-group">
      <label>Moneda principal</label>
      <select id="ob-currency" class="form-control">
        <option value="PYG" selected>Guaraníes (PYG)</option>
        <option value="USD">Dólares (USD)</option>
        <option value="EUR">Euros (EUR)</option>
        <option value="BRL">Reales (BRL)</option>
        <option value="ARS">Pesos ARS</option>
      </select>
    </div>
    <div class="form-group">
      <label>¿Cuál es tu ingreso mensual aproximado? (opcional)</label>
      <input type="text" id="ob-income" class="form-control" placeholder="0" inputmode="numeric" />
    </div>
    <button class="btn btn-primary" onclick="finishOnboarding()">Empezar a usar</button>
    <button class="btn btn-outline" style="margin-top:8px" onclick="finishOnboarding(true)">Saltar</button>
  `);
  setupAmountInput('ob-income');
}

function finishOnboarding(skip) {
  data.settings.onboardingDone = true;
  if (!skip) {
    const cur = document.getElementById('ob-currency')?.value;
    if (cur) data.settings.currency = cur;
    const inc = parseFormattedNumber(document.getElementById('ob-income')?.value || '0');
    if (inc > 0) {
      data.settings.estimatedIncome = inc;
      // primer ingreso opcional
      const acc = accountsBankFirst()[0];
      if (acc) {
        const tx = {
          id: uid(),
          type: 'income',
          amount: inc,
          categoryId: 'c10',
          accountId: acc.id,
          date: toLocalDateStr(new Date()),
          note: 'Ingreso inicial (onboarding)'
        };
        data.transactions.push(tx);
        acc.balance = (acc.balance || 0) + inc;
      }
    }
  }
  saveData(data);
  closeModal();
  showToast('¡Listo! Ya podés gestionar tu dinero');
  render();
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported || !Array.isArray(imported.transactions)) {
          showToast('Archivo inválido');
          return;
        }
        if (!confirm('Esto reemplazará tus datos actuales por el backup. ¿Continuar?')) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        data = loadData();
        showToast('Backup restaurado');
        render();
      } catch (err) {
        showToast('No se pudo leer el archivo');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}



function showUndoToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) { showToast(msg); return; }
  toast.innerHTML = `${msg} <button onclick="undoDelete()" style="margin-left:10px;background:#fff;color:#0f172a;border:none;border-radius:8px;padding:4px 10px;font-weight:700;cursor:pointer">Deshacer</button>`;
  toast.classList.remove('hidden');
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    toast.classList.add('hidden');
    lastDeleted = null;
  }, 5000);
}

function undoDelete() {
  if (!lastDeleted) return;
  const { tx } = lastDeleted;
  data.transactions.push(tx);
  const acc = data.accounts.find(a => a.id === tx.accountId);
  if (acc) {
    if (tx.type === 'income') acc.balance += tx.amount;
    else acc.balance -= tx.amount;
  }
  saveData(data);
  lastDeleted = null;
  clearTimeout(undoTimer);
  document.getElementById('toast')?.classList.add('hidden');
  showToast('Movimiento restaurado');
  render();
}

function processRecurringTransactions() {
  if (!data.recurring || !data.recurring.length) return;
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  let created = 0;
  data.recurring.forEach(r => {
    if (!r.active) return;
    if (!r.nextDate || r.nextDate > todayStr) return;
    // crear movimiento
    const acc = data.accounts.find(a => a.id === r.accountId) || data.accounts[0];
    if (!acc) return;
    const tx = {
      id: uid(),
      type: r.type,
      amount: r.amount,
      categoryId: r.categoryId,
      accountId: acc.id,
      date: r.nextDate,
      note: (r.note || r.name || 'Recurrente') + ' (auto)'
    };
    data.transactions.push(tx);
    if (r.type === 'income') acc.balance += r.amount;
    else acc.balance -= r.amount;
    // avanzar nextDate
    const d = new Date(r.nextDate + 'T12:00:00');
    if (r.frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (r.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1); // monthly default
    r.nextDate = toLocalDateStr(d);
    created++;
  });
  if (created > 0) {
    saveData(data);
    showToast(created + ' movimiento(s) recurrente(s) generado(s)');
  }
}

function openRecurringPage() {
  setTitle('Recurrentes');
  const el = document.getElementById('main-content');
  const list = data.recurring || [];
  el.innerHTML = `
    <button class="btn btn-primary" style="margin-bottom:14px" onclick="openAddRecurring()">
      <i class="fas fa-plus"></i> Nuevo recurrente
    </button>
    ${list.length === 0 ? `
      <div class="empty-state">
        <i class="fas fa-redo"></i>
        <p>Sin movimientos recurrentes</p>
        <button class="btn btn-outline" style="margin-top:10px" onclick="openAddRecurring()">Crear salario o alquiler</button>
      </div>
    ` : list.map(r => {
      const cat = data.categories.find(c => c.id === r.categoryId);
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>${r.name || cat?.name || 'Recurrente'}</strong>
              <div style="font-size:0.8rem;color:var(--text-secondary)">
                ${r.type === 'income' ? 'Ingreso' : 'Gasto'} · ${r.frequency === 'weekly' ? 'Semanal' : r.frequency === 'yearly' ? 'Anual' : 'Mensual'}
                · Próximo: ${r.nextDate ? formatDate(r.nextDate) : '—'}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:${r.type==='income'?'var(--success)':'var(--danger)'}">${formatMoney(r.amount)}</div>
              <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px">
                <button class="chip" onclick="openEditRecurring('${r.id}')">Editar</button>
                <button class="chip" style="color:var(--danger)" onclick="deleteRecurring('${r.id}')">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
    <button class="btn btn-outline" style="margin-top:12px" onclick="currentPage='more';render()">← Volver</button>
  `;
}

function openAddRecurring() {
  const expenseCats = mainCategories('expense');
  openModal('Nuevo recurrente', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="rec-name" class="form-control" placeholder="Ej: Salario / Alquiler / Netflix" />
    </div>
    <div class="form-group">
      <label>Tipo</label>
      <select id="rec-type" class="form-control">
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
      </select>
    </div>
    <div class="form-group">
      <label>Monto</label>
      <input type="text" id="rec-amount" class="form-control" inputmode="numeric" placeholder="0" />
    </div>
    <div class="form-group">
      <label>Categoría</label>
      <select id="rec-cat" class="form-control">
        ${data.categories.map(c => `<option value="${c.id}">${c.name} (${c.type === 'income' ? 'Ingreso' : 'Gasto'})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Cuenta</label>
      <select id="rec-acc" class="form-control">
        ${accountsBankFirst().map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Frecuencia</label>
      <select id="rec-freq" class="form-control">
        <option value="monthly">Mensual</option>
        <option value="weekly">Semanal</option>
        <option value="yearly">Anual</option>
      </select>
    </div>
    <div class="form-group">
      <label>Próxima fecha</label>
      <input type="date" id="rec-next" class="form-control" value="${toLocalDateStr(new Date())}" />
    </div>
    <div class="form-group">
      <label>Nota</label>
      <input type="text" id="rec-note" class="form-control" placeholder="Opcional" />
    </div>
    <button class="btn btn-primary" onclick="saveRecurring()">Guardar</button>
  `);
  setupAmountInput('rec-amount');
}

function saveRecurring() {
  const name = document.getElementById('rec-name').value.trim();
  const type = document.getElementById('rec-type').value;
  const amount = parseFormattedNumber(document.getElementById('rec-amount').value);
  const categoryId = document.getElementById('rec-cat').value;
  const accountId = document.getElementById('rec-acc').value;
  const frequency = document.getElementById('rec-freq').value;
  const nextDate = document.getElementById('rec-next').value;
  const note = document.getElementById('rec-note').value.trim();
  if (!name || !amount || amount <= 0 || !nextDate) { showToast('Completa nombre, monto y fecha'); return; }
  if (!data.recurring) data.recurring = [];
  data.recurring.push({
    id: uid(), name, type, amount, categoryId, accountId, frequency, nextDate, note, active: true
  });
  saveData(data);
  closeModal();
  showToast('Recurrente creado');
  openRecurringPage();
}

function deleteRecurring(id) {
  if (!confirm('¿Eliminar este recurrente?')) return;
  data.recurring = (data.recurring || []).filter(r => r.id !== id);
  saveData(data);
  try { closeModal(); } catch (e) {}
  showToast('Recurrente eliminado');
  openRecurringPage();
}

function openTemplatesPage() {
  setTitle('Plantillas');
  const el = document.getElementById('main-content');
  const list = data.templates || [];
  el.innerHTML = `
    <button class="btn btn-primary" style="margin-bottom:14px" onclick="openAddTemplate()">
      <i class="fas fa-plus"></i> Nueva plantilla
    </button>
    ${list.length === 0 ? `
      <div class="empty-state">
        <i class="fas fa-bookmark"></i>
        <p>Sin plantillas. Creá atajos como "Almuerzo" o "Uber".</p>
      </div>
    ` : list.map(t => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${t.name}</strong>
          <div style="font-size:0.8rem;color:var(--text-secondary)">${t.type === 'income' ? 'Ingreso' : 'Gasto'} · ${formatMoney(t.amount)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="chip" onclick="useTemplate('${t.id}')">Usar</button>
          <button class="chip" onclick="deleteTemplate('${t.id}')">X</button>
        </div>
      </div>
    `).join('')}
    <button class="btn btn-outline" style="margin-top:12px" onclick="currentPage='more';render()">← Volver</button>
  `;
}

function openAddTemplate() {
  openModal('Nueva plantilla', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="tpl-name" class="form-control" placeholder="Ej: Almuerzo típico" />
    </div>
    <div class="form-group">
      <label>Tipo</label>
      <select id="tpl-type" class="form-control">
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
      </select>
    </div>
    <div class="form-group">
      <label>Monto</label>
      <input type="text" id="tpl-amount" class="form-control" inputmode="numeric" />
    </div>
    <div class="form-group">
      <label>Categoría</label>
      <select id="tpl-cat" class="form-control">
        ${data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Cuenta</label>
      <select id="tpl-acc" class="form-control">
        ${accountsBankFirst().map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Nota</label>
      <input type="text" id="tpl-note" class="form-control" />
    </div>
    <button class="btn btn-primary" onclick="saveTemplate()">Guardar plantilla</button>
  `);
  setupAmountInput('tpl-amount');
}

function saveTemplate() {
  const name = document.getElementById('tpl-name').value.trim();
  const type = document.getElementById('tpl-type').value;
  const amount = parseFormattedNumber(document.getElementById('tpl-amount').value);
  const categoryId = document.getElementById('tpl-cat').value;
  const accountId = document.getElementById('tpl-acc').value;
  const note = document.getElementById('tpl-note').value.trim();
  if (!name || !amount) { showToast('Completa nombre y monto'); return; }
  if (!data.templates) data.templates = [];
  data.templates.push({ id: uid(), name, type, amount, categoryId, accountId, note });
  saveData(data);
  closeModal();
  showToast('Plantilla guardada');
  openTemplatesPage();
}

function useTemplate(id) {
  const t = (data.templates || []).find(x => x.id === id);
  if (!t) return;
  openAddTransaction();
  setTimeout(() => {
    const typeSeg = document.getElementById('type-seg');
    typeSeg?.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.type === t.type));
    const cats = data.categories.filter(c => c.type === t.type);
    const catSelect = document.getElementById('tx-category');
    if (catSelect) catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (document.getElementById('tx-amount')) document.getElementById('tx-amount').value = formatNumberInput(String(t.amount));
    if (catSelect) catSelect.value = t.categoryId;
    const acc = document.getElementById('tx-account');
    if (acc) acc.value = t.accountId;
    if (document.getElementById('tx-note')) document.getElementById('tx-note').value = t.note || t.name;
  }, 200);
}

function deleteTemplate(id) {
  data.templates = (data.templates || []).filter(t => t.id !== id);
  saveData(data);
  openTemplatesPage();
}

function exportMonthReport() {
  const now = new Date();
  const monthTx = data.transactions.filter(t => isSameMonth(t.date, now));
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balanceMes = income - expense;
  const prev = getMonthTotals(-1);
  const totalBalance = data.accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const fmt = (n) => {
    const num = Number(n) || 0;
    return num.toLocaleString('es-PY', { maximumFractionDigits: 0 });
  };

  const byCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    const n = data.categories.find(c => c.id === t.categoryId)?.name || 'Otros';
    byCat[n] = (byCat[n] || 0) + t.amount;
  });
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries.length ? catEntries[0][1] : 1;

  const byAcc = {};
  monthTx.forEach(t => {
    const n = data.accounts.find(a => a.id === t.accountId)?.name || 'Sin cuenta';
    if (!byAcc[n]) byAcc[n] = { income: 0, expense: 0 };
    if (t.type === 'income') byAcc[n].income += t.amount;
    else byAcc[n].expense += t.amount;
  });

  // Flujo de caja / proyecciones
  const estimatedIncome = data.settings?.estimatedIncome || 0;
  const pendingIncome = Math.max(0, estimatedIncome - income);
  const activeDebts = (data.debts || []).filter(d => d.paid < d.total);
  const monthlyDebtPayments = activeDebts.reduce((s, d) => {
    const cuotas = d.cuotas || 1;
    const cuotasPagadas = d.cuotasPagadas || 0;
    if (cuotasPagadas >= cuotas) return s;
    return s + (d.cuotaMonto || Math.round(d.total / cuotas));
  }, 0);
  const totalDebtRemaining = activeDebts.reduce((s, d) => s + (d.total - d.paid), 0);
  const fixedMonthly = activeDebts.filter(d => d.esFijo).reduce((s, d) => s + (d.cuotaMonto || Math.round(d.total / (d.cuotas || 1))), 0);
  const afterEstimated = totalBalance + pendingIncome;
  const afterCuotas = afterEstimated - monthlyDebtPayments;
  const afterFixed = afterEstimated - fixedMonthly;
  const afterAllDebts = afterEstimated - totalDebtRemaining;
  const activeGoals = (data.goals || []).filter(g => g.current < g.target);
  const totalGoalsRemaining = activeGoals.reduce((s, g) => s + (g.target - g.current), 0);
  const availableToSave = Math.max(0, afterCuotas);

  // ----- CSV -----
  const sep = ';';
  const lines = [];
  const esc = (v) => {
    const s = String(v ?? '');
    if (s.includes(sep) || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const row = (...cols) => lines.push(cols.map(esc).join(sep));

  row('OscarMoney - Reporte mensual');
  row('Mes', monthName(now.getMonth()) + ' ' + now.getFullYear());
  row('Generado', toLocalDateStr(now));
  row('Moneda', data.settings?.currency || 'PYG');
  row('');
  row('RESUMEN');
  row('Concepto', 'Monto');
  row('Ingresos del mes', fmt(income));
  row('Gastos del mes', fmt(expense));
  row('Balance del mes', fmt(balanceMes));
  row('Saldo actual total', fmt(totalBalance));
  row('Ingresos mes anterior (' + prev.label + ')', fmt(prev.income));
  row('Gastos mes anterior (' + prev.label + ')', fmt(prev.expense));
  row('Variacion ingresos', fmt(income - prev.income));
  row('Variacion gastos', fmt(expense - prev.expense));
  row('');
  row('FLUJO DE CAJA / PROYECCIONES');
  row('Concepto', 'Monto');
  row('Ingreso estimado del mes', fmt(estimatedIncome));
  row('Ingreso pendiente de cobrar', fmt(pendingIncome));
  row('Cuotas de deudas del mes', fmt(monthlyDebtPayments));
  row('Gastos fijos mensuales', fmt(fixedMonthly));
  row('Total deudas restantes', fmt(totalDebtRemaining));
  row('Saldo + ingreso pendiente', fmt(afterEstimated));
  row('Despues de pagar cuotas del mes', fmt(afterCuotas));
  row('Despues de gastos fijos', fmt(afterFixed));
  row('Si liquidaras todas las deudas', fmt(afterAllDebts));
  row('Disponible para ahorrar', fmt(availableToSave));
  row('Faltante en metas de ahorro', fmt(totalGoalsRemaining));
  row('');
  row('GASTOS POR CATEGORIA');
  row('Categoria', 'Monto', '% del gasto');
  catEntries.forEach(([k, v]) => {
    const pct = expense > 0 ? Math.round((v / expense) * 1000) / 10 : 0;
    row(k, fmt(v), pct + '%');
  });
  row('');
  row('POR CUENTA');
  row('Cuenta', 'Ingresos', 'Gastos', 'Neto');
  Object.entries(byAcc).forEach(([k, v]) => row(k, fmt(v.income), fmt(v.expense), fmt(v.income - v.expense)));
  row('');
  row('SALDOS ACTUALES');
  row('Cuenta', 'Saldo');
  data.accounts.forEach(a => row(a.name, fmt(a.balance)));
  row('Total', fmt(totalBalance));
  row('');
  if (activeDebts.length) {
    row('DEUDAS');
    row('Nombre', 'Total', 'Pagado', 'Restante', 'Cuotas', 'Proximo vencimiento');
    activeDebts.forEach(d => row(d.name, fmt(d.total), fmt(d.paid), fmt(d.total - d.paid), (d.cuotasPagadas || 0) + '/' + (d.cuotas || 1), d.fecha || ''));
    row('');
  }
  if (activeGoals.length) {
    row('METAS DE AHORRO');
    row('Nombre', 'Objetivo', 'Actual', 'Faltante', 'Fecha limite');
    activeGoals.forEach(g => row(g.name, fmt(g.target), fmt(g.current), fmt(g.target - g.current), g.deadline || ''));
    row('');
  }
  row('DETALLE DE MOVIMIENTOS');
  row('Fecha', 'Tipo', 'Categoria', 'Cuenta', 'Monto', 'Nota');
  monthTx.sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(t => {
    row(t.date, t.type === 'income' ? 'Ingreso' : 'Gasto',
      data.categories.find(c => c.id === t.categoryId)?.name || '',
      data.accounts.find(a => a.id === t.accountId)?.name || '',
      fmt(t.amount), t.note || '');
  });

  const csv = '\uFEFF' + lines.join('\n');
  const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const csvUrl = URL.createObjectURL(csvBlob);
  const csvA = document.createElement('a');
  csvA.href = csvUrl;
  csvA.download = 'OscarMoney_' + monthName(now.getMonth()) + '_' + now.getFullYear() + '.csv';
  csvA.click();
  URL.revokeObjectURL(csvUrl);

  // ----- HTML con graficos -----
  const barsCat = catEntries.map(([name, val]) => {
    const pct = maxCat > 0 ? Math.round((val / maxCat) * 100) : 0;
    return `<div class="bar-row"><div class="bar-label">${name}</div><div class="bar-track"><div class="bar-fill exp" style="width:${pct}%"></div></div><div class="bar-val">${fmt(val)}</div></div>`;
  }).join('');

  const maxIE = Math.max(income, expense, prev.income, prev.expense, 1);
  const barIE = (val, cls) => {
    const pct = Math.round((val / maxIE) * 100);
    return `<div class="bar-row"><div class="bar-label">${cls}</div><div class="bar-track"><div class="bar-fill ${cls === 'Ingresos' || cls.indexOf('Ing') === 0 ? 'inc' : 'exp'}" style="width:${pct}%"></div></div><div class="bar-val">${fmt(val)}</div></div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Reporte OscarMoney - ${monthName(now.getMonth())} ${now.getFullYear()}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;background:#f1f5f9;color:#0f172a}
  h1{font-size:1.4rem;margin:0 0 4px} h2{font-size:1.1rem;margin:28px 0 12px;color:#1e293b}
  .sub{color:#64748b;font-size:0.9rem;margin-bottom:20px}
  .card{background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .kpi{font-size:0.8rem;color:#64748b} .kpi b{display:block;font-size:1.15rem;color:#0f172a;margin-top:4px}
  .pos{color:#16a34a!important} .neg{color:#dc2626!important}
  .bar-row{display:grid;grid-template-columns:100px 1fr 90px;gap:8px;align-items:center;margin:6px 0;font-size:0.85rem}
  .bar-track{height:12px;background:#e2e8f0;border-radius:99px;overflow:hidden}
  .bar-fill{height:100%;border-radius:99px}
  .bar-fill.inc{background:#22c55e} .bar-fill.exp{background:#3b82f6}
  .bar-val{text-align:right;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:0.85rem}
  th,td{padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:left}
  th{color:#64748b;font-weight:600}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  @media print{body{background:#fff;padding:12px} .card{box-shadow:none;border:1px solid #e2e8f0}}
</style></head><body>
  <h1>OscarMoney — Reporte</h1>
  <div class="sub">${monthName(now.getMonth())} ${now.getFullYear()} · Generado ${toLocalDateStr(now)} · ${data.settings?.currency || 'PYG'}</div>

  <div class="card grid">
    <div class="kpi">Ingresos<br><b class="pos">${fmt(income)}</b></div>
    <div class="kpi">Gastos<br><b class="neg">${fmt(expense)}</b></div>
    <div class="kpi">Balance del mes<br><b class="${balanceMes>=0?'pos':'neg'}">${fmt(balanceMes)}</b></div>
    <div class="kpi">Saldo actual<br><b>${fmt(totalBalance)}</b></div>
  </div>

  <h2>Comparación mensual</h2>
  <div class="card">
    ${barIE(income, 'Ingresos ' + monthName(now.getMonth()).slice(0,3))}
    ${barIE(prev.income, 'Ingresos ' + prev.label.slice(0,3))}
    ${barIE(expense, 'Gastos ' + monthName(now.getMonth()).slice(0,3))}
    ${barIE(prev.expense, 'Gastos ' + prev.label.slice(0,3))}
  </div>

  <h2>Gastos por categoría</h2>
  <div class="card">${barsCat || '<p>Sin gastos este mes</p>'}</div>

  <h2>Flujo de caja / proyecciones</h2>
  <div class="card">
    <table>
      <tr><td>Ingreso estimado del mes</td><td class="num">${fmt(estimatedIncome)}</td></tr>
      <tr><td>Ingreso pendiente de cobrar</td><td class="num">${fmt(pendingIncome)}</td></tr>
      <tr><td>Cuotas de deudas (mes)</td><td class="num neg">${fmt(monthlyDebtPayments)}</td></tr>
      <tr><td>Gastos fijos mensuales</td><td class="num neg">${fmt(fixedMonthly)}</td></tr>
      <tr><td><strong>Saldo + ingreso pendiente</strong></td><td class="num"><strong>${fmt(afterEstimated)}</strong></td></tr>
      <tr><td><strong>Después de cuotas del mes</strong></td><td class="num"><strong class="${afterCuotas>=0?'pos':'neg'}">${fmt(afterCuotas)}</strong></td></tr>
      <tr><td>Después de gastos fijos</td><td class="num ${afterFixed>=0?'pos':'neg'}">${fmt(afterFixed)}</td></tr>
      <tr><td>Si liquidaras todas las deudas</td><td class="num ${afterAllDebts>=0?'pos':'neg'}">${fmt(afterAllDebts)}</td></tr>
      <tr><td>Disponible para ahorrar</td><td class="num pos">${fmt(availableToSave)}</td></tr>
      <tr><td>Faltante en metas</td><td class="num">${fmt(totalGoalsRemaining)}</td></tr>
    </table>
  </div>

  <h2>Saldos por cuenta</h2>
  <div class="card"><table><tr><th>Cuenta</th><th class="num">Saldo</th></tr>
    ${data.accounts.map(a => `<tr><td>${a.name}</td><td class="num">${fmt(a.balance)}</td></tr>`).join('')}
    <tr><td><strong>Total</strong></td><td class="num"><strong>${fmt(totalBalance)}</strong></td></tr>
  </table></div>

  ${activeDebts.length ? `<h2>Deudas</h2><div class="card"><table><tr><th>Nombre</th><th class="num">Restante</th><th>Vence</th></tr>
    ${activeDebts.map(d => `<tr><td>${d.name}</td><td class="num">${fmt(d.total - d.paid)}</td><td>${d.fecha || '—'}</td></tr>`).join('')}
  </table></div>` : ''}

  <p class="sub">También se descargó el archivo CSV con el mismo detalle (números con separador de miles).</p>
</body></html>`;

  const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const htmlUrl = URL.createObjectURL(htmlBlob);
  const htmlA = document.createElement('a');
  htmlA.href = htmlUrl;
  htmlA.download = 'OscarMoney_Reporte_' + monthName(now.getMonth()) + '_' + now.getFullYear() + '.html';
  htmlA.click();
  URL.revokeObjectURL(htmlUrl);

  showToast('Reporte CSV + HTML con gráficos descargados');
}

function getMonthTotals(offsetMonths) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const tx = data.transactions.filter(t => isSameMonth(t.date, d));
  return {
    income: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    label: monthName(d.getMonth())
  };
}
