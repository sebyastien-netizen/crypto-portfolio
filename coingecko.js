export default async function handler(req, res) {
  const { endpoint } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'endpoint manquant' });

  const url = `https://api.coingecko.com/api/v3/${endpoint}`;
  try {
    const cgRes = await fetch(url);
    const data = await cgRes.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
