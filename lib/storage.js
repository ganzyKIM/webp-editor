'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  storage.js — 업로드 파일 영속 저장소 추상화
//
//  환경 변수 SUPABASE_URL + SUPABASE_SERVICE_KEY 가 있으면 Supabase Storage,
//  없으면 로컬 파일시스템(개발용).
//
//  Vercel 서버리스는 요청마다 새 인스턴스 → 로컬 /tmp 를 공유 못함.
//  Supabase Storage 가 업로드↔내보내기 요청 사이 파일 브릿지 역할.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const os = require('os');

const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

let sb;
if (USE_SUPABASE) {
  const { createClient } = require('@supabase/supabase-js');
  sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

const BUCKET = process.env.SUPABASE_BUCKET || 'webp-uploads';

// 로컬 폴백 디렉토리
const LOCAL_DIR = path.join(os.tmpdir(), 'webp-editor-uploads');
if (!USE_SUPABASE) fs.mkdirSync(LOCAL_DIR, { recursive: true });

/** Buffer → 저장소. token = 파일명(고유 ID). */
async function put(token, buffer) {
  if (USE_SUPABASE) {
    const { error } = await sb.storage.from(BUCKET).upload(token, buffer, {
      upsert: true,
      contentType: 'image/webp',
    });
    if (error) throw new Error('Supabase 업로드 실패: ' + error.message);
  } else {
    fs.writeFileSync(path.join(LOCAL_DIR, token), buffer);
  }
}

/** token → Buffer */
async function get(token) {
  if (USE_SUPABASE) {
    const { data, error } = await sb.storage.from(BUCKET).download(token);
    if (error) throw new Error('Supabase 다운로드 실패: ' + error.message);
    return Buffer.from(await data.arrayBuffer());
  } else {
    const p = path.join(LOCAL_DIR, token);
    if (!fs.existsSync(p)) throw new Error('원본 파일을 찾을 수 없어요 (다시 업로드해 주세요)');
    return fs.readFileSync(p);
  }
}

/** 저장소에서 삭제. 오류는 무시. */
async function remove(token) {
  try {
    if (USE_SUPABASE) {
      await sb.storage.from(BUCKET).remove([token]);
    } else {
      fs.rm(path.join(LOCAL_DIR, token), { force: true }, () => {});
    }
  } catch { /* ignore */ }
}

/** 로컬 오래된 파일 정리 (개발용, 1시간 이상) */
function startLocalCleanup() {
  if (USE_SUPABASE) return;
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    fs.readdir(LOCAL_DIR, (e, files) => {
      if (e) return;
      for (const f of files) {
        const fp = path.join(LOCAL_DIR, f);
        fs.stat(fp, (er, st) => { if (!er && st.mtimeMs < cutoff) fs.rm(fp, { force: true }, () => {}); });
      }
    });
  }, 15 * 60 * 1000).unref();
}

module.exports = { put, get, remove, startLocalCleanup, USE_SUPABASE };
