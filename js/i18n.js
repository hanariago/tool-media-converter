// 다국어(한/영) — 정적 data-i18n + 동적 t(). 키 접두어 mediaConv 사용(같은 origin 충돌 방지).
const LOCALE = { ko: "ko_KR", en: "en_US" };

const I18N = {
  ko: {
    metaTitle: "미디어 변환기 - 비디오 GIF 변환 · 오디오 변환 · GIF 편집",
    metaDesc: "브라우저에서 바로 쓰는 무료 미디어 변환기. 비디오를 GIF로 변환·트리밍, 오디오 mp3/wav/ogg/m4a 변환·자르기, GIF 프레임 추출·속도 조절. 설치·로그인·서버 전송 없이 ffmpeg.wasm으로 처리.",
    ogTitle: "미디어 변환기 - 비디오 GIF 변환 · 오디오 변환 · GIF 편집",
    ogDesc: "비디오→GIF, 오디오 포맷 변환·커팅, GIF 프레임 추출·속도 조절. 브라우저에서 바로, 서버 전송 없이.",

    brandTitle: "미디어 변환기",
    brandSub: "비디오 → GIF · 오디오 변환 / 커팅 · GIF 편집",
    privacy: "서버 전송 없음",

    tabVideo: "비디오 → GIF / 트리머",
    tabAudio: "오디오 변환 / 커터",
    tabGif: "GIF 편집",

    reChoose: "다른 파일 선택",
    rangeSelect: "구간 선택",
    start: "시작", end: "끝",
    nowStart: "⇤ 현재", nowEnd: "현재 ⇥",
    result: "결과", download: "다운로드", cancel: "취소",

    vidDropTitle: "비디오 파일을 끌어다 놓거나 클릭해서 선택",
    vidDropSub: "mp4 · mov · webm · mkv · avi 등",
    modeGif: "GIF로 변환", modeMp4: "MP4로 트리밍",
    gifWidth: "가로 해상도", optOriginal: "원본 유지",
    gifFps: "프레임레이트", gifQuality: "품질",
    qHigh: "높음 (256색, 선명)", qMid: "보통 (128색)", qLow: "낮음 (64색, 가벼움)",
    mp4Note: "선택한 구간을 MP4로 다시 인코딩합니다. 프레임 단위로 정확하게 잘려요. 긴 구간은 시간이 걸릴 수 있습니다.",
    mp4Quality: "화질",
    mqHigh: "높음", mqMid: "보통", mqLow: "낮음 (가벼움)",
    btnGif: "GIF 만들기", btnMp4: "MP4로 트리밍",

    audDropTitle: "오디오 파일을 끌어다 놓거나 클릭해서 선택",
    audDropSub: "mp3 · wav · m4a · ogg · flac · 또는 비디오에서 오디오 추출",
    cutEnable: "구간 커팅",
    outFormat: "출력 포맷", bitrate: "비트레이트",
    btnConvert: "변환하기",
    noteMp3: "가장 호환성이 좋은 손실 압축 포맷이에요.",
    noteWav: "무손실. 파일 크기가 큽니다.",
    noteOgg: "오픈 포맷. 같은 용량에서 음질이 좋아요.",
    noteM4a: "Apple 기기 친화적인 AAC 포맷이에요.",

    gifDropTitle: "GIF 파일을 끌어다 놓거나 클릭해서 선택",
    gifDropSub: "기존 GIF를 프레임으로 분해 · 추출 · 속도 조절",
    framesLabelPre: "프레임", framesLabelPost: "개",
    selectAll: "전체 선택", selectNone: "선택 해제",
    extractTitle: "선택 프레임 추출",
    extractNotePre: "", extractNotePost: "개 프레임 선택됨. PNG로 내려받습니다.",
    extractBtn: "선택 프레임 PNG 다운로드",
    speedTitle: "재생 속도 조절",
    rebuildBtn: "새 GIF 만들기",
    speedNoteInit: "원본 속도 그대로. 선택한 프레임만으로 재조합하려면 위에서 프레임을 고르세요(전체 선택 시 모든 프레임 사용).",

    footer: "브라우저에서 ffmpeg.wasm으로 처리 · 파일은 어디에도 업로드되지 않습니다.",
    footerMadeBy: "Made by",
    license: "오픈소스 · MIT 라이선스",
    hubLink: "🔧 다른 도구 모음 →",

    introHtml: "미디어 변환기는 <strong>비디오를 GIF로</strong> 만들거나 구간을 잘라 MP4로 저장하고, <strong>오디오 포맷(mp3·wav·ogg·m4a)을 변환·커팅</strong>하며, <strong>기존 GIF를 프레임 단위로 분해</strong>해 PNG로 추출하거나 재생 속도를 바꿔 새 GIF로 재조합하는 무료 온라인 도구입니다. 영상에서 오디오만 추출할 수도 있어요. 모든 처리는 ffmpeg.wasm으로 브라우저 안에서만 이루어지며, 파일은 서버로 전송되지 않습니다.",
    faqTitle: "자주 묻는 질문",
    faq: [
      { q: "파일이 서버로 업로드되나요?", a: "아니요. 모든 변환은 ffmpeg.wasm으로 브라우저 안에서만 처리됩니다. 업로드한 파일이나 결과물은 어떤 서버로도 전송·저장되지 않습니다." },
      { q: "처음에 뭔가 오래 받는데 정상인가요?", a: "네. 첫 변환 때 변환 엔진(ffmpeg.wasm 코어, 약 25~31MB)을 한 번 내려받습니다. 이후에는 캐시되어 빨라집니다. 진행률이 상단에 표시돼요." },
      { q: "어떤 비디오 형식을 GIF로 만들 수 있나요?", a: "mp4·mov·webm·mkv·avi 등 대부분의 영상 형식을 지원합니다. 구간을 정하고 해상도·프레임레이트·품질을 골라 변환하세요. 같은 구간을 MP4로 트리밍할 수도 있습니다." },
      { q: "어떤 오디오 포맷끼리 변환되나요?", a: "mp3·wav·ogg·m4a 사이를 자유롭게 변환합니다. 비트레이트를 고를 수 있고, 시작·끝을 지정해 구간만 잘라낼 수도 있습니다. 비디오 파일을 올리면 오디오만 추출됩니다." },
      { q: "GIF 편집으로 뭘 할 수 있나요?", a: "기존 GIF를 프레임 단위로 분해해 필름스트립으로 보여주고, 원하는 프레임만 PNG로 추출하거나, 재생 속도(0.5×~4×)를 바꿔 새 GIF로 재조합할 수 있습니다." },
      { q: "무료인가요? 설치가 필요한가요?", a: "완전 무료이며 로그인·설치가 필요 없습니다. 브라우저에서 바로 사용하세요." }
    ],

    // 가이드 팝업
    guideTitle: "미디어 변환기에 오신 걸 환영해요 👋",
    guideLeadHtml: "모든 처리는 <strong>브라우저 안에서</strong> 이루어져요. 파일은 어디에도 업로드되지 않습니다.",
    guideLi1Html: "<strong>비디오 → GIF / 트리머</strong> — 영상의 원하는 구간을 GIF로 만들거나 MP4로 잘라요.",
    guideLi2Html: "<strong>오디오 변환 / 커터</strong> — mp3·wav·ogg·m4a 변환, 구간 자르기, 영상에서 오디오 추출.",
    guideLi3Html: "<strong>GIF 편집</strong> — 기존 GIF를 프레임으로 분해해 PNG로 추출하거나, 속도를 바꿔 새 GIF로 재조합.",
    guideHint: "처음 변환할 때 변환 엔진(약 25–31MB)을 한 번 내려받아요. 잠깐 기다리면 이후엔 빨라요.",
    guideDont: "오늘 다시 보지 않기",
    guideClose: "닫기",

    // 동적
    enginePreparing: "변환 엔진 준비 중…",
    engineFirstDl: "ffmpeg.wasm 코어를 처음 한 번 내려받아요.",
    engineReady: "변환 엔진 준비 완료",
    engineMt: "멀티스레드 모드로 동작합니다.",
    engineSt: "단일스레드 모드로 동작합니다.",
    engineSwitching: "단일스레드로 전환 중…",
    engineSwitchDetail: "호환 모드 코어를 준비하고 있어요.",
    engineSwitched: "멀티스레드가 응답하지 않아 단일스레드로 전환했어요.",
    engineGot: (mb) => `${mb} 받음 · 초기화 중…`,
    engineDl: (got, total) => `${got} / 약 ${total} 내려받는 중`,

    pGif: "GIF 만드는 중…", pMp4: "MP4 트리밍 중…", pAudio: "오디오 변환 중…",
    pGifBuild: "새 GIF 만드는 중…", pProcessing: "처리 중…",
    btnProcessing: "처리 중…",

    fromVideo: " · 영상에서 오디오 추출",
    gifDecoding: "프레임을 분해하는 중…",
    gifDecodeFail: "디코딩 실패.",
    gifStat: (w, h, n, sec, alpha) => `<strong>${w}×${h}</strong> px<br>${n} 프레임<br>총 ${sec}초${alpha ? "<br>투명도 있음" : ""}`,
    speedNote: (sp, n, sec) => `${sp}×속 · ${n}프레임 · 약 ${sec}초짜리 GIF로 재조합돼요.`,

    tWrongVideo: "비디오 파일을 올려주세요.",
    tWrongAudio: "오디오 또는 비디오 파일을 올려주세요.",
    tWrongGif: "GIF 파일을 올려주세요.",
    tRangeAgain: "구간을 다시 선택해주세요.",
    tGifLong: "GIF는 60초 이하 구간을 권장해요. 그대로 진행합니다.",
    tCanceled: "변환을 취소했어요.",
    tConvertFail: (m) => `변환 실패: ${m}`,
    tGifReadFail: (m) => `GIF를 읽지 못했어요: ${m}`,
    tNoFrames: "프레임을 찾지 못했어요.",
    tPickFrames: "추출할 프레임을 선택해주세요.",
    tExtracted: (n) => `${n}개 프레임을 PNG로 내려받았어요.`,
    tExtractFail: (m) => `추출 실패: ${m}`,
    tRebuildFail: (m) => `재조합 실패: ${m}`,
    tNoFramesShort: "프레임이 없어요.",
  },
  en: {
    metaTitle: "Media Converter - Video to GIF, Audio Convert & GIF Editor",
    metaDesc: "Free in-browser media converter. Turn video into GIF or trim to MP4, convert & cut audio (mp3/wav/ogg/m4a), and split GIF frames or change speed. No install, no login, no upload — all processed locally with ffmpeg.wasm.",
    ogTitle: "Media Converter - Video to GIF, Audio Convert & GIF Editor",
    ogDesc: "Video→GIF, audio format convert & cut, GIF frame extract & speed change. Right in your browser, nothing uploaded.",

    brandTitle: "Media Converter",
    brandSub: "Video → GIF · Audio convert / cut · GIF editor",
    privacy: "Nothing uploaded",

    tabVideo: "Video → GIF / Trimmer",
    tabAudio: "Audio Convert / Cutter",
    tabGif: "GIF Editor",

    reChoose: "Choose another file",
    rangeSelect: "Select range",
    start: "Start", end: "End",
    nowStart: "⇤ Now", nowEnd: "Now ⇥",
    result: "Result", download: "Download", cancel: "Cancel",

    vidDropTitle: "Drag & drop a video file, or click to choose",
    vidDropSub: "mp4 · mov · webm · mkv · avi and more",
    modeGif: "Convert to GIF", modeMp4: "Trim to MP4",
    gifWidth: "Width", optOriginal: "Keep original",
    gifFps: "Frame rate", gifQuality: "Quality",
    qHigh: "High (256 colors, sharp)", qMid: "Medium (128 colors)", qLow: "Low (64 colors, light)",
    mp4Note: "Re-encodes the selected range to MP4 with frame-accurate trimming. Long ranges may take a while.",
    mp4Quality: "Quality",
    mqHigh: "High", mqMid: "Medium", mqLow: "Low (light)",
    btnGif: "Make GIF", btnMp4: "Trim to MP4",

    audDropTitle: "Drag & drop an audio file, or click to choose",
    audDropSub: "mp3 · wav · m4a · ogg · flac · or extract audio from video",
    cutEnable: "Cut range",
    outFormat: "Output format", bitrate: "Bitrate",
    btnConvert: "Convert",
    noteMp3: "The most widely compatible lossy format.",
    noteWav: "Lossless. Large file size.",
    noteOgg: "Open format. Better quality at the same size.",
    noteM4a: "AAC — friendly with Apple devices.",

    gifDropTitle: "Drag & drop a GIF file, or click to choose",
    gifDropSub: "Split an existing GIF into frames · extract · change speed",
    framesLabelPre: "", framesLabelPost: " frames",
    selectAll: "Select all", selectNone: "Clear",
    extractTitle: "Extract selected frames",
    extractNotePre: "", extractNotePost: " frame(s) selected. Saved as PNG.",
    extractBtn: "Download selected frames as PNG",
    speedTitle: "Playback speed",
    rebuildBtn: "Build new GIF",
    speedNoteInit: "Original speed. To rebuild from only some frames, select them above (all selected = all frames).",

    footer: "Processed in your browser with ffmpeg.wasm · files are never uploaded.",
    footerMadeBy: "Made by",
    license: "Open source · MIT License",
    hubLink: "🔧 More tools →",

    introHtml: "Media Converter is a free online tool to <strong>turn video into GIF</strong> or trim a clip to MP4, <strong>convert & cut audio (mp3·wav·ogg·m4a)</strong>, and <strong>split an existing GIF into frames</strong> to extract as PNG or rebuild at a different speed. You can also extract audio from a video. Everything runs locally in your browser with ffmpeg.wasm — no file is ever sent to a server.",
    faqTitle: "Frequently Asked Questions",
    faq: [
      { q: "Are my files uploaded to a server?", a: "No. Every conversion runs entirely in your browser with ffmpeg.wasm. Your files and the results are never sent to or stored on any server." },
      { q: "Why does it download something the first time?", a: "On the first conversion it fetches the engine (ffmpeg.wasm core, ~25–31MB) once. After that it's cached and fast. A progress bar shows at the top." },
      { q: "Which video formats can I turn into GIF?", a: "Most formats — mp4, mov, webm, mkv, avi and more. Pick a range and choose resolution, frame rate and quality. You can also trim the same range to MP4." },
      { q: "Which audio formats can I convert between?", a: "Freely between mp3, wav, ogg and m4a. Choose a bitrate, and optionally cut to a start/end range. Drop a video file to extract just its audio." },
      { q: "What can the GIF editor do?", a: "It splits an existing GIF into frames shown as a filmstrip, lets you extract chosen frames as PNG, or change the playback speed (0.5×–4×) and rebuild a new GIF." },
      { q: "Is it free? Do I need to install anything?", a: "Completely free, no login or installation. Just use it in your browser." }
    ],

    guideTitle: "Welcome to Media Converter 👋",
    guideLeadHtml: "Everything runs <strong>in your browser</strong>. Your files are never uploaded.",
    guideLi1Html: "<strong>Video → GIF / Trimmer</strong> — turn a clip's range into a GIF or trim it to MP4.",
    guideLi2Html: "<strong>Audio Convert / Cutter</strong> — convert mp3·wav·ogg·m4a, cut a range, or extract audio from video.",
    guideLi3Html: "<strong>GIF Editor</strong> — split an existing GIF into frames to extract as PNG, or change speed and rebuild.",
    guideHint: "The first conversion downloads the engine (~25–31MB) once. After a short wait, it's fast.",
    guideDont: "Don't show again today",
    guideClose: "Close",

    enginePreparing: "Preparing the engine…",
    engineFirstDl: "Downloading the ffmpeg.wasm core (first time only).",
    engineReady: "Engine ready",
    engineMt: "Running in multi-thread mode.",
    engineSt: "Running in single-thread mode.",
    engineSwitching: "Switching to single-thread…",
    engineSwitchDetail: "Preparing the compatibility-mode core.",
    engineSwitched: "Multi-thread didn't respond, switched to single-thread.",
    engineGot: (mb) => `${mb} received · initializing…`,
    engineDl: (got, total) => `${got} / ~${total} downloading`,

    pGif: "Making GIF…", pMp4: "Trimming MP4…", pAudio: "Converting audio…",
    pGifBuild: "Building new GIF…", pProcessing: "Processing…",
    btnProcessing: "Processing…",

    fromVideo: " · extract audio from video",
    gifDecoding: "Splitting into frames…",
    gifDecodeFail: "Decoding failed.",
    gifStat: (w, h, n, sec, alpha) => `<strong>${w}×${h}</strong> px<br>${n} frames<br>${sec}s total${alpha ? "<br>has transparency" : ""}`,
    speedNote: (sp, n, sec) => `${sp}× · ${n} frames · rebuilds into a ~${sec}s GIF.`,

    tWrongVideo: "Please drop a video file.",
    tWrongAudio: "Please drop an audio or video file.",
    tWrongGif: "Please drop a GIF file.",
    tRangeAgain: "Please reselect the range.",
    tGifLong: "GIFs work best under 60s. Proceeding anyway.",
    tCanceled: "Conversion canceled.",
    tConvertFail: (m) => `Conversion failed: ${m}`,
    tGifReadFail: (m) => `Couldn't read the GIF: ${m}`,
    tNoFrames: "No frames found.",
    tPickFrames: "Please select frames to extract.",
    tExtracted: (n) => `Downloaded ${n} frame(s) as PNG.`,
    tExtractFail: (m) => `Extract failed: ${m}`,
    tRebuildFail: (m) => `Rebuild failed: ${m}`,
    tNoFramesShort: "No frames.",
  },
};

