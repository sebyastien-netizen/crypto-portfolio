const KRAKEN_PAIRS = {
  'bitcoin':     'XBTUSD',
  'ethereum':    'ETHUSD',
  'solana':      'SOLUSD',
  'aave':        'AAVEUSD',
  'chainlink':   'LINKUSD',
  'avalanche-2': 'AVAXUSD',
  'ripple':      'XRPUSD',
  'hyperliquid': 'HYPEUSD'
  'binancecoin': 'BNBUSD'
};

module.exports = async function handler(req, res) {
  const { cgId, interval, days } = req.query;
  if (!cgId) return res.status(400).json({ error: 'cgId manquant' });

  const pair = KRAKEN_PAIRS[cgId];
  if (!pair) return res.status(400).json({ error: `Paire inconnue : ${cgId}` });

  // interval : 1440 = 1J, 240 = 4H
  const krakenInterval = interval || '1440';
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${krakenInterval}`;

  try {
    const krakenRes = await fetch(url);
    if (!krakenRes.ok) return res.status(krakenRes.status).json({ error: `Kraken erreur ${krakenRes.status}` });
    const data = await krakenRes.json();

    if (data.error && data.error.length) {
      return res.status(400).json({ error: data.error[0] });
    }

    // Kraken retourne { result: { XBTUSD: [[ts, o, h, l, c, vwap, vol, count]] } }
    const resultKey = Object.keys(data.result).find(k => k !== 'last');
    const candles = data.result[resultKey];

    // Convertir au format [ts, open, high, low, close]
    const formatted = candles.map(c => [
      parseInt(c[0]) * 1000,
      parseFloat(c[1]),
      parseFloat(c[2]),
      parseFloat(c[3]),
      parseFloat(c[4])
    ]);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(formatted);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
