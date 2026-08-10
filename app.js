const SUPABASE_URL = 'https://aoznychtuxqstwclzfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvem55Y2h0dXhxc3R3Y2x6ZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDEzMzEsImV4cCI6MjEwMTkxNzMzMX0.tEHKGLiDsU_AQ69l-URFXvRhcvkKlWf-y0i_16OEF3g';

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${currentSession}`
});

let currentSession = null;

// ─── AUTH ───────────────────────────────────────────

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (data.access_token) {
    currentSession = data.access_token;
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-app').classList.remove('hidden');
    chargerTrades();
  } else {
    errEl.textContent = 'Email ou mot de passe incorrect.';
    errEl.classList.remove('hidden');
  }
}

function logout() {
  currentSession = null;
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
}

// ─── TRADES PERP ────────────────────────────────────

async function chargerTrades() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trades_perp?order=date_ouverture.desc&select=*`,
    { headers: headers() }
  );
  const trades = await res.json();
  renderTrades(trades);
}

function renderTrades(trades) {
  // Récap global
  const totalPnl = trades.reduce((s, t) => s + (t.pnl_usd || 0), 0);
  const positifs = trades.filter(t => t.pnl_usd > 0).length;
  document.getElementById('total-pnl').textContent = formatPnl(totalPnl);
  document.getElementById('total-pnl').className = `value ${totalPnl >= 0 ? 'pos' : 'neg'}`;
  document.getElementById('total-trades').textContent = trades.length;
  document.getElementById('taux-reussite').textContent =
    trades.length ? Math.round((positifs / trades.length) * 100) + ' %' : '—';

  // Grouper par mois
  const parMois = {};
  trades.forEach(t => {
    const mois = t.date_ouverture.slice(0, 7); // 'YYYY-MM'
    if (!parMois[mois]) parMois[mois] = [];
    parMois[mois].push(t);
  });

  const container = document.getElementById('trades-par-mois');
  container.innerHTML = '';

  Object.keys(parMois).sort().reverse().forEach(mois => {
    const liste = parMois[mois];
    const totalMois = liste.reduce((s, t) => s + (t.pnl_usd || 0), 0);

    const bloc = document.createElement('div');
    bloc.className = 'mois-bloc';
    bloc.innerHTML = `
      <div class="mois-titre">
        <span>${formatMois(mois)}</span>
        <span class="mois-total ${totalMois >= 0 ? 'pos' : 'neg'}">${formatPnl(totalMois)}</span>
      </div>
      <table class="trades-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Paire</th>
            <th>Entrée</th>
            <th>Sortie</th>
            <th>PnL</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${liste.map(t => `
            <tr>
              <td>${formatDate(t.date_ouverture)}</td>
              <td>${t.paire}</td>
              <td>${t.montant_entree.toFixed(2)} $</td>
              <td>${t.montant_sortie ? t.montant_sortie.toFixed(2) + ' $' : '—'}</td>
              <td class="${t.pnl_usd >= 0 ? 'pos' : 'neg'}">${formatPnl(t.pnl_usd)}</td>
              <td class="${t.pnl_pct >= 0 ? 'pos' : 'neg'}">${t.pnl_pct ? t.pnl_pct.toFixed(2) + ' %' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.appendChild(bloc);
  });
}

// ─── NAVIGATION ─────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.remove('hidden');
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// ─── UTILS ──────────────────────────────────────────

function formatPnl(val) {
  if (val == null) return '—';
  const sign = val >= 0 ? '+' : '';
  return sign + val.toFixed(2) + ' $';
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatMois(str) {
  const [y, m] = str.split('-');
  const noms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  return noms[parseInt(m) - 1] + ' ' + y;
}

// ─── INIT ────────────────────────────────────────────

document.getElementById('btn-login').addEventListener('click', login);
document.getElementById('btn-logout').addEventListener('click', logout);
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