let currentLang = "ko";

export function getLang() { return currentLang; }

export function t(key, ...args) {
  const dict = I18N[currentLang] || I18N.en;
  let v = dict[key];
  if (v == null) v = (I18N.en[key] != null ? I18N.en[key] : key);
  return typeof v === "function" ? v(...args) : v;
}

function applyStatic() {
  const dict = I18N[currentLang] || I18N.en;
  document.documentElement.lang = currentLang;
  document.title = dict.metaTitle;

  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el && val != null) el.setAttribute("content", val); };
  setMeta('meta[name="description"]', dict.metaDesc);
  setMeta('meta[property="og:title"]', dict.ogTitle);
  setMeta('meta[property="og:description"]', dict.ogDesc);
  setMeta('meta[property="og:locale"]', LOCALE[currentLang]);
  setMeta('meta[name="twitter:title"]', dict.ogTitle);
  setMeta('meta[name="twitter:description"]', dict.ogDesc);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = dict[el.getAttribute("data-i18n")];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const v = dict[el.getAttribute("data-i18n-html")];
    if (typeof v === "string") el.innerHTML = v;
  });

  // 인트로 + FAQ
  const intro = document.getElementById("intro-text");
  if (intro) intro.innerHTML = dict.introHtml;
  const faqList = document.getElementById("faq-list");
  if (faqList) {
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    faqList.innerHTML = dict.faq.map((it) =>
      `<details><summary>${esc(it.q)}</summary><div class="faq-a">${esc(it.a)}</div></details>`).join("");
  }

  const sel = document.getElementById("lang-select");
  if (sel) sel.value = currentLang;
}

export function setLang(lang) {
  if (!I18N[lang]) lang = "en";
  currentLang = lang;
  try { localStorage.setItem("mediaConvLang", lang); } catch (_) {}
  applyStatic();
  document.dispatchEvent(new CustomEvent("mediaconv:langchange", { detail: { lang } }));
}

export function initI18n() {
  const param = new URLSearchParams(location.search).get("lang");
  let saved = null;
  try { saved = localStorage.getItem("mediaConvLang"); } catch (_) {}
  const nav = (navigator.language || "ko").slice(0, 2).toLowerCase();
  const pick = [param, saved, nav, "ko"].find((l) => l && I18N[l]) || "ko";

  const sel = document.getElementById("lang-select");
  if (sel) sel.addEventListener("change", () => setLang(sel.value));

  setLang(pick);
}
