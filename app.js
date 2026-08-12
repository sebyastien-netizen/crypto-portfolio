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
  console.log('login response:', data);

  if (data.access_token) {
    currentSession = data.access_token;
    localStorage.setItem('cp_token', data.access_token);
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
  localStorage.removeItem('cp_token');
}

// ─── TRADES PERP ────────────────────────────────────

async function chargerTrades() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trades_perp?order=date_ouverture.desc&select=*`,
    { headers: headers() }
  );
  const trades = await res.json();

  // Si token expiré → retour login
  if (!Array.isArray(trades)) {
    localStorage.removeItem('cp_token');
    currentSession = null;
    document.getElementById('screen-app').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    return;
  }
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
document.getElementById('btn-add-tx').addEventListener('click', ajouterTransaction);
document.getElementById('btn-add-perp').addEventListener('click', ajouterTradePerp);
document.getElementById('btn-scanner-refresh').addEventListener('click', chargerScanner);
document.getElementById('btn-snapshot').addEventListener('click', prendreSnapshot);
document.getElementById('journal-filtre-token').addEventListener('change', chargerJournal);
document.getElementById('journal-filtre-score').addEventListener('change', chargerJournal);
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
    if (btn.dataset.tab === 'dashboard') chargerDashboard();
    if (btn.dataset.tab === 'scanner') chargerScanner();
    if (btn.dataset.tab === 'journal') chargerJournal();
    if (btn.dataset.tab === 'spot') chargerSpot();
    if (btn.dataset.tab === 'bots') chargerBots();
    if (btn.dataset.tab === 'pools') chargerPools();
    if (btn.dataset.tab === 'positions') chargerStaking();
  });
});

// Rafraîchissement automatique des bots toutes les 60 secondes
setInterval(() => {
  const tabBots = document.getElementById('tab-bots');
  if (tabBots && !tabBots.classList.contains('hidden')) {
    chargerBots();
  }
}, 60000);
// Restaurer la session au chargement
const savedToken = localStorage.getItem('cp_token');
if (savedToken) {
  currentSession = savedToken;
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  chargerDashboard();
  chargerTrades();
}
// ─── SPOT PORTFOLIO ──────────────────────────────────

async function chargerSpot() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/spot_positions?order=token.asc&select=*`,
    { headers: headers() }
  );
  const positions = await res.json();
  if (!Array.isArray(positions)) return;
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
        `/api/coingecko?endpoint=${encodeURIComponent(`simple/price?ids=${ids.join(',')}&vs_currencies=usd`)}`
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
// ─── STAKING / LENDING ───────────────────────────────

