// 탭 1: 비디오 → GIF 변환 / MP4 트리머
import { runJob } from "./engine.js";
import { fetchFile, terminate } from "./ffmpeg-loader.js";
import {
  $, formatTime, parseTime, formatBytes, toast,
  setupDropzone, triggerDownload, createRangeSlider,
} from "./ui.js";
import { t } from "./i18n.js";

export function initVideoTab() {
  const dropzone = $("#video-dropzone");
  const input = $("#video-input");
  const editor = $("#video-editor");
  const preview = $("#video-preview");
  const fileMeta = $("#video-file-meta");
  const rangeEl = $("#video-range");
  const readout = $("#video-trim-readout");
  const startInput = $("#video-start");
  const endInput = $("#video-end");
  const convertBtn = $("#video-convert");
  const btnLabel = convertBtn.querySelector(".btn-label");

  const modeGif = $("#mode-gif");
  const modeMp4 = $("#mode-mp4");
  const gifOptions = $("#gif-options");
  const mp4Options = $("#mp4-options");

  const progressBlock = $("#video-progress");
  const progressLabel = $("#video-progress-label");
  const progressPct = $("#video-progress-pct");
  const progressBar = $("#video-progress-bar");
  const cancelBtn = $("#video-cancel");

  const resultBlock = $("#video-result");
  const resultPreview = $("#video-result-preview");
  const downloadLink = $("#video-download");
  const resultSize = $("#video-result-size");

  let currentFile = null;
  let mode = "gif";
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

  // ---------- 파일 로드 ----------
  function loadFile(file) {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)) {
      toast(t("tWrongVideo"), true);
      return;
    }
    currentFile = file;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    preview.src = objectURL;
    fileMeta.innerHTML = `<strong>${file.name}</strong>${formatBytes(file.size)}`;

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
  }

  preview.addEventListener("timeupdate", () => slider.setPlayhead(preview.currentTime));

  setupDropzone(dropzone, input, loadFile, (f) =>
    f.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name));

  $("#video-reset").addEventListener("click", () => {
    if (busy) return;
    currentFile = null;
    preview.pause();
    editor.hidden = true;
    dropzone.hidden = false;
    resetResult();
  });

  // ---------- 시간 입력 동기화 ----------
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
  $("#video-set-start").addEventListener("click", () => {
    slider.setRange(preview.currentTime, null);
  });
  $("#video-set-end").addEventListener("click", () => {
    slider.setRange(null, preview.currentTime);
  });

  // ---------- 모드 전환 ----------
  function setMode(m) {
    mode = m;
    const isGif = m === "gif";
    modeGif.classList.toggle("is-active", isGif);
    modeMp4.classList.toggle("is-active", !isGif);
    modeGif.setAttribute("aria-checked", String(isGif));
    modeMp4.setAttribute("aria-checked", String(!isGif));
    gifOptions.hidden = !isGif;
    mp4Options.hidden = isGif;
    btnLabel.textContent = isGif ? t("btnGif") : t("btnMp4");
  }
  modeGif.addEventListener("click", () => setMode("gif"));
  modeMp4.addEventListener("click", () => setMode("mp4"));
  document.addEventListener("mediaconv:langchange", () => { if (!busy) setMode(mode); });

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
    btnLabel.textContent = lock ? t("btnProcessing") : (mode === "gif" ? t("btnGif") : t("btnMp4"));
  }

  cancelBtn.addEventListener("click", () => {
    if (!busy) return;
    terminate();           // 실행 중 작업 강제 종료
    busy = false;
    lockUI(false);
    progressBlock.hidden = true;
    toast(t("tCanceled"));
  });

  // ---------- 변환 실행 ----------
  convertBtn.addEventListener("click", async () => {
    if (!currentFile || busy) return;
    const { start, end } = slider.getRange();
    const dur = end - start;
    if (dur <= 0) { toast(t("tRangeAgain"), true); return; }
    if (mode === "gif" && dur > 60) {
      toast(t("tGifLong"));
    }

    try {
      lockUI(true);
      showProgress(t("enginePreparing"));

      const job = async (ffmpeg) => {
        showProgress(mode === "gif" ? t("pGif") : t("pMp4"));
        const ext = (currentFile.name.split(".").pop() || "mp4").toLowerCase();
        const inputName = `in.${ext}`;
        await ffmpeg.writeFile(inputName, await fetchFile(currentFile));

        let outName, outType;
        if (mode === "gif") {
          outName = "out.gif";
          outType = "image/gif";
          await runGif(ffmpeg, inputName, outName, start, dur);
        } else {
          outName = "out.mp4";
          outType = "video/mp4";
          await runMp4(ffmpeg, inputName, outName, start, dur);
        }
        const data = await ffmpeg.readFile(outName);
        const blob = new Blob([data.buffer], { type: outType });
        await safeDelete(ffmpeg, [inputName, outName, "palette.png"]);
        return { blob, outType };
      };

      const { blob, outType } = await runJob(job, setProgress);
      showResult(blob, outType);
    } catch (err) {
      console.error(err);
      if (busy) toast(t("tConvertFail", err.message || err), true);
    } finally {
      progressBlock.hidden = true;
      lockUI(false);
    }
  });

  async function runGif(ffmpeg, input, output, start, dur) {
    const width = parseInt($("#gif-width").value, 10);
    const fps = parseInt($("#gif-fps").value, 10);
    const quality = $("#gif-quality").value;
    const colors = quality === "high" ? 256 : quality === "medium" ? 128 : 64;

    const scale = width > 0 ? `scale=${width}:-1:flags=lanczos` : "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos";
    const baseChain = `fps=${fps},${scale}`;

    // 1단계: 팔레트 생성
    await ffmpeg.exec([
      "-ss", String(start), "-t", String(dur), "-i", input,
      "-vf", `${baseChain},palettegen=max_colors=${colors}:stats_mode=diff`,
      "-y", "palette.png",
    ]);
    // 2단계: 팔레트 적용
    await ffmpeg.exec([
      "-ss", String(start), "-t", String(dur), "-i", input, "-i", "palette.png",
      "-lavfi", `${baseChain}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
      "-y", output,
    ]);
  }

  async function runMp4(ffmpeg, input, output, start, dur) {
    const crf = $("#mp4-quality").value;
    await ffmpeg.exec([
      "-ss", String(start), "-i", input, "-t", String(dur),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", crf, "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", "-y", output,
    ]);
  }

  async function safeDelete(ffmpeg, names) {
    for (const n of names) {
      try { await ffmpeg.deleteFile(n); } catch (_) {}
    }
  }

  function showResult(blob, type, baseName) {
    resultURL = URL.createObjectURL(blob);
    resultPreview.innerHTML = "";
    if (type === "image/gif") {
      const img = document.createElement("img");
      img.src = resultURL;
      img.alt = "변환된 GIF 미리보기";
      resultPreview.appendChild(img);
    } else {
      const vid = document.createElement("video");
      vid.src = resultURL;
      vid.controls = true;
      vid.playsInline = true;
      resultPreview.appendChild(vid);
    }
    const stem = (currentFile.name.replace(/\.[^.]+$/, "")) || "output";
    downloadLink.href = resultURL;
    downloadLink.download = type === "image/gif" ? `${stem}.gif` : `${stem}_trim.mp4`;
    resultSize.textContent = formatBytes(blob.size);
    resultBlock.hidden = false;
    resultBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  setMode("gif");
}
