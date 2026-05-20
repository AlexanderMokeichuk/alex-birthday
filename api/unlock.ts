import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from './_redis.js';

const CORRECT_PASSWORD = '20052001';
const SOLVED_COUNTER_KEY = 'bday:solved_count';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
        const inputPassword = String(body.password ?? '').trim();

        if (inputPassword !== CORRECT_PASSWORD) {
            return res.status(401).json({ ok: false });
        }

        const solvedCount = await redis.incr(SOLVED_COUNTER_KEY);

        return res.status(200).json({
            ok: true,
            solved: solvedCount,
        });
    } catch (err) {
        console.error('Unlock error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}