async function chargerStaking() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/positions_passives?statut=eq.actif&order=protocole.asc&select=*`,
    { headers: headers() }
  );
  const positions = await res.json();
  if (!Array.isArray(positions)) return;
  await renderStaking(positions);
}

async function renderStaking(positions) {
  document.getElementById('staking-count').textContent = positions.length;

  if (!positions.length) {
    document.getElementById('staking-par-protocole').innerHTML =
      '<p class="empty">Aucune position active.</p>';
    document.getElementById('staking-total').textContent = '—';
    return;
  }

  // Récupérer prix CoinGecko pour les tokens stakés
  const ids = [...new Set(positions.map(p => COINGECKO_IDS[p.token]).filter(Boolean))];
  let prix = {};
  if (ids.length) {
    try {
const cgRes = await fetch(
        `/api/coingecko?endpoint=${encodeURIComponent(`simple/price?ids=${ids.join(',')}&vs_currencies=usd`)}`
      );
      prix = await cgRes.json();
    } catch (e) {
      console.error('CoinGecko indisponible', e);
    }
  }

  // Grouper par protocole
  const parProtocole = {};
  positions.forEach(p => {
    if (!parProtocole[p.protocole]) parProtocole[p.protocole] = [];
    parProtocole[p.protocole].push(p);
  });

  let totalGlobal = 0;
  const container = document.getElementById('staking-par-protocole');
  container.innerHTML = '';

  Object.keys(parProtocole).sort().forEach(protocole => {
    const liste = parProtocole[protocole];
    let totalProtocole = 0;

    const lignes = liste.map(p => {
      const cgId = COINGECKO_IDS[p.token];
      const prixUnit = cgId ? prix[cgId]?.usd : null;
      const valeur = prixUnit ? prixUnit * p.montant_depose : null;
      if (valeur) totalProtocole += valeur;

      return `
        <tr>
          <td><strong>${p.token}</strong></td>
          <td>${p.montant_depose}</td>
          <td>${prixUnit ? prixUnit.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' }) : '—'}</td>
          <td>${valeur ? valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' }) : '—'}</td>
          <td><span class="badge-staking">🔒 ${p.type}</span></td>
          <td style="color:#718096;font-size:0.8rem">${p.notes || ''}</td>
        </tr>
      `;
    }).join('');

    totalGlobal += totalProtocole;

    const bloc = document.createElement('div');
    bloc.className = 'protocole-bloc';
    bloc.innerHTML = `
      <div class="protocole-titre">
        <span>${protocole}</span>
        <span>${totalProtocole ? totalProtocole.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' }) : '—'}</span>
      </div>
      <table class="staking-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Quantité stakée</th>
            <th>Prix</th>
            <th>Valeur</th>
            <th>Type</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>${lignes}</tbody>
      </table>
    `;
    container.appendChild(bloc);
  });

  document.getElementById('staking-total').textContent =
    totalGlobal.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });
}
// ─── BOTS PIONEX ─────────────────────────────────────

async function chargerBots() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bots_pionex?order=nom.asc&select=*`,
    { headers: headers() }
  );
  const bots = await res.json();
  if (!Array.isArray(bots)) return;
  await renderBots(bots);
}

async function renderBots(bots) {
  // Prix live CoinGecko
  const ids = [...new Set(bots.map(b => b.coingecko_id).filter(Boolean))];
  let prix = {};
  if (ids.length) {
    try {
const cgRes = await fetch(
        `/api/coingecko?endpoint=${encodeURIComponent(`simple/price?ids=${ids.join(',')}&vs_currencies=usd`)}`
      );
      prix = await cgRes.json();
      console.log('Prix CoinGecko:', prix, 'à', new Date().toLocaleTimeString());
    } catch (e) { console.error('CoinGecko indisponible', e); }
  }

  let totalCapital = 0, totalValeur = 0, totalGrid = 0, totalPnl = 0;

  const container = document.getElementById('bots-liste');
  container.innerHTML = '';

  bots.forEach(bot => {
    const prixLive = prix[bot.coingecko_id]?.usd || null;
    const capitalTotal = bot.capital_investi + bot.marge_supplementaire;
const valeurPosition = prixLive ? prixLive * bot.quantite_token : null;
const gainNet = bot.grid_profit + bot.pnl_tendance;
const valeurCompte = capitalTotal + gainNet;

totalCapital += capitalTotal;
totalValeur += valeurCompte;
    totalGrid += bot.grid_profit;
    totalPnl += gainNet;

    // Badge statut
    const enPause = bot.statut === 'pause';
    const procheAlerte = prixLive && prixLive < bot.prix_liquidation * 1.2;
    const badgeClass = procheAlerte ? 'badge-alerte' : enPause ? 'badge-pause' : 'badge-actif';
    const badgeLabel = procheAlerte ? '🚨 Alerte liquidation' : enPause ? '⏸ En pause' : '✅ Actif';

    // Barre de prix
    const range = bot.borne_haute - bot.borne_basse;
    const positionPct = prixLive
      ? Math.min(Math.max(((prixLive - bot.borne_basse) / range) * 100, 0), 100)
      : 0;
    const fillColor = enPause ? '#f6ad55' : '#3b82f6';

    const card = document.createElement('div');
    card.className = 'bot-card';
    card.innerHTML = `
      <div class="bot-header">
        <span class="bot-nom">${bot.token} — ${bot.nom} ${bot.levier}x</span>
        <span class="badge-statut ${badgeClass}">${badgeLabel}</span>
      </div>

      <div class="bot-barre-wrap">
        <div class="bot-barre-labels">
          <span>Borne basse : ${bot.borne_basse.toLocaleString()} $</span>
          <span>Prix live : ${prixLive ? prixLive.toLocaleString() + ' $' : '—'}</span>
          <span>Borne haute : ${bot.borne_haute.toLocaleString()} $</span>
        </div>
        <div class="bot-barre">
          <div class="bot-barre-fill" style="width:${positionPct}%;background:${fillColor}"></div>
          <div class="bot-barre-cursor" style="left:${positionPct}%"></div>
        </div>
      </div>

      <div class="bot-grid">
        <div class="bot-stat">
          <span class="label">Capital engagé</span>
          <span class="val">${capitalTotal.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</span>
        </div>
<div class="bot-stat">
  <span class="label">Valeur compte</span>
  <span class="val">${valeurCompte.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</span>
</div>
<div class="bot-stat">
  <span class="label">Exposition (${bot.quantite_token} ${bot.token})</span>
  <span class="val" style="color:#718096">${valeurPosition ? valeurPosition.toLocaleString('fr-FR', { style:'currency', currency:'USD' }) : '—'}</span>
</div>
        <div class="bot-stat">
          <span class="label">Grid profit ✏️</span>
          <span class="val editable">
            <span id="grid-val-${bot.id}">${bot.grid_profit.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</span>
            <button class="btn-edit" onclick="editGrid('${bot.id}', ${bot.grid_profit})">✏️</button>
          </span>
        </div>
        <div class="bot-stat">
          <span class="label">PnL tendance ✏️</span>
          <span class="val editable">
            <span class="${bot.pnl_tendance >= 0 ? 'pos' : 'neg'}" id="pnl-val-${bot.id}">${bot.pnl_tendance.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</span>
            <button class="btn-edit" onclick="editPnl('${bot.id}', ${bot.pnl_tendance})">✏️</button>
          </span>
        </div>
        <div class="bot-stat">
          <span class="label">Gain net total</span>
          <span class="val ${gainNet >= 0 ? 'pos' : 'neg'}">${gainNet.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</span>
        </div>
        <div class="bot-stat">
          <span class="label">Prix liquidation</span>
          <span class="val neg">⚠️ ${bot.prix_liquidation.toLocaleString()} $</span>
        </div>
      </div>

<div class="simulateur">
        <h4>🔮 Simulateur</h4>

        <div class="sim-section">
          <div class="sim-label">📈 Prix cible ${bot.token}</div>
          <div class="sim-row">
            <input type="number" id="sim-prix-${bot.id}" placeholder="Prix en $" step="any"
              oninput="simulerBot('${bot.id}', ${bot.capital_investi}, ${bot.grid_profit}, ${gainNet}, ${prixLive || 0}, ${bot.pente_simulateur || 0}, ${bot.pente_liquidation || 0}, ${bot.prix_liquidation})">
            <span>$</span>
          </div>
        </div>

        <div class="sim-section">
          <div class="sim-label">💉 Mouvement de marge <small>(+ ajout / - retrait)</small></div>
          <div class="sim-row">
            <input type="number" id="sim-injection-${bot.id}" placeholder="Montant en $" step="any"
              oninput="simulerBot('${bot.id}', ${bot.capital_investi}, ${bot.grid_profit}, ${gainNet}, ${prixLive || 0}, ${bot.pente_simulateur || 0}, ${bot.pente_liquidation || 0}, ${bot.prix_liquidation})">
            <span>$</span>
          </div>
        </div>

        <div class="sim-result" id="sim-result-${bot.id}"></div>
      </div>
    `;
    container.appendChild(card);
  });

  // Récap global
  document.getElementById('bots-capital').textContent =
    totalCapital.toLocaleString('fr-FR', { style:'currency', currency:'USD' });
  document.getElementById('bots-valeur').textContent =
    totalValeur ? totalValeur.toLocaleString('fr-FR', { style:'currency', currency:'USD' }) : '—';
  document.getElementById('bots-grid').textContent =
    totalGrid.toLocaleString('fr-FR', { style:'currency', currency:'USD' });
  document.getElementById('bots-pnl').textContent =
    totalPnl.toLocaleString('fr-FR', { style:'currency', currency:'USD' });
  document.getElementById('bots-pnl').className =
    `value ${totalPnl >= 0 ? 'pos' : 'neg'}`;
}

// Simulateur
function simulerBot(botId, capitalInvesti, gridProfit, gainNetActuel, prixLive, penteSimu, penteLiq, prixLiqActuel) {
  const inputPrix = document.getElementById(`sim-prix-${botId}`);
  const inputInjection = document.getElementById(`sim-injection-${botId}`);
  const result = document.getElementById(`sim-result-${botId}`);

  const prixCible = parseFloat(inputPrix.value);
  const injection = parseFloat(inputInjection.value) || 0;

  if (!prixCible && !injection) { result.innerHTML = ''; return; }

  let html = '<div class="sim-bloc">';

  // ── Mouvement de marge ───────────────────────────
  if (injection !== 0 && penteLiq) {
    const nouvLiq = prixLiqActuel - (injection * penteLiq);
    const margeSec = prixLive && nouvLiq > 0
      ? ((prixLive - nouvLiq) / prixLive * 100).toFixed(1)
      : null;
const liqLabel = nouvLiq <= 0
  ? '<span class="pos">🟢 Liquidation impossible</span>'
  : `<span class="${injection > 0 ? 'pos' : nouvLiq < prixLive * 0.15 ? 'neg' : ''}">${nouvLiq.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</span>`;

    html += `
      <div class="sim-ligne">
        <span class="sim-ligne-label">Nouveau prix de liquidation</span>
        <strong>${liqLabel}</strong>
      </div>`;

    if (margeSec && nouvLiq > 0) {
      html += `
      <div class="sim-ligne" style="font-size:0.8rem;color:#718096">
        <span>Marge de sécurité vs prix live</span>
        <span>${margeSec} %</span>
      </div>`;
    }
  }

  // ── Prix cible ───────────────────────────────────
  if (prixCible && prixLive && penteSimu) {
    const deltaPrix = prixCible - prixLive;
    const gainNetSim = gainNetActuel + (deltaPrix * penteSimu);
    const pct = ((gainNetSim / capitalInvesti) * 100).toFixed(2);
    const signe = gainNetSim >= 0 ? '+' : '';

    html += `
      <div class="sim-ligne">
        <span class="sim-ligne-label">Gain net si ${prixCible.toLocaleString()} $</span>
        <strong class="${gainNetSim >= 0 ? 'pos' : 'neg'}">${signe}${gainNetSim.toLocaleString('fr-FR', { style:'currency', currency:'USD' })} (${signe}${pct} %)</strong>
      </div>`;
  }

  // ── Combiné ──────────────────────────────────────
  if (prixCible && injection !== 0 && penteSimu && penteLiq) {
    const nouvLiq = prixLiqActuel - (injection * penteLiq);
    const deltaPrix = prixCible - prixLive;
    const gainNetSim = gainNetActuel + (deltaPrix * penteSimu);
    const pct = ((gainNetSim / capitalInvesti) * 100).toFixed(2);
    const signe = gainNetSim >= 0 ? '+' : '';

    html += `
      <div class="sim-ligne sim-ligne-total">
        <span class="sim-ligne-label">Résultat combiné</span>
        <span>
          Gain <strong class="${gainNetSim >= 0 ? 'pos' : 'neg'}">${signe}${gainNetSim.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</strong>
          · Liq <strong>${nouvLiq <= 0 ? '🟢' : nouvLiq.toLocaleString('fr-FR', { style:'currency', currency:'USD' })}</strong>
        </span>
      </div>`;
  }

  html += '</div>';
  result.innerHTML = html;
}
// Édition grid profit
async function editGrid(botId, valeurActuelle) {
  const nouvelleValeur = prompt('Nouveau grid profit (USDT) :', valeurActuelle);
  if (nouvelleValeur === null) return;
  const val = parseFloat(nouvelleValeur);
  if (isNaN(val)) return;

  await fetch(`${SUPABASE_URL}/rest/v1/bots_pionex?id=eq.${botId}`, {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ grid_profit: val })
  });
  chargerBots();
}

