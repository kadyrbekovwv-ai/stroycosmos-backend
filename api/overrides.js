const { kv } = require('@vercel/kv');

const PASS = 'Stroycosmos2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
    return res.status(200).end();
  }
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));

  if (req.method === 'GET') {
    try {
      const data = await kv.get('overrides') || {};
      return res.status(200).json(data);
    } catch(e) {
      return res.status(200).json({});
    }
  }

  if (req.method === 'POST') {
    if (req.headers['authorization'] !== `Bearer ${PASS}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      await kv.set('overrides', req.body.overrides);
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
