import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { redis, LIST_KEY } from './_redis.js';
import {
  extractIp, parseUserAgent, geolocate, type Congratulation,
} from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});

    const message = String(body.message ?? '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Пустое поздравление' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Слишком длинное сообщение' });
    }

    // --- Серверный детектив (клиент это не подделает) ---
    const ip = extractIp(req);
    const ua = String(req.headers['user-agent'] ?? '');
    const { os, browser } = parseUserAgent(ua);
    const geo = await geolocate(ip);

    const congrat: Congratulation = {
      id: randomUUID(),
      name: body.name ? String(body.name).trim().slice(0, 80) || null : null,
      googleName: body.googleName ? String(body.googleName).slice(0, 120) : null,
      googleEmail: body.googleEmail ? String(body.googleEmail).slice(0, 160) : null,
      message: message.slice(0, 2000),
      emoji: String(body.emoji ?? '🎉').slice(0, 8),
      ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      org: geo.org,
      os,
      browser,
      // эти поля приходят с клиента (их сервер не видит) — берём как есть, но обрезаем
      language: body.language ? String(body.language).slice(0, 16) : null,
      timezone: body.timezone ? String(body.timezone).slice(0, 64) : null,
      screen: body.screen ? String(body.screen).slice(0, 24) : null,
      referrer: body.referrer ? String(body.referrer).slice(0, 300) : null,
      userAgent: ua.slice(0, 400),
      created_at: new Date().toISOString(),
    };

    // lpush — новые сверху. Храним как JSON-строки.
    await redis.lpush(LIST_KEY, JSON.stringify(congrat));
    // на всякий — ограничим список 500 записями
    await redis.ltrim(LIST_KEY, 0, 499);

    // Клиенту возвращаем "что мы про него узнали" — для эффекта "я тебя спалил"
    return res.status(200).json({
      ok: true,
      detected: {
        city: congrat.city,
        region: congrat.region,
        country: congrat.country,
        org: congrat.org,
        os: congrat.os,
        browser: congrat.browser,
      },
    });
  } catch (err) {
    console.error('POST /api/congrats failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
