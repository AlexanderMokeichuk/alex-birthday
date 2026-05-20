import type { VercelRequest } from '@vercel/node';

export interface Congratulation {
  id: string;
  name: string | null;          // имя, которое чел сам ввёл
  googleName: string | null;    // настоящее имя из Google (если вошёл)
  googleEmail: string | null;
  message: string;
  emoji: string;
  // --- детектив (собрано на сервере / клиенте) ---
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;           // провайдер / ISP
  os: string;
  browser: string;
  language: string | null;
  timezone: string | null;
  screen: string | null;
  referrer: string | null;
  userAgent: string;
  created_at: string;
}

/**
 * Достаём реальный IP из заголовков Vercel.
 * Клиент это подделать через JS не может — заголовки ставит платформа/прокси.
 */
export function extractIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    // x-forwarded-for может быть списком "client, proxy1, proxy2" — берём первый
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(',')[0].trim();
  }
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string') return real;
  return 'unknown';
}

/**
 * Грубый, но рабочий парсер user-agent. Без зависимостей.
 */
export function parseUserAgent(ua: string): { os: string; browser: string } {
  const os = /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown';

  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Unknown';

  return { os, browser };
}

/**
 * Геолокация по IP через бесплатный ipwho.is (без ключа, без регистрации).
 * Приватные/локальные адреса пропускаем.
 */
type GeoResult = {
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
};
const EMPTY_GEO: GeoResult = { city: null, region: null, country: null, org: null };

function isPrivateIp(ip: string): boolean {
  return (
    !ip || ip === 'unknown' ||
    ip.startsWith('127.') || ip.startsWith('10.') ||
    ip.startsWith('192.168.') || ip === '::1' ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

// Провайдер 1: ipwho.is (без ключа)
async function viaIpwho(ip: string): Promise<GeoResult | null> {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    signal: AbortSignal.timeout(3500),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  if (!data || data.success === false) return null;
  return {
    city: data.city ?? null,
    region: data.region ?? null,
    country: data.country ?? null,
    org: data.connection?.isp ?? data.connection?.org ?? null,
  };
}

// Провайдер 2 (запасной): ipapi.co (без ключа)
async function viaIpapi(ip: string): Promise<GeoResult | null> {
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
    signal: AbortSignal.timeout(3500),
    headers: { 'User-Agent': 'birthday-site' },
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  if (!data || data.error) return null;
  return {
    city: data.city ?? null,
    region: data.region ?? null,
    country: data.country_name ?? null,
    org: data.org ?? null,
  };
}

export async function geolocate(ip: string): Promise<GeoResult> {
  if (isPrivateIp(ip)) return EMPTY_GEO;
  try {
    const primary = await viaIpwho(ip);
    if (primary && (primary.city || primary.country)) return primary;
  } catch { /* падаем на запасной */ }
  try {
    const fallback = await viaIpapi(ip);
    if (fallback) return fallback;
  } catch { /* возвращаем пустоту */ }
  return EMPTY_GEO;
}
