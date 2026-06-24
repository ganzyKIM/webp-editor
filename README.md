# ♡ WEBP.EXE — 움짤(애니메이션 WebP) 편집기

업로드한 움짤 `.webp` 의 **화질·해상도를 조절하고 이미지를 크롭**하는 로컬 편집 툴.
20세기말 도스 윈도우 × 파스텔 × 멘헤라 갸루 감성 UI.

## 실행

```bash
npm install      # 최초 1회 (sharp, ffmpeg 바이너리 자동 설치)
npm start        # http://localhost:3939
```

브라우저에서 `http://localhost:3939` 접속.

## 기능 (현재)

- 움짤 `.webp` / `.gif` 업로드 (드래그&드롭 가능)
- **화질(quality)** 1~100 조절, 무손실(lossless) 토글
- **해상도** 조절 — 25/50/75/100% 프리셋 또는 폭(px) 직접 입력
- **크롭** — 미리보기 위에서 드래그로 영역 지정, 핸들로 리사이즈/이동
- **fps** 조절(또는 원본 타이밍 자동 유지)
- 실시간 ffmpeg 콘솔 로그, 결과 미리보기 + 용량 비교 + 내려받기

## 기술 구조 — 왜 이렇게 짰나

핵심 제약: **번들된 ffmpeg(6.1.1)의 WebP 디코더는 애니메이션 webp 를 못 읽는다.**
(`skipping unsupported chunk: ANIM/ANMF` → 첫 프레임조차 못 꺼냄)
또한 `libwebp_anim` 인코더는 `-vf` 필터를 끼우면 단일 프레임으로 붕괴하는 버그가 있다.

그래서 역할을 나눴다 (`lib/webp.js`):

| 단계 | 도구 | 이유 |
|------|------|------|
| ① 디코딩 (프레임/delay/loop 추출) | **sharp** (libvips) | ffmpeg 가 못 하는 애니 webp 디코딩을 안정적으로 처리 |
| ② 프레임별 크롭 + 리사이즈 | **sharp** `.extract().resize()` | 화면 변형은 전부 여기서 끝냄(ffmpeg 필터 버그 회피) |
| ③ 화질 적용 + 애니메이션 재조립 | **ffmpeg** `libwebp_anim` (필터 없이) | `-quality / -framerate / -loop` 로 인코딩 |

> sharp 0.35 는 raw 프레임을 다시 애니메이션으로 합치지 못해(②→③),
> 무손실 PNG 중간물을 거쳐 ffmpeg 로 조립한다.

## 구성

```
server.js        Express 서버 (업로드/미리보기/내보내기 SSE)
lib/webp.js      디코딩·편집·재조립 엔진 (sharp + ffmpeg)
public/          프론트엔드 (index.html / style.css / app.js / fonts)
DESIGN_video2webp.md   향후 '영상→움짤' 기능 설계(구상)
```

## 향후 계획

- **영상 → 움짤 변환** : mp4/webm/mov 업로드 → 구간 선택 → 프레임수·fps·화질 조절 → `.webp`
  설계 메모는 [`DESIGN_video2webp.md`](DESIGN_video2webp.md) 참고. (UI에 자리만 잡아둠)
