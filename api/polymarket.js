module.exports = async function handler(req, res) {
  const { search } = req.query;
  if (!search) return res.status(400).json({ error: 'search manquant' });

  const url = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(search)}&limit_per_type=20`;

  try {
    const pmRes = await fetch(url);
    if (!pmRes.ok) return res.status(pmRes.status).json({ error: `Polymarket erreur ${pmRes.status}` });
    const data = await pmRes.json();

    // public-search retourne { events: [...], profiles: [...] }
    // Chaque event contient un tableau "markets"
    const markets = [];
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        if (event.markets && Array.isArray(event.markets)) {
          markets.push(...event.markets);
        }
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(markets);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
