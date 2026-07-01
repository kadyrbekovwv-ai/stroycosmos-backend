const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const ordersKey = `orders:${phone}`;

    if (req.method === 'GET') {
      const list = await redis.lrange(ordersKey, 0, -1);
      const orders = list.map((o) => (typeof o === 'string' ? JSON.parse(o) : o));
      return res.status(200).json({ success: true, orders });
    }

    if (req.method === 'POST') {
      const { items, total, address, comment } = req.body || {};
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Заказ пуст' });
      }

      const order = {
        id: Date.now(),
        items,
        total: total || 0,
        address: address || '',
        comment: comment || '',
        status: 'Новый',
        createdAt: new Date().toISOString(),
      };

      await redis.lpush(ordersKey, JSON.stringify(order));

      return res.status(200).json({ success: true, order });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
