import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from './_redis.js';

const SOLVED_COUNTER_KEY = 'bday:solved_count';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const solved = await redis.incr(SOLVED_COUNTER_KEY);
        return res.status(200).json({ ok: true, solved });
    } catch (err) {
        console.error('Unlock error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
