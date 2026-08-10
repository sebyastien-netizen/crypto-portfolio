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
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
    if (btn.dataset.tab === 'spot') chargerSpot();
    if (btn.dataset.tab === 'bots') chargerBots();
    if (btn.dataset.tab === 'positions') chargerStaking();
  });
});

// Restaurer la session au chargement
const savedToken = localStorage.getItem('cp_token');
if (savedToken) {
  currentSession = savedToken;
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
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
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
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
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
      );
      prix = await cgRes.json();
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
        <h4>🔮 Simulateur de scénario</h4>
        <div class="sim-row">
          <span>Si ${bot.token} atteint</span>
          <input type="number" id="sim-input-${bot.id}" placeholder="Prix en $" step="any"
            oninput="simulerBot('${bot.id}', ${bot.capital_investi}, ${bot.grid_profit}, ${gainNet}, ${prixLive || 0}, 0.1246)"
          <span>$</span>
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
function simulerBot(botId, capitalInvesti, gridProfit, pnlActuel, prixLive, pente) {
  const input = document.getElementById(`sim-input-${botId}`);
  const result = document.getElementById(`sim-result-${botId}`);
  const prixCible = parseFloat(input.value);
  if (!prixCible || isNaN(prixCible) || !prixLive) { result.textContent = ''; return; }

  const deltaPrix = prixCible - prixLive;
  const gainNetSim = pnlActuel + (deltaPrix * pente);
  const pct = ((gainNetSim / capitalInvesti) * 100).toFixed(2);
  const signe = gainNetSim >= 0 ? '+' : '';

  result.innerHTML = `
    Gain net estimé : <strong class="${gainNetSim >= 0 ? 'pos' : 'neg'}">${signe}${gainNetSim.toLocaleString('fr-FR', { style:'currency', currency:'USD' })} (${signe}${pct} % sur capital investi)</strong>
    <br><small style="color:#4a5568">Breakeven estimé : ${Math.round(prixLive - (pnlActuel / pente)).toLocaleString()} $</small>
  `;
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
