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
    const { phone, password, name } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Некорректный номер телефона' });
    }

    const userKey = `user:${cleanPhone}`;
    const existing = await redis.get(userKey);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с этим номером уже зарегистрирован' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const user = {
      phone: cleanPhone,
      name: name || '',
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
      address: '',
    };

    await redis.set(userKey, JSON.stringify(user));

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`session:${token}`, cleanPhone, { ex: 60 * 60 * 24 * 30 });

    return res.status(200).json({
      success: true,
      token,
      user: { phone: cleanPhone, name: user.name, address: user.address },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