// Édition PnL tendance
async function editPnl(botId, valeurActuelle) {
  const nouvelleValeur = prompt('Nouveau PnL tendance (USDT) — négatif si en perte :', valeurActuelle);
  if (nouvelleValeur === null) return;
  const val = parseFloat(nouvelleValeur);
  if (isNaN(val)) return;

  await fetch(`${SUPABASE_URL}/rest/v1/bots_pionex?id=eq.${botId}`, {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ pnl_tendance: val })
  });
  chargerBots();
}
// ─── POOLS LP ────────────────────────────────────────

async function chargerPools() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pools_lp?order=nom.asc&select=*`,
    { headers: headers() }
  );
  const pools = await res.json();
  if (!Array.isArray(pools)) return;
  renderPools(pools);
}

function renderPools(pools) {
  const total = pools.reduce((s, p) => s + (p.valeur_usd || 0), 0);
  document.getElementById('pools-total').textContent =
    total.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });

  const container = document.getElementById('pools-liste');
  container.innerHTML = '';

  pools.forEach(pool => {
    const card = document.createElement('div');
    card.className = 'pool-card';
    card.innerHTML = `
      <div class="pool-info">
        <span class="pool-nom">${pool.nom}</span>
        <span class="pool-protocole">${pool.protocole} · ${pool.wallet_id}</span>
      </div>
      <div class="pool-valeur">
        <strong id="pool-val-${pool.id}">${pool.valeur_usd.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}</strong>
        <button class="btn-edit-pool" onclick="editPool('${pool.id}', ${pool.valeur_usd})">✏️ Mettre à jour</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function editPool(poolId, valeurActuelle) {
  const nouvelleValeur = prompt('Nouvelle valeur en $ :', valeurActuelle);
  if (nouvelleValeur === null) return;
  const val = parseFloat(nouvelleValeur);
  if (isNaN(val)) return;

  await fetch(`${SUPABASE_URL}/rest/v1/pools_lp?id=eq.${poolId}`, {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ valeur_usd: val, updated_at: new Date().toISOString() })
  });
  chargerPools();
}

// ─── DASHBOARD ───────────────────────────────────────

