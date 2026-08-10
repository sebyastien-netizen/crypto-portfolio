const SUPABASE_URL = 'https://aoznychtuxqstwclzfxj.supabase.co';
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
document.getElementById('btn-add-spot').addEventListener('click', ajouterSpot);
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
    if (btn.dataset.tab === 'spot') chargerSpot();
  });
});
// ─── SPOT PORTFOLIO ──────────────────────────────────

async function chargerSpot() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/spot_positions?order=token.asc&select=*`,
    { headers: headers() }
  );
  const positions = await res.json();
  await renderSpot(positions);
}

async function renderSpot(positions) {
  document.getElementById('spot-count').textContent = positions.length;

  if (!positions.length) {
    document.getElementById('spot-par-wallet').innerHTML =
      '<p class="empty">Aucune position enregistrée.</p>';
    document.getElementById('spot-total').textContent = '—';
    return;
  }

  // Récupérer les prix CoinGecko
  const ids = [...new Set(positions.map(p => p.coingecko_id).filter(Boolean))];
  let prix = {};
  if (ids.length) {
    try {
      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
      );
      prix = await cgRes.json();
    } catch (e) {
      console.error('CoinGecko indisponible', e);
    }
  }

  // Grouper par wallet
  const walletNoms = {
    'kraken-seb': 'Kraken',
    'rabby-seb': 'Rabby Wallet',
    'pionex-seb': 'Pionex'
  };

  const parWallet = {};
  positions.forEach(p => {
    if (!parWallet[p.wallet_id]) parWallet[p.wallet_id] = [];
    parWallet[p.wallet_id].push(p);
  });

  let totalGlobal = 0;
  const container = document.getElementById('spot-par-wallet');
  container.innerHTML = '';

  Object.keys(parWallet).forEach(walletId => {
    const liste = parWallet[walletId];
    let totalWallet = 0;

    const lignes = liste.map(p => {
      const prixUnit = prix[p.coingecko_id]?.usd || null;
      const valeur = prixUnit ? prixUnit * p.quantite : null;
      if (valeur) totalWallet += valeur;

      return `
        <tr>
          <td><strong>${p.token.toUpperCase()}</strong></td>
          <td>${p.quantite}</td>
          <td>${prixUnit ? prixUnit.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' }) : '<span class="prix-loading">—</span>'}</td>
          <td>${valeur ? valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' }) : '—'}</td>
          <td>
            <button class="btn-delete" data-id="${p.id}" onclick="supprimerSpot('${p.id}')">🗑</button>
          </td>
        </tr>
      `;
    }).join('');

    totalGlobal += totalWallet;

    const bloc = document.createElement('div');
    bloc.className = 'wallet-bloc';
    bloc.innerHTML = `
      <div class="wallet-titre">
        <span>${walletNoms[walletId] || walletId}</span>
        <span class="wallet-total">${totalWallet ? totalWallet.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' }) : '—'}</span>
      </div>
      <table class="spot-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Quantité</th>
            <th>Prix</th>
            <th>Valeur</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${lignes}</tbody>
      </table>
    `;
    container.appendChild(bloc);
  });

  document.getElementById('spot-total').textContent =
    totalGlobal.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });
}

// Dictionnaire tokens courants → ID CoinGecko
const COINGECKO_IDS = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
  'BNB': 'binancecoin', 'XRP': 'ripple', 'ADA': 'cardano',
  'AVAX': 'avalanche-2', 'DOT': 'polkadot', 'MATIC': 'matic-network',
  'LINK': 'chainlink', 'UNI': 'uniswap', 'AAVE': 'aave',
  'HYPE': 'hyperliquid', 'LTC': 'litecoin', 'ATOM': 'cosmos',
  'NEAR': 'near', 'OP': 'optimism', 'ARB': 'arbitrum',
  'PEPE': 'pepe', 'WIF': 'dogwifcoin', 'BONK': 'bonk',
  'USDT': 'tether', 'USDC': 'usd-coin', 'DAI': 'dai'
};

async function ajouterSpot() {
  const wallet_id = document.getElementById('spot-wallet').value;
  const token = document.getElementById('spot-token').value.trim().toUpperCase();
  const quantite = parseFloat(document.getElementById('spot-quantite').value);

  if (!token || !quantite || isNaN(quantite)) {
    alert('Token et quantité requis.');
    return;
  }

  // ID CoinGecko auto depuis le dictionnaire, sinon champ manuel
  let coingecko_id = document.getElementById('spot-coingecko').value.trim().toLowerCase();
  if (!coingecko_id && COINGECKO_IDS[token]) {
    coingecko_id = COINGECKO_IDS[token];
  }

  const id = 'spot-' + Date.now();
  const body = {
    id,
    user_id: 'a494d43c-a915-4f34-875c-2b0ebd84d5fb',
    wallet_id,
    token,
    coingecko_id: coingecko_id || null,
    quantite
  };

  await fetch(`${SUPABASE_URL}/rest/v1/spot_positions`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });

  document.getElementById('spot-token').value = '';
  document.getElementById('spot-coingecko').value = '';
  document.getElementById('spot-quantite').value = '';

  chargerSpot();
}

async function supprimerSpot(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/spot_positions?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers()
  });
  chargerSpot();
}
