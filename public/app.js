'use strict';
/* WEBP.EXE — 움짤 편집기 프론트엔드 */

const $ = (s) => document.querySelector(s);

const state = {
  token: null,
  name: null,
  meta: null,       // {width,height,pages,fps,delays,loop,size}
  crop: null,       // 표시좌표 {x,y,w,h} (cropLayer 기준)
  cropMode: false,
  fpsAuto: true,
};

/* ── DOM ── */
const stage    = $('#stage');
const preview  = $('#preview');
const emptyState = $('#emptyState');
const cropLayer  = $('#cropLayer');
const cropBox    = $('#cropBox');
const cropDimLabel = $('#cropDimLabel');
const fileInput  = $('#fileInput');
const consoleEl  = $('#console');
const statusEl   = $('#status');

/* ════════ 로깅 ════════ */
function log(text) { consoleEl.textContent += text; consoleEl.scrollTop = consoleEl.scrollHeight; }
function setStatus(s) { statusEl.textContent = s; }

/* ════════ 파일 업로드 ════════ */
$('#loadBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) uploadFile(e.target.files[0]); });

['dragenter','dragover'].forEach(ev =>
  stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev =>
  stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.remove('dragover'); }));
stage.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) uploadFile(f); });

async function uploadFile(file) {
  if (!/\.(webp|gif)$/i.test(file.name) && !/webp|gif/i.test(file.type)) {
    log(`\n✘ ${file.name} : webp 또는 gif 움짤만 올려주세요\n`); return;
  }
  setStatus('업로드 중...');
  log(`\n> "${file.name}" 업로드 중... (${fmtBytes(file.size)})\n`);
  const fd = new FormData(); fd.append('file', file);
  try {
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '업로드 실패');
    state.token = data.token; state.name = data.name; state.meta = data.meta;
    onLoaded();
  } catch (err) {
    if (err instanceof TypeError) {
      log(`✘ 서버에 연결하지 못했어요 (Failed to fetch)\n` +
          `   · 브라우저 주소가 http://localhost:3939 인지 확인해 주세요\n` +
          `   · 터미널에서 'npm start' 가 실행 중인지 확인해 주세요\n`);
      setStatus('서버 연결 실패 — npm start / localhost:3939 확인');
    } else {
      log(`✘ ${err.message}\n`); setStatus('업로드 실패');
    }
  }
}

/* 시작 시 백엔드 생존 확인 */
(async function healthCheck() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    log(`✔ 백엔드 연결 OK (${location.origin})\n`);
  } catch {
    log(`\n⚠ 백엔드에 연결되지 않았어요!\n` +
        `   터미널에서  npm start  실행 후  http://localhost:3939  로 접속해 주세요. ♡\n`);
    setStatus('⚠ 백엔드 미연결 — localhost:3939 로 접속하세요');
  }
})();

function onLoaded() {
  const m = state.meta;
  preview.src = `/api/preview/${state.token}?t=${Date.now()}`;
  preview.hidden = false; emptyState.hidden = true;
  $('#filename').textContent = state.name;
  log(`✔ 로드 완료 — ${m.width}×${m.height}, ${m.pages}프레임, ` +
      `${m.animated ? m.fps + 'fps' : '정지영상'}, ${fmtBytes(m.size)}\n`);
  if (!m.animated) log(`  (※ 정지 webp예요 — 크롭/리사이즈는 되지만 움짤은 아니에요)\n`);

  // 컨트롤 활성화
  $('#exportBtn').disabled = false;
  $('#cropToggle').disabled = false;
  $('#fps').disabled = false;
  $('#fps').value = Math.round(m.fps);
  state.fpsAuto = true;
  $('#fpsVal').textContent = `${m.fps} (자동)`;

  // 크롭 숫자 입력 활성화 + 원본 크기로 초기화
  enableCropInputs(m);

  resetScale();
  clearCrop();
  setStatus(`준비됨 — ${state.name} ♡`);
  setTimeout(syncCropLayer, 60);
}

preview.addEventListener('load', syncCropLayer);
window.addEventListener('resize', () => { syncCropLayer(); if (state.crop) syncCropInputsFromState(); });

