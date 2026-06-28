const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();
const PASS = 'Stroycosmos2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const data = await redis.get('overrides') || {};
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
      await redis.set('overrides', req.body.overrides);
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
