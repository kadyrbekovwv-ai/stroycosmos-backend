const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getPhoneFromToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  return await redis.get(`session:${token}`);
}

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const phone = await getPhoneFromToken(req);
    if (!phone) return res.status(401).json({ error: 'Не авторизован' });

    const userKey = `user:${phone}`;

    if (req.method === 'GET') {
      const raw = await redis.get(userKey);
      if (!raw) return res.status(404).json({ error: 'Пользователь не найден' });
      const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return res.status(200).json({
        success: true,
        user: { phone: user.phone, name: user.name || '', address: user.address || '' },
      });
    }

    if (req.method === 'PUT') {
      const raw = await redis.get(userKey);
      if (!raw) return res.status(404).json({ error: 'Пользователь не найден' });
      const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

      const { name, address } = req.body || {};
      if (name !== undefined) user.name = name;
      if (address !== undefined) user.address = address;

      await redis.set(userKey, JSON.stringify(user));

      return res.status(200).json({
        success: true,
        user: { phone: user.phone, name: user.name, address: user.address },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