/* cropLayer를 표시된 이미지 영역에 정확히 맞춘다 */
function syncCropLayer() {
  if (preview.hidden) return;
  const ir = preview.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  cropLayer.style.left   = (ir.left - sr.left) + 'px';
  cropLayer.style.top    = (ir.top  - sr.top)  + 'px';
  cropLayer.style.width  = ir.width  + 'px';
  cropLayer.style.height = ir.height + 'px';
  if (state.crop) drawCropBox();
}

/* ════════ 크롭 (드래그) ════════ */
$('#cropToggle').addEventListener('click', () => {
  state.cropMode = !state.cropMode;
  updateCropVisibility();
  $('#cropToggle').classList.toggle('active', state.cropMode);
  $('#cropToggle').textContent = state.cropMode ? '✂ 크롭 ON' : '✂ 크롭 모드';
  setStatus(state.cropMode ? '드래그해서 영역을 그려보세요 ✂' : '준비됨 ♡');
});
$('#cropReset').addEventListener('click', clearCrop);

function updateCropVisibility() {
  const show = state.cropMode || !!state.crop;
  cropLayer.hidden = !show;
  cropLayer.style.pointerEvents = state.cropMode ? 'auto' : 'none';
  cropBox.hidden = !state.crop;
  if (show) setTimeout(syncCropLayer, 0);
}

function clearCrop() {
  state.crop = null;
  $('#cropReset').disabled = true;
  cropDimLabel.textContent = '';
  updateCropVisibility();
  updateOutDims();
  // 숫자 입력을 원본 전체 크기로 리셋
  if (state.meta) setCropInputValues(0, 0, state.meta.width, state.meta.height);
}

let dragStart = null, dragMode = null;

cropLayer.addEventListener('mousedown', e => {
  const lr = cropLayer.getBoundingClientRect();
  const x = e.clientX - lr.left, y = e.clientY - lr.top;
  if (e.target.classList.contains('handle')) {
    dragMode = e.target.classList[1];
  } else if (e.target === cropBox || cropBox.contains(e.target)) {
    dragMode = 'move';
  } else {
    dragMode = 'new';
    state.crop = { x, y, w: 0, h: 0 };
  }
  dragStart = { x, y, crop: { ...state.crop } };
  e.preventDefault();
});

window.addEventListener('mousemove', e => {
  if (!dragMode) return;
  const lr = cropLayer.getBoundingClientRect();
  const x = clamp(e.clientX - lr.left, 0, lr.width);
  const y = clamp(e.clientY - lr.top,  0, lr.height);
  const c = state.crop, s = dragStart;
  if (dragMode === 'new') {
    c.x = Math.min(s.x, x); c.y = Math.min(s.y, y);
    c.w = Math.abs(x - s.x); c.h = Math.abs(y - s.y);
  } else if (dragMode === 'move') {
    c.x = clamp(s.crop.x + (x - s.x), 0, lr.width  - c.w);
    c.y = clamp(s.crop.y + (y - s.y), 0, lr.height - c.h);
  } else {
    const o = s.crop;
    if (dragMode.includes('w')) { c.x = Math.min(x, o.x+o.w); c.w = Math.abs(o.x+o.w - x); }
    if (dragMode.includes('e')) { c.x = Math.min(o.x, x);     c.w = Math.abs(x - o.x);     }
    if (dragMode.includes('n')) { c.y = Math.min(y, o.y+o.h); c.h = Math.abs(o.y+o.h - y); }
    if (dragMode.includes('s')) { c.y = Math.min(o.y, y);     c.h = Math.abs(y - o.y);     }
  }
  drawCropBox();
  syncCropInputsFromState(); // 드래그 중 숫자 실시간 반영
  updateOutDims();
});

window.addEventListener('mouseup', () => {
  if (dragMode === 'new' && state.crop && (state.crop.w < 6 || state.crop.h < 6)) {
    clearCrop();
  } else if (state.crop && state.crop.w >= 6) {
    cropBox.hidden = false;
    $('#cropReset').disabled = false;
  }
  dragMode = null; dragStart = null;
});

