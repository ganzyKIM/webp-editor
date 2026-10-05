# webp-editor

애니메이션 WebP(움짤)를 크롭하고 화질을 낮춰 다시 저장하는 웹 편집기입니다. 영상(mp4, webm, mov)을 움짤로 바꾸는 탭도 있습니다. ffmpeg만으로는 애니메이션 WebP를 읽지 못해서, 프레임은 sharp로 뽑고 ffmpeg로 다시 묶습니다.

배포 주소: https://webp-editor.vercel.app

## 기능

움짤 편집 탭

- `.webp`, `.gif` 업로드. 최대 60MB, 드래그 앤 드롭 가능
- 화질 1~100, 무손실 토글
- 해상도 100/75/50/25% 프리셋 또는 폭(px) 입력
- 크롭 영역은 미리보기에서 드래그하거나 좌표로 입력
- fps 1~50. 원본보다 낮추면 프레임을 고르게 솎아서 재생 속도는 그대로 둡니다
- 결과 미리보기와 내려받기. 원본 대비 용량 비율 표시

영상→움짤 탭

- mp4, webm, mov 업로드
- 구간 지정. 최대 30초
- fps 8/10/15/24/30, 폭 320/480/640px 또는 원본
- 투명 webm(VP8, VP9)은 알파 채널을 유지합니다

화면 아래 콘솔에 ffmpeg 로그가 SSE로 실시간 출력됩니다. 화면 구석의 마스코트는 작업 상태에 따라 대사가 바뀝니다.

## 실행

Node.js 18 이상이 필요합니다.

```bash
npm ci       # sharp와 ffmpeg-static이 플랫폼별 바이너리를 내려받습니다
npm start    # http://localhost:3939
```

로컬에서는 환경변수 없이 돌아갑니다. 업로드한 파일은 OS 임시 폴더의 `webp-editor-uploads`에 두고, 1시간이 지나면 지웁니다.

환경변수는 `.env.example`을 `.env`로 복사해서 채웁니다.

| 이름 | 용도 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 주소 |
| `SUPABASE_SERVICE_KEY` | 서비스 롤 키. 서버에서만 씁니다 |
| `SUPABASE_BUCKET` | 스토리지 버킷 이름. 기본값 `webp-uploads` |
| `PORT` | 로컬 포트. 기본값 3939 |

`SUPABASE_URL`과 `SUPABASE_SERVICE_KEY`가 둘 다 있으면 로컬 폴더 대신 Supabase Storage를 씁니다.

## 배포 구조

Vercel 서버리스 함수 하나가 `server.js`(Express)를 실행합니다. 함수 실행 시간 상한은 60초입니다(`vercel.json`). 요청마다 인스턴스가 바뀔 수 있어서, 업로드와 내보내기 사이의 파일은 Supabase Storage에 둡니다. Vercel은 요청 본문을 4.5MB로 제한합니다. 그래서 영상은 서버가 발급한 서명 URL로 브라우저에서 Supabase에 바로 올립니다.

## 처리 순서

ffmpeg-static에 들어 있는 ffmpeg 6의 WebP 디코더는 애니메이션 WebP를 읽지 못합니다(`ANIM`, `ANMF` 청크를 건너뜀). `libwebp_anim` 인코더에 `-vf` 필터를 걸면 결과가 한 프레임으로 줄어드는 문제도 있습니다. 그래서 단계를 나눴습니다(`lib/webp.js`).

1. 디코딩: sharp가 페이지 단위로 프레임을 읽습니다. delay와 loop 값도 sharp에서 가져옵니다.
2. 크롭과 리사이즈: sharp가 프레임마다 처리해서 무손실 PNG로 씁니다.
3. 재조립: ffmpeg `libwebp_anim`이 필터 없이 PNG 시퀀스를 묶습니다. 화질과 fps는 이 단계에서 적용합니다.

sharp 0.35는 raw 프레임을 애니메이션으로 다시 묶지 못해서 PNG 중간 파일을 거칩니다.

영상 변환(`lib/video.js`)은 ffmpeg를 두 번 실행합니다. 첫 번째에서 fps와 크기 필터를 걸어 PNG로 뽑습니다. 두 번째에서 위와 같이 필터 없이 묶습니다. 메타데이터는 ffprobe 없이 `ffmpeg -i` 출력을 파싱해서 읽습니다.

## 구조

```
server.js                   Express 라우트 (업로드, 미리보기, 내보내기 SSE, 영상 변환)
lib/webp.js                 움짤 편집 파이프라인
lib/video.js                영상 변환 파이프라인
lib/storage.js              Supabase Storage와 로컬 임시 폴더 전환
public/                     프런트엔드 (바닐라 JS)와 정적 파일
docs/video2webp-design.md   영상 변환 기능의 구현 전 설계 메모
```