async function chargerDashboard() {
  // Charger toutes les sources en parallèle
  const [resSpot, resStaking, resBots, resPools, resTrades] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/spot_positions?select=*`, { headers: headers() }),
    fetch(`${SUPABASE_URL}/rest/v1/positions_passives?statut=eq.actif&select=*`, { headers: headers() }),
    fetch(`${SUPABASE_URL}/rest/v1/bots_pionex?select=*`, { headers: headers() }),
    fetch(`${SUPABASE_URL}/rest/v1/pools_lp?select=*`, { headers: headers() }),
    fetch(`${SUPABASE_URL}/rest/v1/trades_perp?statut=eq.ferme&select=pnl_usd`, { headers: headers() })
  ]);

const [spot, staking, bots, pools, trades] = await Promise.all([
    resSpot.json(), resStaking.json(), resBots.json(),
    resPools.json(), resTrades.json()
  ]);

  console.log('Dashboard data:', { spot, staking, bots, pools, trades });

  if (!Array.isArray(spot) || !Array.isArray(bots)) {
    console.error('Dashboard 401 ou données invalides:', { spot, bots });
    return;
  }

  // Prix CoinGecko pour spot + staking
const tokensSpot = spot.map(p => p.coingecko_id).filter(Boolean);
const tokensStaking = staking.map(p => COINGECKO_IDS[p.token]).filter(Boolean);
const ids = [...new Set([...tokensSpot, ...tokensStaking])];
let prix = {};
if (ids.length) {
  try {
const cgRes = await fetch(
      `/api/coingecko?endpoint=${encodeURIComponent(`simple/price?ids=${ids.join(',')}&vs_currencies=usd`)}`
    );
    prix = await cgRes.json();
    console.log('Prix dashboard:', prix);
  } catch (e) { console.error('CoinGecko indisponible', e); }
}

  // ── Calcul par poche ──────────────────────────────

  // Spot
  const valeurSpot = spot.reduce((s, p) => {
    const px = prix[p.coingecko_id]?.usd || 0;
    return s + px * p.quantite;
  }, 0);

  // Staking hors spot (HYPE uniquement)
  const stakingHorsSpot = staking.filter(p => {
    const walletSpot = spot.find(s => s.token === p.token && s.wallet_id === p.wallet_id);
    return !walletSpot;
  });
  const valeurStaking = stakingHorsSpot.reduce((s, p) => {
    const cgId = COINGECKO_IDS[p.token];
    const px = cgId ? prix[cgId]?.usd || 0 : 0;
    return s + px * p.montant_depose;
  }, 0);

  // Bots Pionex
  const valeurBots = bots.reduce((s, b) => {
    return s + b.capital_investi + b.marge_supplementaire + b.grid_profit + b.pnl_tendance;
  }, 0);

  // Pools LP
  const valeurPools = Array.isArray(pools)
    ? pools.reduce((s, p) => s + (p.valeur_usd || 0), 0)
    : 0;

  // PnL PERP
  const pnlPerp = Array.isArray(trades)
    ? trades.reduce((s, t) => s + (t.pnl_usd || 0), 0)
    : 0;

  // ── Total ─────────────────────────────────────────
  const total = valeurSpot + valeurStaking + valeurBots + valeurPools + pnlPerp;

  // ── Render ────────────────────────────────────────
  document.getElementById('dash-total').textContent =
    total.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });

  const lignes = [
    { label: 'Portfolio Spot', detail: 'Kraken · Rabby · Pionex', valeur: valeurSpot },
    { label: 'HYPE Staké', detail: 'Hyperliquid', valeur: valeurStaking },
    { label: 'Bots Pionex', detail: 'ETH 3x · BTC 5x (valeur compte)', valeur: valeurBots },
    { label: 'Pools LP', detail: 'PRJX (valeur manuelle)', valeur: valeurPools },
    { label: 'PnL Trades PERP', detail: 'Kraken 2026 — gains réalisés', valeur: pnlPerp },
  ];

  const container = document.getElementById('dash-details');
  container.innerHTML = lignes.map(l => `
    <div class="dash-ligne">
      <div class="dash-ligne-label">
        <span>${l.label}</span>
        <small>${l.detail}</small>
      </div>
      <span class="dash-ligne-valeur ${l.valeur < 0 ? 'neg' : ''}">${l.valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}</span>
    </div>
  `).join('');
}
// ─── TRANSACTION SPOT ────────────────────────────────

async function ajouterTransaction() {
  const wallet_id = document.getElementById('tx-wallet').value;
  const date = document.getElementById('tx-date').value;
  const sens = document.getElementById('tx-sens').value;
  const token = document.getElementById('tx-token').value.trim().toUpperCase();
  const quantite = parseFloat(document.getElementById('tx-quantite').value);
  const prix = parseFloat(document.getElementById('tx-prix').value);
  const frais = parseFloat(document.getElementById('tx-frais').value) || 0;

  if (!date || !token || !quantite || !prix || isNaN(quantite) || isNaN(prix)) {
    alert('Date, token, quantité et prix requis.');
    return;
  }

  const coingecko_id = COINGECKO_IDS[token] || null;
  const id = 'tx-' + Date.now();

  await fetch(`${SUPABASE_URL}/rest/v1/transactions_spot`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      id, user_id: 'a494d43c-a915-4f34-875c-2b0ebd84d5fb',
      wallet_id, date_transaction: date, token, coingecko_id,
      sens, quantite, prix_unitaire_usd: prix, frais_usd: frais
    })
  });

  // Reset form
  document.getElementById('tx-date').value = '';
  document.getElementById('tx-token').value = '';
  document.getElementById('tx-quantite').value = '';
  document.getElementById('tx-prix').value = '';
  document.getElementById('tx-frais').value = '';

  alert(`Transaction ${sens} ${token} enregistrée ✅`);
}

// ─── TRADE PERP ──────────────────────────────────────

async function ajouterTradePerp() {
  const wallet_id = document.getElementById('perp-wallet').value;
  const date_ouverture = document.getElementById('perp-date-ouv').value;
  const date_cloture = document.getElementById('perp-date-clo').value;
  const paire = document.getElementById('perp-paire').value.trim().toUpperCase();
  const sens = document.getElementById('perp-sens').value;
const quantite = parseFloat(document.getElementById('perp-quantite').value);
  const prix_entree = parseFloat(document.getElementById('perp-prix-entree').value);
  const frais_entree = parseFloat(document.getElementById('perp-frais-entree').value) || 0;
  const prix_sortie = parseFloat(document.getElementById('perp-prix-sortie').value);
  const frais_sortie = parseFloat(document.getElementById('perp-frais-sortie').value) || 0;

  if (!date_ouverture || !paire || !quantite || !prix_entree || isNaN(quantite) || isNaN(prix_entree)) {
    alert('Date ouverture, paire, quantité et prix entrée requis.');
    return;
  }

  // Calcul automatique des montants et PnL
  const montant_entree = quantite * prix_entree;
  const montant_sortie = prix_sortie ? quantite * prix_sortie : null;
  const pnl_usd = montant_sortie
    ? montant_sortie - montant_entree - frais_entree - frais_sortie
    : null;
  const pnl_pct = pnl_usd && montant_entree
    ? (pnl_usd / montant_entree) * 100
    : null;

  const id = 'perp-' + Date.now();

  await fetch(`${SUPABASE_URL}/rest/v1/trades_perp`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      id, user_id: 'a494d43c-a915-4f34-875c-2b0ebd84d5fb',
      wallet_id, date_ouverture, date_cloture: date_cloture || null,
      paire, sens, montant_entree, frais_entree,
      montant_sortie: montant_sortie || null, frais_sortie,
      pnl_usd, pnl_pct,
      statut: date_cloture ? 'ferme' : 'ouvert'
    })
  });

  // Reset form
['perp-date-ouv','perp-date-clo','perp-paire','perp-quantite',
   'perp-prix-entree','perp-frais-entree','perp-prix-sortie','perp-frais-sortie'].forEach(id => {
    document.getElementById(id).value = '';
  });

  chargerTrades();
}
// ─── SCANNER DE SETUP ────────────────────────────────

let scannerResults = [];

// ── Fonctions mathématiques ──────────────────────────

function calcMA(closes, period) {
  if (!closes || closes.length < period) return null;
  return closes.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function calcBollinger(closes, period = 20, mult = 2) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  const ma = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + Math.pow(v - ma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: ma + mult * std,
    middle: ma,
    lower: ma - mult * std,
    bandwidth: std / ma
  };
}

function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  const slice = closes.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calcATR(ohlcArr, period = 14) {
  // Format CoinGecko : [timestamp, open, high, low, close]
  if (!ohlcArr || ohlcArr.length < period + 1) return null;
  const slice = ohlcArr.slice(-(period + 1));
  const trs = [];
  for (let i = 1; i < slice.length; i++) {
    const high = slice[i][2];
    const low = slice[i][3];
    const prevClose = slice[i - 1][4];
    trs.push(Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    ));
  }
  return trs.reduce((s, v) => s + v, 0) / period;
}

// ── Fetch OHLC CoinGecko ─────────────────────────────

async function fetchOHLC(cgId, days, interval) {
  // interval : 'daily' = 1440min, '4h' = 240min
  const krakenInterval = interval === '4h' ? '240' : '1440';
  const res = await fetch(
    `/api/ohlc?cgId=${encodeURIComponent(cgId)}&interval=${krakenInterval}`
  );
  if (!res.ok) throw new Error(`Kraken ${cgId} erreur ${res.status}`);
  return await res.json();
}

// ── Analyse d'un token ───────────────────────────────

function analyserDepuisDonnees(token, cgId, daily, h4, btcDaily) {
  const closes1D = daily.map(c => c[4]);
  const currentPrice = closes1D[closes1D.length - 1];

  // MAs journalières
  const mm20  = calcMA(closes1D, 20);
  const mm50  = calcMA(closes1D, 50);
  const mm100 = calcMA(closes1D, 100);
  const mm200 = calcMA(closes1D, 200);

  // Condition 1 — Biais
  const mmsOrdered = mm20 && mm50 && mm100 && mm200
    && mm20 > mm50 && mm50 > mm100 && mm100 > mm200;
  const priceAboveMM50 = mm50 && currentPrice > mm50;
  const cond1 = (mmsOrdered && priceAboveMM50) ? 1 : 0;

  // Support & cible
  const mmsArr = [
    { val: mm20, label: 'MM20' },
    { val: mm50, label: 'MM50' },
    { val: mm100, label: 'MM100' },
    { val: mm200, label: 'MM200' }
  ].filter(m => m.val);

  const below = mmsArr.filter(m => m.val < currentPrice).sort((a, b) => b.val - a.val);
  const above = mmsArr.filter(m => m.val > currentPrice).sort((a, b) => a.val - b.val);
  const supportMM = below[0] || null;
  const targetMM  = above[0] || null;
  const risk   = supportMM ? (currentPrice - supportMM.val) / currentPrice * 100 : null;
  const reward = targetMM  ? (targetMM.val - currentPrice)  / currentPrice * 100 : null;
  const rr     = risk && reward && risk > 0 ? reward / risk : null;

  // Condition 2 — Momentum BTC
  let cond2 = 0, btcPerf3D = null, btcAboveMM50 = false;
  const btcRef = (token === 'BTC') ? daily : btcDaily;
  if (btcRef && btcRef.length >= 4) {
    const btcCloses  = btcRef.map(c => c[4]);
    const btcCurrent = btcCloses[btcCloses.length - 1];
    const btc3DAgo   = btcCloses[btcCloses.length - 4];
    const btcMM50    = calcMA(btcCloses, 50);
    btcPerf3D    = ((btcCurrent - btc3DAgo) / btc3DAgo) * 100;
    btcAboveMM50 = btcMM50 && btcCurrent > btcMM50;
    cond2 = (btcAboveMM50 && btcPerf3D >= 1 && btcPerf3D <= 8) ? 1 : 0;
  }

  // Indicateurs 4H
  const closes4H = h4.map(c => c[4]);
  const bb  = calcBollinger(closes4H, 20, 2);
  const atr = calcATR(h4, 14);
  const atrPct   = atr ? (atr / currentPrice) * 100 : 0;
  const bbSqueeze = bb ? bb.bandwidth < 0.04 : false;

  // Condition 3 — Volatilité
  const cond3 = (bbSqueeze || atrPct > 2) ? 1 : 0;

  // Condition 4 — RSI
  const rsi  = calcRSI(closes4H, 14);
  const cond4 = rsi && rsi >= 35 && rsi <= 65 ? 1 : 0;

  // Condition 5 — Confluence manuelle
  const cond5 = 0;

  const score = cond1 + cond2 + cond3 + cond4 + cond5;
  const biais = (mmsOrdered && priceAboveMM50) ? 'long'
    : (mm200 && currentPrice < mm200) ? 'short' : 'neutre';

  return {
    token, cgId, currentPrice,
    mm20, mm50, mm100, mm200,
    mmsOrdered, priceAboveMM50, biais,
    supportMM, targetMM, risk, reward, rr,
    btcPerf3D, btcAboveMM50,
    bb, atr, atrPct, bbSqueeze, rsi,
    cond1, cond2, cond3, cond4, cond5, score
  };
}

// ── Helpers d'affichage ──────────────────────────────

function signalLabel(score) {
  if (score >= 4) return { label: '⚡ Setup fort',    color: '#68d391' };
  if (score === 3) return { label: '👀 À surveiller', color: '#f6ad55' };
  if (score === 2) return { label: '⏳ Attendre',     color: '#a0aec0' };
  return             { label: '🚫 Éviter',          color: '#fc8181' };
}

function renderDots(score, max = 5) {
  let h = '';
  for (let i = 0; i < max; i++)
    h += `<span class="score-dot ${i < score ? 'score-dot-on' : 'score-dot-off'}"></span>`;
  return h;
}

function pct(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)} %`;
}

