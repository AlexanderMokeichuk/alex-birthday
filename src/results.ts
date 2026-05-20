import './results.css';

interface Congratulation {
  id: string;
  name: string | null;
  googleName: string | null;
  googleEmail: string | null;
  message: string;
  emoji: string;
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
  os: string;
  browser: string;
  language: string | null;
  timezone: string | null;
  screen: string | null;
  referrer: string | null;
  userAgent: string;
  created_at: string;
}

const board = document.getElementById('board')!;
const totalBig = document.getElementById('totalBig')!;
const quickStats = document.getElementById('quickStats')!;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c
  ));
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function osEmoji(os: string): string {
  return os === 'iPhone' || os === 'iPad' ? '📱'
    : os === 'Android' ? '🤖'
    : os === 'Windows' ? '🪟'
    : os === 'macOS' ? '🍎'
    : os === 'Linux' ? '🐧' : '💻';
}

function field(label: string, value: string | null, full = false): string {
  if (!value) return '';
  return `<div class="ev-field${full ? ' full' : ''}">
    <span class="k">${label}</span>
    <span class="v">${escapeHtml(value)}</span>
  </div>`;
}

function renderCard(c: Congratulation, i: number): string {
  const rot = (((i * 37) % 5) - 2) * 0.7; // детерминированный «небрежный» наклон
  const displayName = c.name || (c.googleName ? c.googleName : 'Аноним 🕵️');
  const googleBadge = c.googleName
    ? `<span class="ev-google">✓ ${escapeHtml(c.googleName)}${c.googleEmail ? ' · ' + escapeHtml(c.googleEmail) : ''}</span>`
    : '';

  const locParts = [c.city, c.region, c.country].filter(Boolean).join(', ');

  const dossier = `
    <div class="ev-dossier">
      <div class="ev-dossier-label">🕵️ досье отправителя</div>
      <div class="ev-grid">
        ${field('Локация', locParts || null, true)}
        ${field('Провайдер', c.org, true)}
        ${field('Устройство', `${osEmoji(c.os)} ${c.os}`)}
        ${field('Браузер', c.browser)}
        ${field('Таймзона', c.timezone)}
        ${field('Экран', c.screen)}
        ${field('Язык', c.language)}
        ${field('Источник', c.referrer)}
      </div>
      ${c.ip && c.ip !== 'unknown' ? `<div class="ev-ip">🌐 ${escapeHtml(c.ip)}</div>` : ''}
    </div>`;

  return `
    <article class="evidence" style="--rot:${rot}deg; animation-delay:${Math.min(i * 0.04, 0.6)}s">
      <div class="ev-head">
        <div class="ev-emoji">${escapeHtml(c.emoji || '🎉')}</div>
        <div class="ev-who">
          <div class="ev-name">${escapeHtml(displayName)}</div>
          <div class="ev-date">${fmtDate(c.created_at)}</div>
          ${googleBadge}
        </div>
      </div>
      <div class="ev-msg">${escapeHtml(c.message)}</div>
      ${dossier}
    </article>`;
}

function renderStats(list: Congratulation[]) {
  const osMap: Record<string, number> = {};
  const cityMap: Record<string, number> = {};
  let identified = 0;

  list.forEach((c) => {
    osMap[c.os] = (osMap[c.os] || 0) + 1;
    if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1;
    if (c.googleName) identified++;
  });

  const topOs = Object.entries(osMap).sort((a, b) => b[1] - a[1])[0];
  const topCity = Object.entries(cityMap).sort((a, b) => b[1] - a[1])[0];

  const chips: string[] = [];
  chips.push(`<span class="r-chip">🕵️ опознано по имени: <b>${identified}</b></span>`);
  if (topCity) chips.push(`<span class="r-chip">📍 чаще всего: <b>${escapeHtml(topCity[0])}</b></span>`);
  if (topOs) chips.push(`<span class="r-chip">${osEmoji(topOs[0])} топ устройство: <b>${escapeHtml(topOs[0])}</b></span>`);
  quickStats.innerHTML = chips.join('');
}

function renderEmpty() {
  board.innerHTML = `
    <div class="r-empty">
      <div class="r-empty-emoji">🗂️</div>
      <div>Дело пока пустое</div>
      <div class="r-empty-sub">Никто ещё не попался. Жди первого «анонима».</div>
    </div>`;
  totalBig.textContent = '0';
  quickStats.innerHTML = '';
}

async function load() {
  const key = sessionStorage.getItem('dossier_key');

  if (!key) {
    window.location.href = '/';
    return;
  }

  try {
    const res = await fetch('/api/list', {
      cache: 'no-store',
      headers: {
        'X-Dossier-Password': key
      }
    });

    if (res.status === 403 || res.status === 401) {
      sessionStorage.removeItem('dossier_key'); // Чистим невалидный ключ
      window.location.href = '/';
      return;
    }

    const data = await res.json();
    const list: Congratulation[] = data.list || [];

    totalBig.textContent = String(list.length);

    if (typeof data.solved === 'number') {
      const c = document.getElementById('totalBig');
      if (c) c.title = `пароль отгадали ${data.solved} раз`;
    }

    if (list.length === 0) {
      renderEmpty();
      return;
    }

    renderStats(list);
    board.innerHTML = list.map((c, i) => renderCard(c, i)).join('');
  } catch (err) {
    console.error(err);
    board.innerHTML = `<div class="r-error">⚠️ Не удалось загрузить архив. Обнови страницу.</div>`;
  }
}

refreshBtn.addEventListener('click', () => {
  refreshBtn.classList.add('spin');
  load().finally(() => setTimeout(() => refreshBtn.classList.remove('spin'), 400));
});

load();