/* 크롭 박스 그리기 + 픽셀 라벨 업데이트 */
function drawCropBox() {
  const c = state.crop; if (!c) return;
  cropBox.style.left   = c.x + 'px';
  cropBox.style.top    = c.y + 'px';
  cropBox.style.width  = c.w + 'px';
  cropBox.style.height = c.h + 'px';
  cropBox.hidden = false;

  // 박스 위 픽셀 치수 라벨
  const px = cropToOriginal();
  if (px) {
    cropDimLabel.textContent = `${px.width} × ${px.height} px`;
    // 박스가 이미지 상단에 가까우면 라벨을 박스 안쪽 위로
    cropDimLabel.style.bottom = c.y < 20 ? 'auto' : 'calc(100% + 3px)';
    cropDimLabel.style.top    = c.y < 20 ? '2px'  : 'auto';
  }
}

/* 표시좌표 → 원본 픽셀 (cropLayer가 hidden이어도 preview.getBoundingClientRect 사용) */
function cropToOriginal() {
  if (!state.crop || state.crop.w < 6 || !state.meta) return null;
  const ir = preview.getBoundingClientRect();
  if (!ir.width || !ir.height) return null;
  const sx = state.meta.width  / ir.width;
  const sy = state.meta.height / ir.height;
  const c = state.crop;
  return {
    left:   Math.round(c.x * sx),
    top:    Math.round(c.y * sy),
    width:  Math.round(c.w * sx),
    height: Math.round(c.h * sy),
  };
}

/* 원본 픽셀 → 표시좌표 (숫자 입력 → 드래그 오버레이 동기화) */
function pixelCropToDisplay(left, top, width, height) {
  const ir = preview.getBoundingClientRect();
  if (!ir.width || !ir.height || !state.meta) return null;
  const sx = ir.width  / state.meta.width;
  const sy = ir.height / state.meta.height;
  return { x: left * sx, y: top * sy, w: width * sx, h: height * sy };
}

/* ════════ 크롭 숫자 입력 ════════ */
function enableCropInputs(m) {
  ['cropX','cropY','cropW','cropH'].forEach(id => { $(('#'+id)).disabled = false; });
  $('#cropApply').disabled = false;
  $('#cropFull').disabled  = false;
  $('#cropPxHint').textContent = `원본: ${m.width} × ${m.height} px`;
  setCropInputValues(0, 0, m.width, m.height);
}

function setCropInputValues(x, y, w, h) {
  $('#cropX').value = x; $('#cropY').value = y;
  $('#cropW').value = w; $('#cropH').value = h;
}

/* 드래그 → 숫자 입력으로 밀어넣기 */
function syncCropInputsFromState() {
  const px = cropToOriginal();
  if (!px) return;
  setCropInputValues(px.left, px.top, px.width, px.height);
}

/* 숫자 입력 → 드래그 오버레이로 밀어넣기 (Apply 버튼 / Enter) */
function applyCropFromInputs() {
  if (!state.meta) return;
  const m = state.meta;
  let x = parseInt($('#cropX').value, 10) || 0;
  let y = parseInt($('#cropY').value, 10) || 0;
  let w = parseInt($('#cropW').value, 10) || 0;
  let h = parseInt($('#cropH').value, 10) || 0;
  // 경계 클램프
  x = clamp(x, 0, m.width  - 1);
  y = clamp(y, 0, m.height - 1);
  w = clamp(w, 1, m.width  - x);
  h = clamp(h, 1, m.height - y);
  setCropInputValues(x, y, w, h);

  // 표시좌표로 변환하여 state.crop 갱신
  const disp = pixelCropToDisplay(x, y, w, h);
  if (!disp) return;
  state.crop = disp;
  updateCropVisibility();
  drawCropBox();
  $('#cropReset').disabled = false;
  updateOutDims();
}

$('#cropApply').addEventListener('click', applyCropFromInputs);
$('#cropFull').addEventListener('click', () => {
  if (!state.meta) return;
  setCropInputValues(0, 0, state.meta.width, state.meta.height);
  clearCrop(); // 전체 = 크롭 없음과 동일
});

// 숫자 입력에서 Enter = Apply
['cropX','cropY','cropW','cropH'].forEach(id => {
  $(('#'+id)).addEventListener('keydown', e => { if (e.key === 'Enter') applyCropFromInputs(); });
});

