module.exports = async function handler(req, res) {
  const { search } = req.query;
  if (!search) return res.status(400).json({ error: 'search manquant' });

  const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=500&order=volume&ascending=false`;

  try {
    const pmRes = await fetch(url);
    if (!pmRes.ok) return res.status(pmRes.status).json({ error: `Polymarket erreur ${pmRes.status}` });
    const data = await pmRes.json();

    // Filtrage côté serveur sur le texte de la question
    const searchLower = search.toLowerCase();
    const filtered = Array.isArray(data)
      ? data.filter(m => m.question && m.question.toLowerCase().includes(searchLower))
      : [];

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(filtered);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
