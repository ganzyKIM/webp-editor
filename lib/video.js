'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const sharp = require('sharp');

const MAX_DURATION = 30; // seconds hard cap

function tmpDir() {
  const d = path.join(os.tmpdir(), 'webp-video', crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function pad(n) { return String(n).padStart(5, '0'); }

// ffmpeg -i stderr 파싱으로 영상 메타데이터 추출 (ffprobe 불필요)
function runCapture(args) {
  return new Promise(resolve => {
    const ps = spawn(ffmpegPath, args);
    let out = '';
    ps.stderr.on('data', b => out += b.toString());
    ps.stdout && ps.stdout.on('data', b => out += b.toString());
    ps.on('close', () => resolve(out)); // exit code 무시
  });
}

function runFfmpeg(args, onLog) {
  return new Promise((resolve, reject) => {
    const ps = spawn(ffmpegPath, args);
    let err = '';
    ps.stderr.on('data', b => {
      const s = b.toString();
      err += s;
      if (onLog) onLog(s);
    });
    ps.on('error', reject);
    ps.on('close', code => {
      if (code === 0) resolve(err);
      else reject(new Error('ffmpeg exit ' + code + '\n' + err.slice(-2000)));
    });
  });
}

/**
 * 영상 메타데이터 읽기
 * @returns {Promise<{duration,fps,width,height}>}
 */
async function inspect(inputPath) {
  // -v 플래그 없음: 기본 verbosity에서만 Duration/Stream 정보가 출력됨
  // (-v error 사용 시 스트림 정보가 숨겨져 파싱 불가)
  const raw = await runCapture(['-i', inputPath]);

  const durM = raw.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  const duration = durM
    ? parseInt(durM[1]) * 3600 + parseInt(durM[2]) * 60 + parseFloat(durM[3])
    : 0;

  // "Video: codec ..., 1920x1080 ..., 30 fps" 또는 "29.97 fps" 형태
  const vidM = raw.match(/Video:.*?(\d{2,5})x(\d{2,5}).*?,\s*(\d+\.?\d*)\s*fps/);
  const width  = vidM ? parseInt(vidM[1]) : 0;
  const height = vidM ? parseInt(vidM[2]) : 0;
  const fps    = vidM ? Math.round(parseFloat(vidM[3]) * 100) / 100 : 25;

  if (!duration || !width) throw new Error('영상 정보를 읽지 못했어요 (mp4/webm/mov만 지원)');

  // 코덱 + 알파 채널 여부 (투명 webm 대응)
  const codecM = raw.match(/Video:\s*([a-z0-9]+)/i);
  const codec = codecM ? codecM[1].toLowerCase() : '';
  const hasAlpha = /alpha_mode\s*:\s*1/.test(raw);

  return { duration, fps, width, height, codec, hasAlpha };
}

/**
 * 영상 → 애니메이션 WebP 변환 (두 단계 ffmpeg 파이프라인)
 * opts: { start?, end?, fps?, width?, quality?, lossless? }
 */
async function convert(inputPath, opts, onLog) {
  const src = await inspect(inputPath);
  const work = tmpDir();
  const log = s => onLog && onLog(s);

  try {
    const quality  = clamp(opts.quality, 0, 100, 75);
    const lossless = !!opts.lossless;

    // 구간 결정
    const start    = Math.max(0, parseFloat(opts.start) || 0);
    const rawEnd   = (opts.end != null && opts.end > 0) ? parseFloat(opts.end) : src.duration;
    const end      = Math.min(src.duration, Math.max(start + 0.1, rawEnd));
    const duration = Math.min(end - start, MAX_DURATION);

    // 목표 fps (기본: 원본 fps 와 15 중 작은 값)
    const targetFps = opts.fps ? clamp(opts.fps, 1, 60, 15) : Math.min(src.fps, 15);

    // 목표 폭 (짝수 강제)
    let targetW = opts.width ? clamp(opts.width, 32, 1920, 480) : 0;
    if (targetW) targetW = Math.round(targetW / 2) * 2;

    const estFrames = Math.round(duration * targetFps);
    log(`▶ 영상 정보: ${src.width}×${src.height}, ${src.fps}fps, ${src.duration.toFixed(1)}s\n`);
    log(`▶ 변환 설정: ${start.toFixed(1)}s ~ ${(start + duration).toFixed(1)}s, ` +
        `${targetFps}fps, 폭 ${targetW || src.width}px, 예상 ${estFrames}프레임\n`);

    if (estFrames > 300) {
      log(`⚠ 프레임이 많아서 시간이 걸릴 수 있어요 (${estFrames}프레임)\n`);
    }

    // ── Step 1: 영상 → PNG 시퀀스 ──────────────────────────────────────────
    // 투명 webm(VP8/VP9 + alpha) 은 ffmpeg 네이티브 디코더가 알파를 버리므로
    // 반드시 libvpx 외부 디코더를 -i 앞에 지정해야 알파가 살아난다.
    const decoder = src.hasAlpha
      ? (src.codec === 'vp9' ? 'libvpx-vp9' : src.codec === 'vp8' ? 'libvpx' : null)
      : null;
    if (src.hasAlpha) log(`▶ 투명(알파) 영상 감지 — ${decoder || '기본'} 디코더로 투명도 보존\n`);

    const vfParts = [`fps=${targetFps}`];
    if (targetW) vfParts.push(`scale=${targetW}:-2`); // -2 = 짝수 맞춤
    if (src.hasAlpha) vfParts.push('format=rgba'); // 알파 채널 보존 (투명 webm 대응)

    const step1 = [
      '-y',
      ...(decoder ? ['-c:v', decoder] : []),
      '-ss', String(start),
      '-t',  String(duration),
      '-i',  inputPath,
      '-vf', vfParts.join(','),
      '-an',
      path.join(work, 'f%05d.png'),
    ];
    log(`\n[1/2] 프레임 추출 중...\n`);
    await runFfmpeg(step1, log);

    const pngs = fs.readdirSync(work).filter(f => f.endsWith('.png'));
    log(`\n▶ 추출된 프레임: ${pngs.length}개\n`);
    if (!pngs.length) throw new Error('프레임이 추출되지 않았어요');

    // ── Step 2: PNG 시퀀스 → animated WebP (필터 없이!) ───────────────────
    const outPath = path.join(work, 'out.webp');
    const step2 = [
      '-y',
      '-framerate', String(targetFps),
      '-i', path.join(work, 'f%05d.png'),
      '-c:v', 'libwebp_anim',
      '-lossless', lossless ? '1' : '0',
      '-quality', String(quality),
      '-loop', '0',
      '-an',
      outPath,
    ];
    log(`\n[2/2] WebP 조립 중...\n`);
    await runFfmpeg(step2, log);

    const buffer = fs.readFileSync(outPath);
    const outMeta = await sharp(buffer, { animated: true }).metadata();
    const info = {
      width:    outMeta.width,
      height:   outMeta.pageHeight || outMeta.height,
      pages:    outMeta.pages || 1,
      fps:      targetFps,
      quality,
      lossless,
      size:     buffer.length,
    };
    log(`\n✔ 완료: ${info.width}×${info.height}, ${info.pages}프레임, ${fmtBytes(info.size)}\n`);
    return { buffer, info };
  } finally {
    fs.rm(work, { recursive: true, force: true }, () => {});
  }
}

function clamp(v, min, max, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt;
}
function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

module.exports = { inspect, convert };
