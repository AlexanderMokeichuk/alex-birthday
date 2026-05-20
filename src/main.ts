import './styles.css';
import {GOOGLE_CLIENT_ID} from './config';
import {MOODS} from './moods';

// ============================================================
//  CANVAS + САЛЮТ
// ============================================================
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let W = 0, H = 0;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
}

interface Star {
    x: number;
    y: number;
    r: number;
    a: number;
    s: number;
}

let stars: Star[] = [];

function buildStars() {
    stars = Array.from({length: 160}, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.2 + Math.random() * 1.0,
        a: Math.random() * Math.PI * 2,
        s: 0.003 + Math.random() * 0.008,
    }));
}

const COLORS = ['#ffffff', '#ffb02e', '#e23744', '#ff9de2', '#93c5fd', '#6ee7b7', '#fdba74'];
const MAX_PARTICLES = 600;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    type: 'spark' | 'trail' | 'flash';
    radius?: number;
}

let particles: Particle[] = [];

function addSpark(x: number, y: number, vx: number, vy: number, color: string, life: number, size: number) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({x, y, vx, vy, life, maxLife: life, color, size, type: 'spark'});
}

function addTrail(x: number, y: number) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.2,
        life: 16 + Math.random() * 12, maxLife: 28,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 0.5 + Math.random() * 1.2, type: 'trail',
    });
}

function addFlash(x: number, y: number, color: string) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({x, y, vx: 0, vy: 0, life: 10, maxLife: 10, color, size: 0, type: 'flash', radius: 80});
}


interface Rocket {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    trail: { x: number; y: number }[];
}

const MAX_ROCKETS = 12;
let rockets: Rocket[] = [];

function launchRocket(x: number, y: number) {
    if (rockets.length >= MAX_ROCKETS) return;
    rockets.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: -9 - Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        trail: [],
    });
}

function explodeRocket(r: Rocket) {
    const n = 80 + Math.floor(Math.random() * 40);
    const c2 = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i + Math.random() * 0.2;
        const speed = 1 + Math.random() * 5;
        addSpark(r.x, r.y, Math.cos(angle) * speed, Math.sin(angle) * speed,
            Math.random() > 0.4 ? r.color : c2, 50 + Math.random() * 40, 1.5 + Math.random() * 2);
    }
    addFlash(r.x, r.y, r.color);
}

// ---- водопад эмодзи (фоновый, для атмосферы) ----
const FLOAT_EMOJIS = MOODS.map((i) => {
    return i.emoji
});
let floatTimer = 0;

