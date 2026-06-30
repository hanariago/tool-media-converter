# 미디어 변환기 (Media Converter)

비디오를 GIF로, 오디오 포맷을 변환하고 자르는 도구.

🔗 **바로 쓰기**: https://hanariago.github.io/tool-media-converter

## 기능

- **비디오 → GIF 변환** — 구간 선택, 해상도 / 프레임레이트 / 품질 조절 (2-pass 팔레트로 선명하게)
- **비디오 트리밍** — 선택 구간을 MP4로 정확하게 잘라서 다운로드
- **오디오 포맷 변환** — mp3 / wav / ogg / m4a 상호 변환, 비트레이트 선택
- **오디오 커팅** — 시작 / 끝 구간 지정해서 자르기 (파형 표시)
- **비디오에서 오디오 추출** — 영상 파일을 올려 오디오만 변환
- **GIF 편집** — 기존 GIF를 프레임 단위로 분해(필름스트립) → 원하는 프레임만 PNG로 추출 / 재생 속도 조절 후 새 GIF로 재조합
- **첫 방문 가이드** — 처음 열면 사용법 안내 팝업 (오늘 다시 보지 않기 지원)
- **서버 전송 없음** — 모든 처리는 브라우저 안에서. 파일은 어디에도 업로드되지 않습니다.

## 사용법

1. 위 링크로 접속 (첫 방문 시 변환 엔진 ≈25–31MB를 한 번 내려받습니다 — 진행률이 표시됩니다)
2. 탭을 고르고 파일을 끌어다 놓기
3. 구간 / 옵션을 정하고 변환 버튼
4. 미리보기 확인 후 다운로드

## 기술 스택

- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) (`@ffmpeg/ffmpeg` 0.12.x, `@ffmpeg/core(-mt)` 0.12.10) — 비디오·오디오 처리
- [gifuct-js](https://github.com/matt-way/gifuct) (GIF 디코딩) + [gifenc](https://github.com/mattdesl/gifenc) (GIF 인코딩) — GIF 편집 탭
- 순수 HTML / CSS / JS (ES Modules)
- [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) — GitHub Pages에서 COOP/COEP 헤더를 주입해 `SharedArrayBuffer`(멀티스레드) 활성화

### 동작 메모

- 브라우저가 cross-origin isolation을 지원하면 **멀티스레드 코어**로 빠르게 처리합니다.
- 일부 환경에서 멀티스레드 인코딩이 멈출 수 있어, 첫 작업이 일정 시간 안에 진척이 없으면 자동으로 **단일스레드 코어로 전환**해 재실행합니다 (결과는 동일, 속도만 느려짐).
- ffmpeg 글루 코드는 `js/vendor/` 에 포함되어 있습니다. 교차 출처 모듈 워커 차단을 피하기 위함이며, 무거운 wasm 코어만 CDN에서 받습니다.

## 로컬 실행

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

서비스워커가 필요하므로 `file://` 가 아닌 로컬 서버(또는 HTTPS)로 열어야 합니다.

## 브라우저 지원

최신 Chrome / Edge / Firefox 권장. Safari 등 일부 환경에서는 단일스레드 모드로 동작합니다.

---

Made by [Lena](https://github.com/hanariago) · License: MIT
