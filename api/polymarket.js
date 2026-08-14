module.exports = async function handler(req, res) {
  const { search } = req.query;
  if (!search) return res.status(400).json({ error: 'search manquant' });

  const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=20&search=${encodeURIComponent(search)}`;

  try {
    const pmRes = await fetch(url);
    if (!pmRes.ok) return res.status(pmRes.status).json({ error: `Polymarket erreur ${pmRes.status}` });
    const data = await pmRes.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