function spawnFloat() {
    const el = document.createElement('div');
    el.textContent = FLOAT_EMOJIS[Math.floor(Math.random() * FLOAT_EMOJIS.length)];
    const size = 22 + Math.random() * 20;
    const left = 3 + Math.random() * 94;
    const dur = 8 + Math.random() * 6;
    el.style.cssText = `position:fixed;bottom:-80px;left:${left}vw;font-size:${size}px;` +
        `pointer-events:none;z-index:5;animation:floatUp ${dur}s linear forwards;` +
        `user-select:none;line-height:1;opacity:0.7;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000 + 500);
}

// ---- курсор ----
const cursorEl = document.getElementById('cursor')!;
let mx = 0, my = 0, trailTimer = 0, autoTimer = 0;

document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursorEl.style.transform = `translate(${mx - 5}px, ${my - 5}px)`;
});

function refreshCursorTargets() {
    document.querySelectorAll('button, input, textarea, a, .eb').forEach((el) => {
        el.addEventListener('mouseenter', () => cursorEl.classList.add('big'));
        el.addEventListener('mouseleave', () => cursorEl.classList.remove('big'));
    });
}

// ВАЖНО: ловим все интерактивные элементы, чтобы клик по ним
// не "проваливался" в запуск салюта (это и ломало крестик).
function isInteractive(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return !!el?.closest(
        '.modal, .reveal-card, .gate-modal, button, a, input, textarea, svg, .overlay.show'
    );
}

document.addEventListener('click', (e) => {
    if (isInteractive(e.target)) return;
    launchRocket(e.clientX, e.clientY);
});
document.addEventListener('touchstart', (e) => {
    if (isInteractive(e.target)) return;
    const t = e.touches[0];
    launchRocket(t.clientX, t.clientY);
}, {passive: true});

// ---- основной луп ----
function loop() {
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(0, 0, W, H);

    const vg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(60,20,30,0.35)');
    vg.addColorStop(1, 'rgba(11,10,15,1)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    stars.forEach((s) => {
        s.a += s.s;
        const alpha = 0.08 + Math.abs(Math.sin(s.a)) * 0.9;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,220,${alpha})`;
        ctx.fill();
    });

    autoTimer++;
    if (autoTimer % 720 === 0) launchRocket(120 + Math.random() * (W - 240), H);

    trailTimer++;
    if (trailTimer % 4 === 0 && mx > 0 && my > 0) addTrail(mx, my);

    floatTimer++;
    if (floatTimer % 14 === 0) spawnFloat();

    rockets = rockets.filter((r) => {
        r.trail.push({x: r.x, y: r.y});
        if (r.trail.length > 10) r.trail.shift();
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.14;
        if (r.vy >= 0) {
            explodeRocket(r);
            return false;
        }
        r.trail.forEach((p, i) => {
            const a = (i / r.trail.length) * 0.7;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = r.color;
            ctx.shadowBlur = 4;
            ctx.shadowColor = r.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5 * (i / r.trail.length), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = r.color;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
    });

    particles = particles.filter((p) => {
        p.life--;
        if (p.life <= 0) return false;
        const a = p.life / p.maxLife;
        if (p.type === 'flash') {
            const rad = (p.radius ?? 80) * a;
            ctx.save();
            ctx.globalAlpha = a * 0.45;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
            g.addColorStop(0, p.color);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return true;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'spark') {
            p.vy += 0.05;
            p.vx *= 0.98;
        }
        ctx.save();
        ctx.globalAlpha = a * (p.type === 'trail' ? 0.5 : 1);
        ctx.shadowBlur = p.type === 'spark' ? 6 : 3;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.type === 'spark' ? a : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
    });

    requestAnimationFrame(loop);
}

// ============================================================
//  НАСТРОЕНИЯ (SVG-иконки из moods.ts)
// ============================================================
const overlay = document.getElementById('overlay')!;
const ep = document.getElementById('ep')!;
let selEmoji = MOODS[0].emoji;

MOODS.forEach((mood, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eb' + (i === 0 ? ' on' : '');
    btn.innerHTML = mood.svg;
    btn.title = mood.label;
    btn.setAttribute('aria-label', mood.label);
    btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        document.querySelectorAll('.eb').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
        selEmoji = mood.emoji;
    });
    ep.appendChild(btn);
});

// ============================================================
//  GOOGLE SIGN-IN
// ============================================================
let googleName: string | null = null;
let googleEmail: string | null = null;

function decodeJwt(token: string): any {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
        return {};
    }
}

function onGoogleCredential(resp: { credential: string }) {
    const data = decodeJwt(resp.credential);
    googleName = data.name ?? null;
    googleEmail = data.email ?? null;
    const done = document.getElementById('gdone')!;
    const gname = document.getElementById('gname')!;
    const gbtn = document.getElementById('gbtn')!;
    gname.textContent = googleName ?? googleEmail ?? 'друг';
    done.hidden = false;
    gbtn.style.display = 'none';
}

function initGoogle() {
    const gsign = document.getElementById('gsign')!;
    if (!GOOGLE_CLIENT_ID) {
        gsign.style.display = 'none';
        return;
    }
    // @ts-expect-error google глобал из gsi/client
    const g = window.google;
    if (!g?.accounts?.id) {
        setTimeout(initGoogle, 400);
        return;
    }
    g.accounts.id.initialize({client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential});
    g.accounts.id.renderButton(document.getElementById('gbtn'), {
        theme: 'filled_black', size: 'medium', shape: 'pill', text: 'signin',
    });
}