function fmt(v, dec = 2) {
  if (v == null) return '—';
  return v.toLocaleString('fr-FR', { maximumFractionDigits: dec });
}

function chk(c) { return c ? '✅' : '❌'; }

// ── Render scanner ────────────────────────────────────

function genererSynthese(r) {
  const parties = [];
  if (r.cond1) parties.push(`biais long confirmé (MMs ordonnées)`);
  else parties.push('biais non confirmé — MMs non ordonnées ou prix sous MM50');
  if (r.cond2) parties.push(`momentum BTC solide (${pct(r.btcPerf3D)} sur 3J)`);
  else parties.push('momentum BTC insuffisant');
  if (r.bbSqueeze) parties.push('compression Bollinger détectée');
  else if (r.cond3) parties.push(`volatilité ATR suffisante (${r.atrPct.toFixed(1)} %)`);
  else parties.push('pas de compression ni de volatilité suffisante');
  if (r.cond4) parties.push(`RSI neutre (${r.rsi?.toFixed(0)})`);
  else parties.push(`RSI à ${r.rsi?.toFixed(0)} — ${r.rsi > 65 ? 'suracheté, attendre' : 'survendu, surveiller'}`);
  if (r.rr && r.rr >= 1.5) parties.push(`R/R de ${r.rr.toFixed(2)}`);
  return parties.join(', ') + '.';
}

