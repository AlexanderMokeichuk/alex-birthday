import { Redis } from '@upstash/redis';

// Переменные приходят из Vercel (Integration Upstash их добавит автоматически),
// либо задаются вручную в Project Settings → Environment Variables.
// НИКОГДА не хардкодим токены здесь.
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const LIST_KEY = 'bday:congrats';
