# 🎂 Birthday Case File

Сайт-поздравлялка с детективным твистом: гости пишут «анонимные» открытки,
а ты в досье видишь, кто это на самом деле — город, провайдер, устройство, IP,
а если человек «подписался» через Google — то и настоящее имя.

## Стек
- **Front:** Vite + TypeScript (без фреймворков, чистый DOM)
- **Back:** Vercel Serverless Functions (`/api`)
- **Хранилище:** Upstash Redis (бесплатный тир)
- **Геолокация:** ipwho.is + ipapi.co (запасной), без ключей
- **Имена:** Google Identity (опционально)

---

## 🚀 Деплой на Vercel (5 минут)

### 1. Залей код
```bash
bun install        # или npm install
git init && git add . && git commit -m "init"
# запушь в GitHub, затем импортни репо на vercel.com
```
Либо сразу через CLI:
```bash
npm i -g vercel
vercel
```

### 2. Подключи хранилище (Upstash Redis)
В дашборде проекта на Vercel:
**Storage → Create Database → Upstash for Redis → Connect**

Vercel сам добавит переменные окружения `KV_REST_API_URL` и `KV_REST_API_TOKEN`
(или `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — код понимает оба варианта).
**Больше ничего настраивать не надо** — после этого детектив по IP работает.

> ⚠️ После подключения базы сделай **Redeploy**, чтобы переменные подхватились.

### 3. (Опционально) Включи настоящие имена через Google
1. https://console.cloud.google.com/apis/credentials
2. **Create Credentials → OAuth client ID → Web application**
3. В **Authorized JavaScript origins** добавь:
   - `https://ТВОЙ-ПРОЕКТ.vercel.app`
   - `http://localhost:5173` (для локального теста)
4. Скопируй **Client ID** и вставь в `src/config.ts`:
   ```ts
   export const GOOGLE_CLIENT_ID = '1234...apps.googleusercontent.com';
   ```
5. Закоммить и задеплой. Готово — в модалке появится «Войти через Google».

Если оставить `GOOGLE_CLIENT_ID = ''` — блок Google просто не покажется,
сайт работает без него (детектив по IP всё равно пашет).

---

## 🧪 Локальный запуск
```bash
bun install
bun run dev        # фронт на http://localhost:5173
```
> Локально `/api/*` не работает (нужен `vercel dev` + переменные Upstash).
> Для полноценного локального теста: `vercel dev`.

---

## 📁 Что где
```
api/
  _lib.ts        — парсинг IP, user-agent, геолокация (2 провайдера)
  _redis.ts      — клиент Upstash
  congrats.ts    — POST: сохранить открытку + снять детектив
  list.ts        — GET: отдать все открытки
src/
  config.ts      — единственное место для GOOGLE_CLIENT_ID
  main.ts        — главная: салют, модалка, отправка, "тебя вычислили"
  results.ts     — доска досье
  styles.css     — стиль главной
  results.css    — стиль доски
index.html       — главная
results.html     — /results — доска досье
```

---

## 🔒 Этика (важно)
Это пранк среди друзей. Не выкладывай чужие IP в публичный доступ
и не используй данные всерьёз. `/results` — твоя приватная страница;
если хочешь, закрой её паролем (могу помочь добавить).