/* ════════ 해상도 ════════ */
let scalePct = 100;
function resetScale() {
  scalePct = 100;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.pct === '100'));
  $('#targetW').value = '';
  updateOutDims();
}
document.querySelectorAll('.seg-btn').forEach(b =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); scalePct = +b.dataset.pct; $('#targetW').value = ''; updateOutDims();
  }));
$('#targetW').addEventListener('input', () => {
  document.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active'));
  updateOutDims();
});

function updateOutDims() {
  if (!state.meta) return;
  const base = cropToOriginal() || { width: state.meta.width, height: state.meta.height };
  let w = base.width, h = base.height;
  const tw = parseInt($('#targetW').value, 10);
  if (tw > 0) { const r = tw / base.width; w = tw; h = Math.round(base.height * r); }
  else if (scalePct !== 100) { w = Math.round(base.width * scalePct / 100); h = Math.round(base.height * scalePct / 100); }
  $('#autoH').textContent  = `× ${h}`;
  $('#dimsLabel').textContent = `출력 ${w}×${h} · ${state.meta.pages}프레임`;
}

/* ════════ 화질 / fps ════════ */
$('#quality').addEventListener('input', e => $('#qualVal').textContent = e.target.value);
$('#fps').addEventListener('input', e => { state.fpsAuto = false; $('#fpsVal').textContent = e.target.value; });
$('#fpsAuto').addEventListener('click', () => {
  if (!state.meta) return;
  state.fpsAuto = true;
  $('#fps').value = Math.round(state.meta.fps);
  $('#fpsVal').textContent = `${state.meta.fps} (자동)`;
});

/* ════════ Export (SSE) ════════ */
$('#exportBtn').addEventListener('click', doExport);

async function doExport() {
  if (!state.token) return;
  const btn = $('#exportBtn'); btn.disabled = true; btn.textContent = '⏳ 변환 중...';
  $('#downloadLink').hidden = true; $('#resultCard').hidden = true;
  setStatus('변환 중... ♨');

  const options = {
    quality: +$('#quality').value,
    lossless: $('#lossless').checked,
    crop: cropToOriginal(),
    fps: state.fpsAuto ? undefined : +$('#fps').value,
  };
  const tw = parseInt($('#targetW').value, 10);
  if (tw > 0) options.scale = { width: tw };
  else if (scalePct !== 100) options.scale = { percent: scalePct };

  log(`\n──────── EXPORT ────────\n`);
  try {
    const r = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: state.token, options }),
    });
    await readSSE(r.body, onSSE);
  } catch (err) {
    log(`✘ ${err.message}\n`); setStatus('변환 실패 (；´д｀)');
  }
  btn.disabled = false; btn.textContent = '💾 변환 & 저장 (Export)';
}

function onSSE(event, data) {
  if (event === 'log')   log(data);
  else if (event === 'error') { log(`\n✘ 에러: ${data.message}\n`); setStatus('변환 실패 (；´д｀)'); }
  else if (event === 'done')  showResult(data);
}

function showResult({ info, webp }) {
  const url = URL.createObjectURL(b64ToBlob(webp, 'image/webp'));
  $('#resultThumb').src = url;
  const base = (state.name || 'output').replace(/\.[^.]+$/, '');
  const dl = $('#downloadLink');
  dl.href = url; dl.download = `${base}_edited.webp`; dl.hidden = false;
  $('#rOut').textContent    = `${info.width}×${info.height}`;
  $('#rFrames').textContent = `${info.pages}프레임 · ${info.fps}fps`;
  $('#rSize').textContent   = fmtBytes(info.size);
  $('#rRatio').textContent  = info.ratio != null ? `${info.ratio}%` : '—';
  $('#resultCard').hidden = false;
  setStatus(`완료 ♡ ${fmtBytes(info.size)} 저장 준비됨`);
}

/* SSE 파싱 */
async function readSSE(stream, cb) {
  const reader = stream.getReader();
  const dec = new TextDecoder(); let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
      let ev = 'message', dat = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) dat += line.slice(5).trim();
      }
      if (dat) { try { cb(ev, JSON.parse(dat)); } catch { /* ignore */ } }
    }
  }
}