// ============================================================
//  ОСКОЛКИ (закрытие модалки поздравления)
// ============================================================
function shatter(done: () => void) {
    const modal = document.getElementById('modal')!;
    const rect = modal.getBoundingClientRect();
    const cols = 6, rows = 5;
    const pw = rect.width / cols, ph = rect.height / rows;
    const frags: HTMLElement[] = [];
    const bg = getComputedStyle(modal).backgroundColor;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const f = document.createElement('div');
            const d = Math.random() * 0.12;
            const dur = 0.3 + Math.random() * 0.3;
            f.className = 'frag';
            f.style.cssText =
                `left:${rect.left + c * pw}px;top:${rect.top + r * ph}px;` +
                `width:${pw}px;height:${ph}px;background:${bg};` +
                `border:1px solid rgba(0,0,0,0.06);` +
                `transition:transform ${dur}s cubic-bezier(.4,0,.6,1) ${d}s,opacity ${dur * 0.7}s ease ${d}s;`;
            document.body.appendChild(f);
            frags.push(f);
        }
    }
    modal.style.opacity = '0';
    overlay.classList.remove('show');

    requestAnimationFrame(() => requestAnimationFrame(() => {
        frags.forEach((f) => {
            const tx = (Math.random() - 0.5) * 500;
            const ty = (Math.random() - 0.5) * 500;
            const rot = (Math.random() - 0.5) * 700;
            f.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${Math.random() * 0.2})`;
            f.style.opacity = '0';
        });
        setTimeout(() => {
            frags.forEach((f) => f.remove());
            modal.style.opacity = '1';
            done();
        }, 750);
    }));
}

// --- Открытие/закрытие модалки поздравления (ОДИН набор обработчиков!) ---
const congBtn = document.getElementById('congBtn')!;
const modalClose = document.getElementById('mx')!;

congBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.classList.add('show');
});

modalClose.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (overlay.classList.contains('show')) shatter(() => {
    });
});

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) shatter(() => {
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) shatter(() => {
    });
});

// ============================================================
//  ОТПРАВКА НА СЕРВЕР + REVEAL "тебя вычислили"
// ============================================================
const reveal = document.getElementById('reveal')!;
const revealList = document.getElementById('revealList')!;

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => (
        {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c] || c
    ));
}

function showReveal(detected: Record<string, string | null>) {
    const rows: [string, string | null][] = [
        ['Город', detected.city],
        ['Регион', detected.region],
        ['Провайдер', detected.org],
        ['Устройство', detected.os],
        ['Браузер', detected.browser],
    ];
    revealList.innerHTML = '';
    let shown = 0;
    rows.forEach(([k, v]) => {
        if (!v) return;
        const li = document.createElement('li');
        li.style.animationDelay = `${shown * 0.12}s`;
        li.innerHTML = `<span class="k">${k}</span><span class="v">${escapeHtml(v)}</span>`;
        revealList.appendChild(li);
        shown++;
    });
    if (shown === 0) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="k">Хм</span><span class="v">ты хорошо спрятался… пока</span>`;
        revealList.appendChild(li);
    }
    reveal.classList.add('show');
}

document.getElementById('revealClose')!.addEventListener('click', () => {
    reveal.classList.remove('show');
    for (let i = 0; i < 6; i++) {
        setTimeout(() => launchRocket(100 + Math.random() * (W - 200), H), i * 180);
    }
});

const sb = document.getElementById('sb') as HTMLButtonElement;
const sbText = document.getElementById('sbText')!;
const sbSpin = document.getElementById('sbSpin')!;

sb.addEventListener('click', async (e) => {
    e.stopPropagation();
    const mi = document.getElementById('mi') as HTMLTextAreaElement;
    const ni = document.getElementById('ni') as HTMLInputElement;
    const msg = mi.value.trim();
    if (!msg) {
        mi.style.borderColor = 'var(--accent)';
        mi.focus();
        setTimeout(() => (mi.style.borderColor = ''), 1200);
        return;
    }

    sb.disabled = true;
    sbText.textContent = 'отправляю…';
    sbSpin.hidden = false;

    const payload = {
        name: ni.value.trim() || null,
        googleName, googleEmail,
        message: msg,
        emoji: selEmoji,
        language: navigator.language || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        screen: `${screen.width}x${screen.height}`,
        referrer: document.referrer || 'direct',
    };

    try {
        const res = await fetch('/api/congrats', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'fail');

        ni.value = '';
        mi.value = '';
        sb.disabled = false;
        sbText.textContent = 'Отправить';
        sbSpin.hidden = true;

        shatter(() => {
            showReveal(data.detected || {});
        });
    } catch (err) {
        console.error(err);
        sb.disabled = false;
        sbText.textContent = 'ошибка, ещё раз';
        sbSpin.hidden = true;
        setTimeout(() => (sbText.textContent = 'Отправить'), 2000);
    }
});

// ============================================================
//  МОДАЛКА ПАРОЛЯ — УПРОЩЁННАЯ ЛОКАЛЬНАЯ ВЕРСИЯ
// ============================================================
const gateOverlay = document.getElementById('gateOverlay')!;
const gateBtn = document.getElementById('gateBtn')!;
const gatePass = document.getElementById('gatePass') as HTMLInputElement;
const gateError = document.getElementById('gateError')!;
const gateSubmit = document.getElementById('gateSubmit') as HTMLButtonElement;
const gateSubmitText = document.getElementById('gateSubmitText')!;

const CORRECT_PASSWORD = '20052001';

// Открытие модалки
gateBtn.addEventListener('click', () => {
    gateOverlay.classList.add('show');
    setTimeout(() => gatePass.focus(), 200);
});

// Закрытие
document.getElementById('gateClose')!.addEventListener('click', () => {
    gateOverlay.classList.remove('show');
    gatePass.value = '';
    gateError.hidden = true;
});

gateOverlay.addEventListener('click', (e) => {
    if (e.target === gateOverlay) gateOverlay.classList.remove('show');
});

// Проверка пароля
function tryUnlock() {
    const password = gatePass.value.trim();

    if (password !== CORRECT_PASSWORD) {
        gateError.hidden = false;
        gatePass.value = '';
        gatePass.focus();
        return;
    }

    // Успех!
    gateSubmitText.textContent = 'открываем...';

    // Сохраняем ключ
    sessionStorage.setItem('dossier_key', password);

    // Салют
    for (let i = 0; i < 6; i++) {
        setTimeout(() => launchRocket(100 + Math.random() * (W - 200), H), i * 120);
    }

    // Переход на results
    setTimeout(() => {
        window.location.href = '/results.html';
    }, 800);
}

// Enter + кнопка
gatePass.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
});

gateSubmit.addEventListener('click', tryUnlock);

// === ОГРАНИЧЕНИЕ ТОЛЬКО ЦИФРЫ В ПОЛЕ ПАРОЛЯ ===
if (gatePass) {
    gatePass.addEventListener('input', (e) => {
        const input = e.target as HTMLInputElement;
        input.value = input.value.replace(/[^0-9]/g, '');
    });

    // Запрет вставки текста (букв, символов)
    gatePass.addEventListener('paste', (e) => {
        const pasted = (e.clipboardData || (window as any).clipboardData)?.getData('text') || '';
        if (!/^\d+$/.test(pasted)) {
            e.preventDefault();
        }
    });
}

// ============================================================
//  СТАРТ
// ============================================================
window.addEventListener('resize', resize);
resize();
refreshCursorTargets();
initGoogle();
loop();