function renderDetail(r) {
  return `
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-titre">📊 Cond. 1 — Biais 1J ${chk(r.cond1)}</div>
        <div class="detail-ligne"><span>Ordre MMs</span><span>${chk(r.mmsOrdered)}</span></div>
        <div class="detail-ligne"><span>Prix > MM50</span><span>${chk(r.priceAboveMM50)}</span></div>
        <div class="detail-ligne"><span>MM20</span><span>${fmt(r.mm20)} $</span></div>
        <div class="detail-ligne"><span>MM50</span><span>${fmt(r.mm50)} $</span></div>
        <div class="detail-ligne"><span>MM100</span><span>${fmt(r.mm100)} $</span></div>
        <div class="detail-ligne"><span>MM200</span><span>${fmt(r.mm200)} $</span></div>
        ${r.supportMM ? `<div class="detail-ligne"><span>Support (${r.supportMM.label})</span><span>${fmt(r.supportMM.val)} $ (${pct(-r.risk)})</span></div>` : ''}
        ${r.targetMM  ? `<div class="detail-ligne"><span>Cible (${r.targetMM.label})</span><span>${fmt(r.targetMM.val)} $ (+${r.reward?.toFixed(2)} %)</span></div>` : ''}
        ${r.rr ? `<div class="detail-ligne detail-rr"><span>R/R estimé</span><span class="${r.rr >= 1.5 ? 'pos' : 'neg'}">${r.rr.toFixed(2)}</span></div>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-titre">₿ Cond. 2 — Momentum BTC ${chk(r.cond2)}</div>
        <div class="detail-ligne"><span>BTC > MM50 1J</span><span>${chk(r.btcAboveMM50)}</span></div>
        <div class="detail-ligne"><span>Perf BTC 3J</span>
          <span class="${r.btcPerf3D >= 1 && r.btcPerf3D <= 8 ? 'pos' : 'neg'}">${pct(r.btcPerf3D)}</span>
        </div>
        <div class="detail-ligne"><span>Zone cible (1 % – 8 %)</span>
          <span>${chk(r.btcPerf3D >= 1 && r.btcPerf3D <= 8)}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-titre">🎯 Cond. 3 — Volatilité 4H ${chk(r.cond3)}</div>
        ${r.bb ? `
        <div class="detail-ligne"><span>Bandwidth BB</span><span>${(r.bb.bandwidth * 100).toFixed(2)} %</span></div>
        <div class="detail-ligne"><span>Squeeze BB (< 4 %)</span><span>${chk(r.bbSqueeze)}</span></div>
        <div class="detail-ligne"><span>BB haute</span><span>${fmt(r.bb.upper)} $</span></div>
        <div class="detail-ligne"><span>BB basse</span><span>${fmt(r.bb.lower)} $</span></div>
        ` : ''}
        <div class="detail-ligne"><span>ATR 4H</span><span>${fmt(r.atr)} $ (${r.atrPct.toFixed(2)} %)</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-titre">📈 Cond. 4 — RSI 4H ${chk(r.cond4)}</div>
        <div class="detail-ligne"><span>RSI (14)</span>
          <span class="${r.rsi >= 35 && r.rsi <= 65 ? 'pos' : 'neg'}">${r.rsi ? r.rsi.toFixed(1) : '—'}</span>
        </div>
        <div class="detail-ligne"><span>Zone neutre (35 – 65)</span><span>${chk(r.rsi >= 35 && r.rsi <= 65)}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-titre">🔗 Cond. 5 — Confluence manuelle ${chk(r.cond5)}</div>
        <div class="detail-ligne"><span>FVG / Niveau horizontal</span><span>Valider sur TradingView</span></div>
        <button class="btn-cond5 ${r.cond5 ? 'btn-cond5-on' : ''}"
          onclick="toggleCond5('${r.token}')">
          ${r.cond5 ? '✅ Confluence confirmée' : '☐ Marquer comme confirmée'}
        </button>
      </div>
    </div>

    <div class="detail-synthese">
      💡 <strong>Synthèse :</strong> ${genererSynthese(r)}
    </div>
  `;
}

function renderScanner(results) {
  const container = document.getElementById('scanner-table');
  const status    = document.getElementById('scanner-status');
  if (!container) return;

  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (status) status.textContent = `Mis à jour à ${now}`;

  results.sort((a, b) => b.score - a.score);
  container.innerHTML = '';

  results.forEach(r => {
    const sig      = signalLabel(r.score);
    const biaisIcon = r.biais === 'long' ? '🟢' : r.biais === 'short' ? '⚪' : '🟡';
    const biaisText = r.biais.charAt(0).toUpperCase() + r.biais.slice(1);

    const row = document.createElement('div');
    row.className = 'scanner-row';
    row.innerHTML = `
      <div class="scanner-row-main" onclick="toggleScannerDetail('${r.token}')">
        <div class="scanner-token">
          <strong>${r.token}</strong>
          <small>${r.currentPrice ? r.currentPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : '—'}</small>
        </div>
        <div class="scanner-score">
          ${renderDots(r.score)}
          <span class="score-num">${r.score}/5</span>
        </div>
        <div class="scanner-biais">${biaisIcon} ${biaisText}</div>
        <div class="scanner-signal" style="color:${sig.color}">${sig.label}</div>
        <div class="scanner-chevron">▼</div>
      </div>
      <div class="scanner-detail hidden" id="detail-${r.token}">
        ${renderDetail(r)}
      </div>
    `;
    container.appendChild(row);
  });

  // Mini scanner dashboard
  renderDashMiniScanner(results.filter(r => r.token === 'BTC' || r.token === 'ETH'));
}

function renderDashMiniScanner(results) {
  const el = document.getElementById('dash-scanner');
  if (!el) return;
  el.innerHTML = results.length
    ? results.map(r => {
        const sig = signalLabel(r.score);
        return `
          <div class="dash-scanner-token">
            <strong>${r.token}</strong>
            <div>${renderDots(r.score)}</div>
            <span style="color:${sig.color};font-size:0.78rem">${sig.label}</span>
          </div>`;
      }).join('')
    : '<span style="color:#4a5568;font-size:0.85rem">Scanner non chargé — voir onglet Scanner</span>';
}

function toggleScannerDetail(token) {
  document.getElementById(`detail-${token}`)?.classList.toggle('hidden');
}

function toggleCond5(token) {
  const r = scannerResults.find(x => x.token === token);
  if (!r) return;
  r.cond5  = r.cond5 ? 0 : 1;
  r.score  = r.cond1 + r.cond2 + r.cond3 + r.cond4 + r.cond5;
  renderScanner(scannerResults);
  document.getElementById(`detail-${token}`)?.classList.remove('hidden');
}

// ── Chargement principal ──────────────────────────────

async function chargerScanner() {
  const status = document.getElementById('scanner-status');
  const btn    = document.getElementById('btn-scanner-refresh');
  if (status) status.textContent = '⏳ Analyse en cours...';
  if (btn) btn.disabled = true;

  try {
    // Récupérer la liste des tokens depuis Supabase
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scanner_tokens?actif=eq.true&order=token.asc&select=*`,
      { headers: headers() }
    );
    const tokens = await res.json();
    if (!Array.isArray(tokens) || !tokens.length) return;

    // Fetcher BTC daily en premier (partagé)
    const btcToken = tokens.find(t => t.token === 'BTC');
    let btcDaily = null;
    if (btcToken) {
btcDaily = await fetchOHLC('bitcoin', 365, 'daily');
      await new Promise(r => setTimeout(r, 500));
    }

    const results = [];
    for (const t of tokens) {
      try {
const daily = (t.token === 'BTC' && btcDaily) ? btcDaily
          : await fetchOHLC(t.coingecko_id, 365, 'daily');
        if (t.token !== 'BTC') await new Promise(r => setTimeout(r, 500));

        const h4 = await fetchOHLC(t.coingecko_id, 30, '4h');
        await new Promise(r => setTimeout(r, 500));

        const result = analyserDepuisDonnees(t.token, t.coingecko_id, daily, h4, btcDaily);
        results.push(result);
      } catch(e) {
        console.error(`Erreur ${t.token}:`, e);
      }
    }

    scannerResults = results;
    renderScanner(results);
} catch(e) {
    console.error('Scanner erreur globale:', e);
  } finally {
    if (status) status.textContent = `Mis à jour à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (btn) btn.disabled = false;
  }
}
// ─── SNAPSHOT ────────────────────────────────────────

async function prendreSnapshot() {
  const btn = document.getElementById('btn-snapshot');
  const status = document.getElementById('scanner-status');

  if (!scannerResults.length) {
    alert('Lance d\'abord le scanner (⟳ Actualiser) avant de prendre un snapshot.');
    return;
  }

  btn.disabled = true;
  if (status) status.textContent = '📸 Snapshot en cours...';

  // Récupérer BTC pour le snapshot
  const btcResult = scannerResults.find(r => r.token === 'BTC');

  const snapshots = scannerResults.map(r => ({
    id: `snap-${r.token}-${Date.now()}`,
    user_id: 'a494d43c-a915-4f34-875c-2b0ebd84d5fb',
    token: r.token,
    coingecko_id: r.cgId,
    prix: r.currentPrice,
    score: r.score,
    cond1: r.cond1, cond2: r.cond2,
    cond3: r.cond3, cond4: r.cond4, cond5: r.cond5,
    biais: r.biais,
    rsi_daily: r.rsi ? Math.round(r.rsi * 10) / 10 : null,
    btc_prix: btcResult?.currentPrice || null,
    btc_momentum_3j: btcResult?.btcPerf3D ? Math.round(btcResult.btcPerf3D * 100) / 100 : null,
    mm20: r.mm20, mm50: r.mm50, mm100: r.mm100, mm200: r.mm200,
    support_label: r.supportMM?.label || null,
    support_prix: r.supportMM?.val || null,
    target_label: r.targetMM?.label || null,
    target_prix: r.targetMM?.val || null,
    rr: r.rr ? Math.round(r.rr * 100) / 100 : null,
    bb_bandwidth: r.bb?.bandwidth ? Math.round(r.bb.bandwidth * 10000) / 100 : null,
    atr_pct: r.atrPct ? Math.round(r.atrPct * 100) / 100 : null
  }));

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scanner_snapshots`, {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(snapshots)
    });

    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (status) status.textContent = `📸 Snapshot sauvegardé à ${now}`;

    // Alertes setup ≥ 3
    const alertes = snapshots.filter(s => s.score >= 3);
    if (alertes.length) {
      alertes.forEach(s => {
        const row = document.querySelector(`.scanner-row[data-token="${s.token}"]`);
        if (row) {
          row.classList.add('alerte');
          const tokenEl = row.querySelector('.scanner-token strong');
          if (tokenEl && !tokenEl.querySelector('.badge-alerte-setup')) {
            tokenEl.insertAdjacentHTML('afterend',
              `<span class="badge-alerte-setup">🔔 Setup ${s.score}/5</span>`
            );
          }
        }
      });
    }
  } catch(e) {
    console.error('Erreur snapshot:', e);
    if (status) status.textContent = '❌ Erreur snapshot';
  } finally {
    btn.disabled = false;
  }
}

