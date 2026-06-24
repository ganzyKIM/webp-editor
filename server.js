'use strict';

// 로컬 개발 시 .env 로드 (Vercel에서는 대시보드 환경변수가 자동 주입됨)
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch { /* dotenv 없어도 무시 */ }
}

const path    = require('path');
const crypto  = require('crypto');
const express = require('express');
const multer  = require('multer');
const os      = require('os');
const storage = require('./lib/storage');
const webp    = require('./lib/webp');

const app  = express();
const PORT = process.env.PORT || 3939;

// multer: 메모리 버퍼로 받음 (로컬 /tmp 에 의존하지 않기 위해)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB
  fileFilter: (req, file, cb) => {
    const ok = /webp|gif|image/i.test(file.mimetype) || /\.(webp|gif)$/i.test(file.originalname || '');
    cb(ok ? null : new Error('webp/gif 파일만 올려주세요'), ok);
  },
});

app.use(express.static(path.join(__dirname, 'public')));

// ── 헬스체크 ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ ok: true, storage: storage.USE_SUPABASE ? 'supabase' : 'local' }));

// ── 업로드 ────────────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없어요' });
  try {
    const token = crypto.randomBytes(10).toString('hex') + '.webp';
    await storage.put(token, req.file.buffer);            // Supabase or local
    const meta = await webp.inspect(req.file.buffer);    // Buffer 직접 검사
    res.json({ token, name: req.file.originalname, meta });
  } catch (e) {
    res.status(400).json({ error: '이미지를 읽지 못했어요: ' + e.message });
  }
});

// ── 원본 미리보기 ─────────────────────────────────────────────────────────────
app.get('/api/preview/:token', async (req, res) => {
  if (!safeToken(req.params.token)) return res.status(400).end();
  try {
    const buf = await storage.get(req.params.token);
    res.type('image/webp').send(buf);
  } catch {
    res.status(404).end();
  }
});

// ── 편집 + 내보내기 (SSE 스트리밍) ────────────────────────────────────────────
app.post('/api/export', express.json({ limit: '1mb' }), async (req, res) => {
  const { token, options } = req.body || {};
  if (!safeToken(token)) return res.status(400).json({ error: '잘못된 토큰이에요' });

  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection:      'keep-alive',
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const buf = await storage.get(token);                 // Supabase or local
    const { buffer, info } = await webp.edit(buf, options || {}, chunk => send('log', chunk));
    send('done', { info, webp: buffer.toString('base64') });
  } catch (e) {
    send('error', { message: e.message });
  } finally {
    res.end();
  }
});

function safeToken(t) {
  return t && /^[a-f0-9]{20}\.webp$/.test(t);
}

// ── 로컬 개발 전용 ────────────────────────────────────────────────────────────
storage.startLocalCleanup();

// Vercel: module.exports = app (listen 은 로컬 전용)
if (require.main === module) {
  app.listen(PORT, () => console.log(`\n  ♡ WebP 움짤 편집기 — http://localhost:${PORT}\n`));
}
module.exports = app;
