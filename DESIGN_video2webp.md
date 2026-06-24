# 설계 메모 — 영상 → 움짤(WebP) 변환 (구상 단계)

> 아직 구현 X. UI에는 `영상→움짤 (예정)` 탭으로 자리만 잡아둠.
> 현 편집기와 자연스럽게 합치기 위한 방향 정리.

## 좋은 소식: 디코딩 문제 없음

현 편집기의 가장 큰 난점은 "ffmpeg 가 애니 webp 를 못 읽는다"였지만,
**영상(mp4/webm/mov) 입력은 ffmpeg 가 완벽히 디코딩**한다(h264/vp9/av1 등).
그리고 출력 쪽 `libwebp_anim` 인코더는 이미 검증됨.
→ 영상→webp 는 sharp 없이 **ffmpeg 단독 파이프라인**으로 갈 수 있다.

## 파이프라인(안)

```
영상 업로드
  → ffprobe 로 길이/해상도/fps/코덱 파악
  → (선택) 구간 트림: -ss <start> -to <end>
  → 프레임 추출 + 변형을 한 번에:
       -vf "fps=<targetFps>,scale=<w>:-1,crop=<...>"
       ⚠ 단, libwebp_anim + 필터 동시 사용 시 단일프레임 붕괴 버그 →
         두 단계로 분리:
         1) ffmpeg 영상 -vf(fps/scale/crop) → PNG 시퀀스 (frame_%05d.png)
         2) ffmpeg PNG 시퀀스 -c:v libwebp_anim -quality -loop → out.webp
  → 결과 반환
```

즉 **현 `lib/webp.js` 의 ②③(프레임→libwebp_anim 조립)을 그대로 재사용**하고,
앞단 디코딩만 "sharp page 추출" → "ffmpeg 영상 디코딩"으로 바꾸면 된다.

## 조절 파라미터 (UI 노출)

| 항목 | ffmpeg 매핑 | 비고 |
|------|-------------|------|
| 구간(start/end) | `-ss` / `-to` | 미리보기에 트림 핸들 |
| 프레임수/속도 | `fps=N` 필터 | 원본보다 낮춰 용량↓ (움짤은 8~15fps 적당) |
| 해상도 | `scale=w:-1` | 폭 기준, 짝수 보정 |
| 크롭 | `crop=w:h:x:y` | 기존 크롭 UI 재사용 |
| 화질 | `-quality 0~100` | libwebp_anim |
| 무손실 | `-lossless 1` | 용량 매우 큼, 보통 off |
| 루프 | `-loop 0` | 0=무한 |

## 주의점 / 리스크

- **용량 폭주**: 영상은 프레임이 많다. 기본값을 보수적으로
  (예: fps 12, 폭 480px, quality 70, 최대 길이 가드 ~10초) 두고 경고 표시.
- **프레임 추출 디스크 사용량**: 임시폴더에 PNG 시퀀스가 커질 수 있음 → 길이/해상도 상한 + 작업 후 정리.
- **진행률**: 영상은 오래 걸리므로 ffmpeg `-progress` 파싱해 진행바 제공(현 SSE 로그 재활용 가능).
- **오디오**: 움짤은 무음 → `-an` 고정.
- **가변 fps 영상**: `fps` 필터로 정규화하면 타이밍 안정적.

## 재사용 가능한 현 코드

- `lib/webp.js` 의 `runFfmpeg()`, PNG시퀀스→libwebp_anim 조립부, `fmtBytes`
- 프론트의 크롭 오버레이, 화질/해상도/fps 컨트롤, SSE 로그 콘솔, 결과 카드
- 서버의 업로드/토큰/임시정리 구조

## 새로 필요한 것

- `ffprobe` (ffprobe-static 추가) 로 메타데이터 파악
- 타임라인 트림 UI (구간 선택) — 현 레퍼런스(DAW.exe)의 파형 타임라인 감성 차용
- 길이/용량 가드레일 & 예상 용량 표시
