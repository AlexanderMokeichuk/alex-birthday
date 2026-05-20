import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, LIST_KEY } from './_redis.js';
import type { Congratulation } from './_lib.js';

const CORRECT_PASSWORD = '20052001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Вытаскиваем секретный заголовок из фронтенда
    const authHeader = req.headers['x-dossier-password'];

    if (authHeader !== CORRECT_PASSWORD) {
      return res.status(403).json({ error: 'Доступ заблокирован. Требуется авторизация.' });
    }

    const raw = await redis.lrange<string | Congratulation>(LIST_KEY, 0, -1);
    const list: Congratulation[] = raw.map((item) =>
        typeof item === 'string' ? JSON.parse(item) : item
    );

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, list });
  } catch (err) {
    console.error('GET /api/list failed:', err);
    return res.status(500).json({ error: 'Server error', list: [] });
  }
}