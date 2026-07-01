const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

const redis = Redis.fromEnv();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const userKey = `user:${cleanPhone}`;
    const raw = await redis.get(userKey);
    if (!raw) return res.status(401).json({ error: 'Пользователь не найден' });

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`session:${token}`, cleanPhone, { ex: 60 * 60 * 24 * 30 });

    return res.status(200).json({
      success: true,
      token,
      user: { phone: cleanPhone, name: user.name || '', address: user.address || '' },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
