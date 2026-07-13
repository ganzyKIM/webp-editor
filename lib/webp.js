'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  webp.js — 움짤(애니메이션 WebP) 디코딩 / 편집 / 재조립 엔진
//
//  검증된 파이프라인 (README 참고):
//    1) 디코딩  : ffmpeg는 애니메이션 webp의 ANIM/ANMF 청크를 못 읽으므로
//                 sharp 가 page 단위로 프레임을 뽑는다.  delay/loop 도 sharp.
//    2) 편집    : sharp 가 프레임별로 .extract(crop) → .resize(scale).
//    3) 재조립  : ffmpeg image2 → libwebp_anim 으로 품질/프레임레이트 적용.
//                 (이때 -vf 필터를 쓰면 단일 프레임으로 붕괴하는 빌드 버그가
//                  있어, 모든 화면 변형은 sharp 단계에서 끝내고 ffmpeg 에는
//                  필터 없이 넘긴다.)
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');

sharp.cache(false); // 파일을 곧바로 지우므로 캐시 비활성

function tmpDir() {
  const d = path.join(os.tmpdir(), 'webp-editor', crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function pad(n) {
  return String(n).padStart(5, '0');
}

// delay(ms) 배열 → 대표 fps. 가장 흔한 delay 값을 기준으로 한다.
function deriveFps(delays) {
  if (!delays || !delays.length) return 15;
  const counts = new Map();
  for (const d of delays) {
    const v = d > 0 ? d : 100;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = 100, bestC = -1;
  for (const [v, c] of counts) if (c > bestC) { best = v; bestC = c; }
  const fps = 1000 / best;
  return Math.max(1, Math.min(60, Math.round(fps * 100) / 100));
}

/**
 * webp 메타데이터 읽기. filePath(string) 또는 buffer(Buffer) 모두 허용.
 * @returns {Promise<{width,height,pages,animated,loop,delays,fps,size}>}
 */
async function inspect(input) {
  const meta = await sharp(input, { animated: true }).metadata();
  const pages = meta.pages || 1;
  const delays = meta.delay && meta.delay.length ? meta.delay : new Array(pages).fill(100);
  const size = Buffer.isBuffer(input) ? input.length : fs.statSync(input).size;
  return {
    width: meta.width,
    height: meta.pageHeight || meta.height,
    pages,
    animated: pages > 1,
    loop: typeof meta.loop === 'number' ? meta.loop : 0,
    delays,
    fps: deriveFps(delays),
    format: meta.format,
    size,
  };
}

// ffmpeg 를 돌리고, stderr 를 onLog 로 흘려보낸 뒤 종료 코드를 resolve.
function runFfmpeg(args, onLog) {
  return new Promise((resolve, reject) => {
    const ps = spawn(ffmpegPath, args);
    let err = '';
    ps.stderr.on('data', (b) => {
      const s = b.toString();
      err += s;
      if (onLog) onLog(s);
    });
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code === 0) resolve(err);
      else reject(new Error('ffmpeg exited with code ' + code + '\n' + err.slice(-1500)));
    });
  });
}

/**
 * 움짤 webp 편집.
 * @param {string|Buffer} inputPath  업로드된 원본 webp (파일경로 또는 Buffer)
 * @param {object} opts
 *   - crop   {left,top,width,height}  (원본 픽셀 기준, 선택)
 *   - scale  { width?:number, percent?:number }  (크롭 후 기준, 선택)
 *   - quality 0-100 (기본 75)
 *   - lossless boolean (기본 false)
 *   - fps    number (선택, 미지정 시 원본 대표 fps)
 *   - loop   number (선택, 미지정 시 원본 loop)
 *   - dropEvery number (선택, n번째마다 프레임 1개씩 솎아내 프레임수 절감)
 * @param {(chunk:string)=>void} onLog  ffmpeg 로그 콜백
 * @returns {Promise<{buffer:Buffer, info:object}>}
 */