/* ════════ 탭 전환 ════════ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    $('#paneEdit').hidden    = target !== 'edit';
    $('#paneConvert').hidden = target !== 'convert';
    $('#menuHint').textContent = target === 'convert'
      ? '♡ mp4 · webm · mov 영상을 WebP 움짤로 변환해요 ♡'
      : '♡ drag 해서 크롭 영역을 그려보아요 ♡';
  });
});

/* ════════ 영상→움짤 탭 ════════ */
const cvState = { token: null, meta: null, uploading: false };

const cvStage    = $('#cvStage');
const cvPreview  = $('#cvPreview');
const cvEmpty    = $('#cvEmpty');
const cvFileInput = $('#cvFileInput');

$('#cvLoadBtn').addEventListener('click', () => cvFileInput.click());
cvFileInput.addEventListener('change', e => { if (e.target.files[0]) cvHandleFile(e.target.files[0]); });

['dragenter','dragover'].forEach(ev =>
  cvStage.addEventListener(ev, e => { e.preventDefault(); cvStage.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev =>
  cvStage.addEventListener(ev, e => { e.preventDefault(); cvStage.classList.remove('dragover'); }));
cvStage.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (f) cvHandleFile(f);
});

async function cvHandleFile(file) {
  if (!/\.(mp4|webm|mov)$/i.test(file.name) && !/^video\//i.test(file.type)) {
    log(`\n✘ ${file.name} : mp4/webm/mov 파일만 올려주세요\n`); return;
  }
  if (cvState.uploading) return;
  cvState.uploading = true;

  // 로컬 미리보기 즉시 표시
  cvPreview.src = URL.createObjectURL(file);
  cvPreview.hidden = false;
  cvEmpty.hidden = true;
  $('#cvFilename').textContent = file.name;
  setStatus('업로드 중...');
  log(`\n> "${file.name}" 업로드 중... (${fmtBytes(file.size)})\n`);

  try {
    const urlRes = await fetch('/api/video-upload-url').then(r => r.json());
    if (urlRes.error) throw new Error(urlRes.error);

    if (urlRes.signedUrl) {
      // Supabase 직접 업로드 (Vercel 4.5MB 제한 우회)
      log(`> Supabase에 직접 업로드 중...\n`);
      const putRes = await fetch(urlRes.signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'video/mp4',
          ...(urlRes.uploadToken ? { 'Authorization': 'Bearer ' + urlRes.uploadToken } : {}),
        },
      });
      if (!putRes.ok) throw new Error('Supabase 업로드 실패 (' + putRes.status + ')');

      // 메타데이터 조회
      const inspRes = await fetch('/api/video-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: urlRes.token }),
      }).then(r => r.json());
      if (inspRes.error) throw new Error(inspRes.error);

      cvState.token = urlRes.token;
      cvState.meta  = inspRes.meta;
    } else {
      // 로컬 폴백: 멀티파트 POST
      log(`> 로컬 서버에 업로드 중...\n`);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('token', urlRes.token);
      const upRes = await fetch('/api/upload-video', { method: 'POST', body: fd }).then(r => r.json());
      if (upRes.error) throw new Error(upRes.error);
      cvState.token = upRes.token;
      cvState.meta  = upRes.meta;
    }

    cvOnLoaded();
  } catch (err) {
    log(`✘ ${err.message}\n`);
    setStatus('업로드 실패');
  } finally {
    cvState.uploading = false;
  }
}

function cvOnLoaded() {
  const m = cvState.meta;
  log(`✔ 영상 로드 완료 — ${m.width}×${m.height}, ${m.fps}fps, ${m.duration.toFixed(1)}s\n`);

  $('#cvStart').value = '0';
  $('#cvEnd').value   = m.duration.toFixed(1);
  $('#cvStart').disabled = false;
  $('#cvEnd').disabled   = false;
  $('#cvDimsLabel').textContent = `${m.width}×${m.height} · ${m.duration.toFixed(1)}s · ${m.fps}fps`;
  $('#cvExportBtn').disabled = false;
  cvUpdateEstimate();
  setStatus(`준비됨 — ${$('#cvFilename').textContent} ♡`);
}

