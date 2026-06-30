// 탭 2: 오디오 변환 / 커터 (비디오에서 오디오 추출 포함)
import { runJob } from "./engine.js";
import { fetchFile, terminate } from "./ffmpeg-loader.js";
import {
  $, formatTime, parseTime, formatBytes, toast,
  setupDropzone, createRangeSlider,
} from "./ui.js";

const FORMAT_INFO = {
  mp3: { codec: "libmp3lame", ext: "mp3", mime: "audio/mpeg", lossy: true, note: "가장 호환성이 좋은 손실 압축 포맷이에요." },
  wav: { codec: "pcm_s16le", ext: "wav", mime: "audio/wav", lossy: false, note: "무손실. 파일 크기가 큽니다." },
  ogg: { codec: "libvorbis", ext: "ogg", mime: "audio/ogg", lossy: true, note: "오픈 포맷. 같은 용량에서 음질이 좋아요." },
  m4a: { codec: "aac", ext: "m4a", mime: "audio/mp4", lossy: true, note: "Apple 기기 친화적인 AAC 포맷이에요." },
};

export function initAudioTab() {
  const dropzone = $("#audio-dropzone");
  const input = $("#audio-input");
  const editor = $("#audio-editor");
  const preview = $("#audio-preview");
  const fileMeta = $("#audio-file-meta");
  const canvas = $("#audio-waveform");

  const cutEnable = $("#audio-cut-enable");
  const rangeEl = $("#audio-range");
  const readout = $("#audio-trim-readout");
  const startInput = $("#audio-start");
  const endInput = $("#audio-end");
  const setStartBtn = $("#audio-set-start");
  const setEndBtn = $("#audio-set-end");

  const formatSel = $("#audio-format");
  const bitrateField = $("#audio-bitrate-field");
  const bitrateSel = $("#audio-bitrate");
  const formatNote = $("#audio-format-note");
  const convertBtn = $("#audio-convert");
  const btnLabel = convertBtn.querySelector(".btn-label");

  const progressBlock = $("#audio-progress");
  const progressLabel = $("#audio-progress-label");
  const progressPct = $("#audio-progress-pct");
  const progressBar = $("#audio-progress-bar");
  const cancelBtn = $("#audio-cancel");

  const resultBlock = $("#audio-result");
  const resultPreview = $("#audio-result-preview");
  const downloadLink = $("#audio-download");
  const resultSize = $("#audio-result-size");

  let currentFile = null;
  let busy = false;
  let objectURL = null;
  let resultURL = null;

  const slider = createRangeSlider(rangeEl, {
    onChange: (s, e) => {
      startInput.value = formatTime(s, true);
      endInput.value = formatTime(e, true);
      readout.textContent = `${formatTime(s)} – ${formatTime(e)}`;
    },
    onScrub: (t) => { preview.currentTime = t; },
  });
  slider.setDisabled(true);

  // ---------- 파일 로드 ----------
  function loadFile(file) {
    const ok = file.type.startsWith("audio/") || file.type.startsWith("video/") ||
      /\.(mp3|wav|m4a|ogg|flac|aac|mp4|mov|webm|mkv)$/i.test(file.name);
    if (!ok) { toast("오디오 또는 비디오 파일을 올려주세요.", true); return; }

    currentFile = file;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    preview.src = objectURL;
    const kind = file.type.startsWith("video/") ? " · 영상에서 오디오 추출" : "";
    fileMeta.innerHTML = `<strong>${file.name}</strong>${formatBytes(file.size)}${kind}`;

    preview.addEventListener("loadedmetadata", () => {
      const d = preview.duration || 0;
      slider.setDuration(d);
      startInput.value = formatTime(0, true);
      endInput.value = formatTime(d, true);
      readout.textContent = `${formatTime(0)} – ${formatTime(d)}`;
    }, { once: true });

    dropzone.hidden = true;
    editor.hidden = false;
    resetResult();
    drawWaveform(file).catch(() => { canvas.style.display = "none"; });
  }

  preview.addEventListener("timeupdate", () => slider.setPlayhead(preview.currentTime));

  setupDropzone(dropzone, input, loadFile);

  $("#audio-reset").addEventListener("click", () => {
    if (busy) return;
    currentFile = null;
    preview.pause();
    editor.hidden = true;
    dropzone.hidden = false;
    canvas.style.display = "";
    resetResult();
  });

  // ---------- 커팅 토글 ----------
  function setCutEnabled(on) {
    slider.setDisabled(!on);
    [startInput, endInput, setStartBtn, setEndBtn].forEach((el) => { el.disabled = !on; });
  }
  cutEnable.addEventListener("change", () => setCutEnabled(cutEnable.checked));

  function commitTimeInputs() {
    const d = preview.duration || 0;
    let s = parseTime(startInput.value);
    let e = parseTime(endInput.value);
    s = Math.max(0, Math.min(s, d));
    e = Math.max(s + 0.1, Math.min(e, d));
    slider.setRange(s, e);
  }
  startInput.addEventListener("change", commitTimeInputs);
  endInput.addEventListener("change", commitTimeInputs);
  setStartBtn.addEventListener("click", () => slider.setRange(preview.currentTime, null));
  setEndBtn.addEventListener("click", () => slider.setRange(null, preview.currentTime));

  // ---------- 포맷 옵션 ----------
  function refreshFormat() {
    const info = FORMAT_INFO[formatSel.value];
    bitrateField.hidden = !info.lossy;
    formatNote.textContent = info.note;
  }
  formatSel.addEventListener("change", refreshFormat);

  // ---------- 진행률 ----------
  function showProgress(label) {
    progressLabel.textContent = label;
    progressPct.textContent = "0%";
    progressBar.style.width = "0%";
    progressBlock.hidden = false;
    resultBlock.hidden = true;
  }
  function setProgress(ratio) {
    const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
    progressPct.textContent = `${pct}%`;
    progressBar.style.width = `${pct}%`;
  }
  function resetResult() {
    resultBlock.hidden = true;
    resultPreview.innerHTML = "";
    if (resultURL) { URL.revokeObjectURL(resultURL); resultURL = null; }
  }
  function lockUI(lock) {
    busy = lock;
    convertBtn.disabled = lock;
    btnLabel.textContent = lock ? "처리 중…" : "변환하기";
  }

  cancelBtn.addEventListener("click", () => {
    if (!busy) return;
    terminate();
    busy = false;
    lockUI(false);
    progressBlock.hidden = true;
    toast("변환을 취소했어요.");
  });

  // ---------- 변환 실행 ----------
  convertBtn.addEventListener("click", async () => {
    if (!currentFile || busy) return;
    const info = FORMAT_INFO[formatSel.value];
    const useCut = cutEnable.checked;
    const { start, end } = slider.getRange();
    const dur = end - start;
    if (useCut && dur <= 0) { toast("구간을 다시 선택해주세요.", true); return; }

    try {
      lockUI(true);
      showProgress("변환 엔진 준비 중…");

      const job = async (ffmpeg) => {
        showProgress("오디오 변환 중…");
        const ext = (currentFile.name.split(".").pop() || "dat").toLowerCase();
        const inputName = `in.${ext}`;
        const outName = `out.${info.ext}`;
        await ffmpeg.writeFile(inputName, await fetchFile(currentFile));

        const args = [];
        if (useCut) args.push("-ss", String(start), "-t", String(dur));
        args.push("-i", inputName, "-vn", "-c:a", info.codec);
        if (info.lossy) args.push("-b:a", `${bitrateSel.value}k`);
        else args.push("-ar", "44100", "-ac", "2");
        args.push("-y", outName);

        await ffmpeg.exec(args);
        const data = await ffmpeg.readFile(outName);
        const blob = new Blob([data.buffer], { type: info.mime });
        try { await ffmpeg.deleteFile(inputName); } catch (_) {}
        try { await ffmpeg.deleteFile(outName); } catch (_) {}
        return blob;
      };

      const blob = await runJob(job, setProgress);
      showResult(blob, info);
    } catch (err) {
      console.error(err);
      if (busy) toast(`변환 실패: ${err.message || err}`, true);
    } finally {
      progressBlock.hidden = true;
      lockUI(false);
    }
  });

  function showResult(blob, info) {
    resultURL = URL.createObjectURL(blob);
    resultPreview.innerHTML = "";
    const audio = document.createElement("audio");
    audio.src = resultURL;
    audio.controls = true;
    resultPreview.appendChild(audio);

    const stem = (currentFile.name.replace(/\.[^.]+$/, "")) || "audio";
    downloadLink.href = resultURL;
    downloadLink.download = `${stem}.${info.ext}`;
    resultSize.textContent = formatBytes(blob.size);
    resultBlock.hidden = false;
    resultBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- 파형 그리기 (WebAudio) ----------
  async function drawWaveform(file) {
    canvas.style.display = "";
    // 큰 파일은 디코딩 비용이 커서 건너뛴다 (슬라이더는 그대로 동작)
    if (file.size > 80 * 1024 * 1024) { canvas.style.display = "none"; return; }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { canvas.style.display = "none"; return; }

    const buf = await file.arrayBuffer();
    const ctx = new AudioCtx();
    const audioBuf = await ctx.decodeAudioData(buf);
    ctx.close();

    const data = audioBuf.getChannelData(0);
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 600;
    const H = canvas.clientHeight || 96;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);

    const mid = H / 2;
    const samplesPerPx = Math.floor(data.length / W) || 1;
    c.fillStyle = "#3D6B5E";
    for (let x = 0; x < W; x++) {
      let min = 1, max = -1;
      const startI = x * samplesPerPx;
      for (let i = 0; i < samplesPerPx; i++) {
        const v = data[startI + i] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yTop = mid + min * mid * 0.92;
      const h = Math.max(1, (max - min) * mid * 0.92);
      c.fillRect(x, yTop, 1, h);
    }
  }

  refreshFormat();
  setCutEnabled(false);
}