// ─── JOURNAL ─────────────────────────────────────────

async function chargerJournal() {
  const filtreToken = document.getElementById('journal-filtre-token')?.value || '';
  const filtreScore = document.getElementById('journal-filtre-score')?.value || '';

  let url = `${SUPABASE_URL}/rest/v1/scanner_snapshots?order=date_snapshot.desc&select=*`;
  if (filtreToken) url += `&token=eq.${filtreToken}`;
  if (filtreScore) url += `&score=gte.${filtreScore}`;

  const res = await fetch(url, { headers: headers() });
  const snapshots = await res.json();
  if (!Array.isArray(snapshots)) return;

  renderJournal(snapshots);
}

function renderJournal(snapshots) {
  // Stats
  const total = snapshots.length;
  const forts = snapshots.filter(s => s.score >= 4).length;
  const watches = snapshots.filter(s => s.score === 3).length;
  const parToken = {};
  snapshots.forEach(s => {
    if (!parToken[s.token]) parToken[s.token] = { total: 0, forts: 0 };
    parToken[s.token].total++;
    if (s.score >= 3) parToken[s.token].forts++;
  });

  const statsEl = document.getElementById('journal-stats');
  statsEl.innerHTML = `
    <div class="journal-stats-bar">
      <div class="journal-stat-card">
        <span class="label">Snapshots total</span>
        <span class="value">${total}</span>
      </div>
      <div class="journal-stat-card">
        <span class="label">Setups forts (≥4)</span>
        <span class="value pos">${forts}</span>
      </div>
      <div class="journal-stat-card">
        <span class="label">À surveiller (3)</span>
        <span class="value" style="color:#f6ad55">${watches}</span>
      </div>
      ${Object.entries(parToken).map(([tok, d]) => `
        <div class="journal-stat-card">
          <span class="label">${tok} — score ≥3</span>
          <span class="value">${d.forts}/${d.total}</span>
        </div>
      `).join('')}
    </div>
  `;

  // Liste
  const liste = document.getElementById('journal-liste');
  liste.innerHTML = '';

  if (!snapshots.length) {
    liste.innerHTML = '<p class="empty">Aucun snapshot — lance le scanner et clique 📸</p>';
    return;
  }

  snapshots.forEach(s => {
    const sig = signalLabel(s.score);
    const dateStr = new Date(s.date_snapshot).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const rowClass = s.score >= 4 ? 'score-fort' : s.score >= 3 ? 'score-watch' : '';

    const row = document.createElement('div');
    row.className = `journal-row ${rowClass}`;
    row.innerHTML = `
      <div class="journal-row-main" onclick="toggleJournalDetail('${s.id}')">
        <div class="journal-token">
          <strong>${s.token}</strong>
          <small>${dateStr}</small>
        </div>
        <div>${renderDots(s.score)} <span class="score-num">${s.score}/5</span></div>
        <div style="color:${sig.color};font-size:0.82rem">${sig.label}</div>
        <div class="journal-conditions">
          ${[s.cond1, s.cond2, s.cond3, s.cond4, s.cond5].map(c =>
            `<span class="cond-dot ${c ? 'cond-on' : 'cond-off'}"></span>`
          ).join('')}
        </div>
        <div style="font-size:0.82rem;color:#a0aec0">${s.prix ? s.prix.toLocaleString('fr-FR', { style:'currency', currency:'USD', maximumFractionDigits:2 }) : '—'}</div>
        <div style="color:#4a5568;font-size:0.7rem">▼</div>
      </div>
      <div class="journal-detail hidden" id="jdetail-${s.id}">
        <div class="journal-detail-grid">
          <div class="journal-detail-item">
            <span class="jlabel">Biais</span>
            <span class="jval">${s.biais || '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">RSI daily</span>
            <span class="jval ${s.rsi_daily >= 35 && s.rsi_daily <= 65 ? 'pos' : 'neg'}">${s.rsi_daily || '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">Support (${s.support_label || '—'})</span>
            <span class="jval">${s.support_prix ? s.support_prix.toLocaleString('fr-FR', { style:'currency', currency:'USD', maximumFractionDigits:2 }) : '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">Cible (${s.target_label || '—'})</span>
            <span class="jval">${s.target_prix ? s.target_prix.toLocaleString('fr-FR', { style:'currency', currency:'USD', maximumFractionDigits:2 }) : '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">R/R estimé</span>
            <span class="jval ${s.rr >= 1.5 ? 'pos' : 'neg'}">${s.rr || '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">BTC prix</span>
            <span class="jval">${s.btc_prix ? s.btc_prix.toLocaleString('fr-FR', { style:'currency', currency:'USD', maximumFractionDigits:0 }) : '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">BTC momentum 3J</span>
            <span class="jval ${s.btc_momentum_3j >= 1 ? 'pos' : 'neg'}">${s.btc_momentum_3j ? s.btc_momentum_3j.toFixed(2) + ' %' : '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">ATR</span>
            <span class="jval">${s.atr_pct ? s.atr_pct + ' %' : '—'}</span>
          </div>
          <div class="journal-detail-item">
            <span class="jlabel">BB Bandwidth</span>
            <span class="jval">${s.bb_bandwidth ? s.bb_bandwidth + ' %' : '—'}</span>
          </div>
        </div>
        <div class="journal-actions">
          <button class="btn-journal-action btn-journal-reel"
            onclick="enregistrerSetup('${s.id}', '${s.token}', ${s.score}, 'reel')">
            💰 Enregistrer comme trade réel
          </button>
          <button class="btn-journal-action"
            onclick="enregistrerSetup('${s.id}', '${s.token}', ${s.score}, 'simulation')">
            🧪 Enregistrer comme simulation
          </button>
        </div>
        <textarea class="journal-note-input" id="note-${s.id}"
          placeholder="Notes sur ce setup..." rows="2"
          onblur="sauvegarderNote('${s.id}')"></textarea>
      </div>
    `;
    liste.appendChild(row);
  });
}

function toggleJournalDetail(id) {
  document.getElementById(`jdetail-${id}`)?.classList.toggle('hidden');
}

async function enregistrerSetup(snapshotId, token, score, type) {
  const note = document.getElementById(`note-${snapshotId}`)?.value || '';
  const id = `setup-${Date.now()}`;

  await fetch(`${SUPABASE_URL}/rest/v1/journal_setups`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      id,
      user_id: 'a494d43c-a915-4f34-875c-2b0ebd84d5fb',
      token,
      snapshot_id: snapshotId,
      type,
      score_setup: score,
      notes: note,
      statut: 'ouvert'
    })
  });

  alert(`Setup ${token} enregistré comme ${type === 'reel' ? 'trade réel 💰' : 'simulation 🧪'}`);
}

async function sauvegarderNote(snapshotId) {
  const note = document.getElementById(`note-${snapshotId}`)?.value || '';
  await fetch(`${SUPABASE_URL}/rest/v1/scanner_snapshots?id=eq.${snapshotId}`, {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ notes: note })
  });
}