async function edit(inputPath, opts, onLog) {
  // Buffer 입력이면 /tmp 에 써서 파일 경로로 변환
  let tempIn = null;
  if (Buffer.isBuffer(inputPath)) {
    tempIn = path.join(os.tmpdir(), 'webp-in-' + crypto.randomBytes(6).toString('hex') + '.webp');
    fs.writeFileSync(tempIn, inputPath);
    inputPath = tempIn;
  }

  const src = await inspect(inputPath);
  const work = tmpDir();
  const log = (s) => onLog && onLog(s);

  try {
    const quality = clampInt(opts.quality, 0, 100, 75);
    const lossless = !!opts.lossless;
    const loop = Number.isInteger(opts.loop) ? opts.loop : src.loop;

    // 크롭 영역 정규화 (원본 경계로 클램프)
    let crop = null;
    if (opts.crop) {
      const left = clampInt(opts.crop.left, 0, src.width - 1, 0);
      const top = clampInt(opts.crop.top, 0, src.height - 1, 0);
      const width = clampInt(opts.crop.width, 1, src.width - left, src.width - left);
      const height = clampInt(opts.crop.height, 1, src.height - top, src.height - top);
      if (left !== 0 || top !== 0 || width !== src.width || height !== src.height) {
        crop = { left, top, width, height };
      }
    }

    const baseW = crop ? crop.width : src.width;
    const baseH = crop ? crop.height : src.height;

    // 스케일 목표 폭 계산
    let targetW = baseW;
    if (opts.scale) {
      if (opts.scale.width) targetW = clampInt(opts.scale.width, 1, 4096, baseW);
      else if (opts.scale.percent) targetW = Math.max(1, Math.round(baseW * (opts.scale.percent / 100)));
    }
    targetW = Math.min(targetW, 4096);
    const scaleNeeded = targetW !== baseW;

    // 프레임 솎기 (프레임 수 줄이기)
    const drop = clampInt(opts.dropEvery, 0, 100, 0);
    const keepIdx = [];
    for (let i = 0; i < src.pages; i++) {
      if (drop > 1 && i % drop === 0 && i !== 0) continue;
      keepIdx.push(i);
    }

    log(`▶ 디코딩: ${src.pages} 프레임 (${src.width}x${src.height})\n`);
    if (crop) log(`▶ 크롭: ${crop.width}x${crop.height} @ (${crop.left},${crop.top})\n`);
    if (scaleNeeded) log(`▶ 리사이즈: 폭 ${targetW}px\n`);
    if (keepIdx.length !== src.pages) log(`▶ 프레임 솎기: ${src.pages} → ${keepIdx.length}\n`);

    // ── 1+2) sharp 로 프레임별 디코딩 + 크롭 + 리사이즈 → PNG (무손실 중간물)
    await Promise.all(keepIdx.map((i, outIdx) => {
      let pipe = sharp(inputPath, { page: i });
      if (crop) pipe = pipe.extract(crop);
      if (scaleNeeded) pipe = pipe.resize({ width: targetW, kernel: 'lanczos3' });
      return pipe.png({ compressionLevel: 0 }).toFile(path.join(work, 'f' + pad(outIdx) + '.png'));
    }));

    // fps 결정
    const fps = opts.fps ? clampNum(opts.fps, 0.5, 60, src.fps) : src.fps;

    // ── 3) ffmpeg 로 재조립 (필터 없이!)
    const outPath = path.join(work, 'out.webp');
    const args = [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(work, 'f%05d.png'),
      '-c:v', 'libwebp_anim',
      '-lossless', lossless ? '1' : '0',
      '-quality', String(quality),
      '-loop', String(loop),
      '-an',
      outPath,
    ];
    log(`\n$ ffmpeg ${args.join(' ')}\n\n`);
    await runFfmpeg(args, log);

    const buffer = fs.readFileSync(outPath);
    const outMeta = await sharp(buffer, { animated: true }).metadata();
    const info = {
      width: outMeta.width,
      height: outMeta.pageHeight || outMeta.height,
      pages: outMeta.pages || 1,
      fps,
      quality,
      lossless,
      loop,
      size: buffer.length,
      sourceSize: src.size,
      ratio: src.size ? Math.round((buffer.length / src.size) * 1000) / 10 : null,
    };
    log(`\n✔ 완료: ${info.width}x${info.height}, ${info.pages}프레임, ${fmtBytes(info.size)} ` +
        `(원본 대비 ${info.ratio}%)\n`);
    return { buffer, info };
  } finally {
    fs.rm(work, { recursive: true, force: true }, () => {});
    if (tempIn) fs.rm(tempIn, { force: true }, () => {});
  }
}

function clampInt(v, min, max, dflt) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}
function clampNum(v, min, max, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}
function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}

module.exports = { inspect, edit, deriveFps, fmtBytes };