// fps 세그먼트
let cvFps = 15, cvWidth = 480;
document.querySelectorAll('#cvFpsSeg .seg-btn').forEach(b =>
  b.addEventListener('click', () => {
    document.querySelectorAll('#cvFpsSeg .seg-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    cvFps = parseInt(b.dataset.fps, 10);
    $('#cvFpsVal').textContent = cvFps;
    cvUpdateEstimate();
  }));

document.querySelectorAll('#cvWidthSeg .seg-btn').forEach(b =>
  b.addEventListener('click', () => {
    document.querySelectorAll('#cvWidthSeg .seg-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    cvWidth = parseInt(b.dataset.w, 10);
    cvUpdateEstimate();
  }));

$('#cvQuality').addEventListener('input', e => $('#cvQualVal').textContent = e.target.value);
$('#cvStart').addEventListener('input', cvUpdateEstimate);
$('#cvEnd').addEventListener('input', cvUpdateEstimate);

function cvUpdateEstimate() {
  if (!cvState.meta) return;
  const start = parseFloat($('#cvStart').value) || 0;
  const end   = parseFloat($('#cvEnd').value) || cvState.meta.duration;
  const dur   = Math.min(Math.max(end - start, 0), 30);
  const frames = Math.round(dur * cvFps);
  const el = $('#cvEstimate');
  el.hidden = false;
  $('#cvEstFrames').textContent = frames;
  $('#cvEstDur').textContent    = dur.toFixed(1);
  $('#cvDurHint').textContent   = `(${dur.toFixed(1)}s)`;
  if (frames > 300) {
    el.style.color = '#c04000';
    $('#cvEstFrames').textContent = frames + ' ⚠ 많아요';
  } else {
    el.style.color = '';
  }
}

$('#cvExportBtn').addEventListener('click', cvDoConvert);

async function cvDoConvert() {
  if (!cvState.token) return;
  const btn = $('#cvExportBtn');
  btn.disabled = true; btn.textContent = '⏳ 변환 중...';
  $('#cvDownloadLink').hidden = true;
  $('#cvResultCard').hidden = true;
  setStatus('변환 중... ♨');

  const options = {
    start:    parseFloat($('#cvStart').value) || 0,
    end:      parseFloat($('#cvEnd').value) || undefined,
    fps:      cvFps,
    width:    cvWidth || undefined,
    quality:  +$('#cvQuality').value,
    lossless: $('#cvLossless').checked,
  };

  log(`\n──────── VIDEO CONVERT ────────\n`);
  try {
    const r = await fetch('/api/convert-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cvState.token, options }),
    });
    await readSSE(r.body, (event, data) => {
      if (event === 'log')   log(data);
      else if (event === 'error') { log(`\n✘ ${data.message}\n`); setStatus('변환 실패'); }
      else if (event === 'done')  cvShowResult(data);
    });
  } catch (err) {
    log(`✘ ${err.message}\n`); setStatus('변환 실패');
  }
  btn.disabled = false; btn.textContent = '🎬 WebP 움짤로 변환';
}

function cvShowResult({ info, webp }) {
  const url = URL.createObjectURL(b64ToBlob(webp, 'image/webp'));
  $('#cvResultThumb').src = url;
  const base = ($('#cvFilename').textContent || 'output').replace(/\.[^.]+$/, '');
  const dl = $('#cvDownloadLink');
  dl.href = url; dl.download = `${base}_animated.webp`; dl.hidden = false;
  $('#cvROut').textContent    = `${info.width}×${info.height}`;
  $('#cvRFrames').textContent = `${info.pages}프레임 · ${info.fps}fps`;
  $('#cvRSize').textContent   = fmtBytes(info.size);
  $('#cvResultCard').hidden = false;
  setStatus(`완료 ♡ ${fmtBytes(info.size)} 저장 준비됨`);
}

/* ════════ 장난 버튼 ════════ */
document.querySelector('.tbtn-x').addEventListener('click', () => {
  log(`\n(｡>﹏<｡) 닫지 마세요... 아직 할 일이 남았어요...\n`);
});

/* ════════ 유틸 ════════ */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}
function b64ToBlob(b64, type) {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}
