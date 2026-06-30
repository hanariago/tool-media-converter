// 탭 3: GIF 편집 — 프레임 추출 / 속도 조절 / 재조합
// 디코딩: gifuct-js, 인코딩: gifenc. 전부 브라우저 로컬 처리(ffmpeg 엔진 불필요).
// gifuct-js는 의존성(js-binary-schema-parser)을 CDN에서 함께 해석하므로 런타임 CDN ESM으로 로드.
// gifenc는 자체 완결이라 로컬 vendoring.
import { parseGIF, decompressFrames } from "https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm";
import { GIFEncoder, quantize, applyPalette } from "./vendor/gifenc/index.js";
import { $, formatBytes, toast, setupDropzone } from "./ui.js";
import { t } from "./i18n.js";

export function initGifTab() {
  const dropzone = $("#gif-dropzone");
  const input = $("#gif-input");
  const editor = $("#gif-editor");
  const preview = $("#gif-preview");
  const fileMeta = $("#gif-file-meta");
  const statEl = $("#gif-stat");
  const filmstrip = $("#gif-filmstrip");
  const frameCountEl = $("#gif-frame-count");
  const selectedCountEl = $("#gif-selected-count");

  const extractBtn = $("#gif-extract");
  const rebuildBtn = $("#gif-rebuild");
  const speedRange = $("#gif-speed-range");
  const speedNum = $("#gif-speed-num");
  const speedNote = $("#gif-speed-note");
  const speedPresets = $("#gif-speed-presets");

  const progressBlock = $("#gif-progress");
  const progressLabel = $("#gif-progress-label");
  const progressPct = $("#gif-progress-pct");
  const progressBar = $("#gif-progress-bar");

  const resultBlock = $("#gif-result");
  const resultPreview = $("#gif-result-preview");
  const downloadLink = $("#gif-download");
  const resultSize = $("#gif-result-size");

  let fileName = "image.gif";
  let fullW = 0, fullH = 0;
  let frames = [];          // { imageData, delay, selected }
  let hasAlpha = false;
  let speed = 1;
  let busy = false;
  let objectURL = null;
  let resultURL = null;

  // ---------- 파일 로드 ----------
  async function loadFile(file) {
    if (file.type !== "image/gif" && !/\.gif$/i.test(file.name)) {
      toast(t("tWrongGif"), true);
      return;
    }
    fileName = file.name;
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    preview.src = objectURL;
    fileMeta.innerHTML = `<strong>${file.name}</strong>${formatBytes(file.size)}`;

    dropzone.hidden = true;
    editor.hidden = false;
    resetResult();
    filmstrip.innerHTML = `<p class="opt-note">${t("gifDecoding")}</p>`;

    try {
      const buf = await file.arrayBuffer();
      const gif = parseGIF(buf);
      const raw = decompressFrames(gif, true);
      if (!raw.length) throw new Error(t("tNoFrames"));
      fullW = gif.lsd.width;
      fullH = gif.lsd.height;
      compositeFrames(raw);
      renderFilmstrip();
      refreshStat();
      updateSpeedNote();
    } catch (err) {
      console.error(err);
      toast(t("tGifReadFail", err.message || err), true);
      filmstrip.innerHTML = `<p class="opt-note">${t("gifDecodeFail")}</p>`;
    }
  }

  function refreshStat() {
    if (!frames.length) return;
    const totalMs = frames.reduce((a, f) => a + f.delay, 0);
    statEl.innerHTML = t("gifStat", fullW, fullH, frames.length, (totalMs / 1000).toFixed(2), hasAlpha);
  }

  // 패치(부분 프레임)들을 디스포절 규칙에 따라 전체 프레임으로 합성
  function compositeFrames(raw) {
    frames = [];
    hasAlpha = false;
    const canvas = document.createElement("canvas");
    canvas.width = fullW; canvas.height = fullH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const tmp = document.createElement("canvas");
    const tctx = tmp.getContext("2d");

    let prevDisposal = 0, prevDims = null, savedBeforePrev = null;

    for (const frame of raw) {
      if (prevDims) {
        if (prevDisposal === 2) ctx.clearRect(prevDims.left, prevDims.top, prevDims.width, prevDims.height);
        else if (prevDisposal === 3 && savedBeforePrev) ctx.putImageData(savedBeforePrev, 0, 0);
      }
      const snapshot = ctx.getImageData(0, 0, fullW, fullH);

      const { width, height, top, left } = frame.dims;
      tmp.width = width; tmp.height = height;
      tctx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), width, height), 0, 0);
      ctx.drawImage(tmp, left, top);

      const imageData = ctx.getImageData(0, 0, fullW, fullH);
      if (!hasAlpha) {
        const d = imageData.data;
        for (let i = 3; i < d.length; i += 4) { if (d[i] < 255) { hasAlpha = true; break; } }
      }
      frames.push({ imageData, delay: frame.delay || 100, selected: true });

      prevDisposal = frame.disposalType;
      prevDims = frame.dims;
      savedBeforePrev = snapshot;
    }
  }

  // ---------- 필름스트립 ----------
  function renderFilmstrip() {
    filmstrip.innerHTML = "";
    frameCountEl.textContent = frames.length;
    const thumbH = 70;
    frames.forEach((f, i) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "frame-item" + (f.selected ? " is-selected" : "");
      item.dataset.index = i;

      const scale = Math.min(1, (92) / fullW, thumbH / fullH);
      const tw = Math.max(1, Math.round(fullW * scale));
      const th = Math.max(1, Math.round(fullH * scale));
      const c = document.createElement("canvas");
      c.width = tw; c.height = th;
      const cc = c.getContext("2d");
      // 원본 프레임을 임시 캔버스에 올린 뒤 축소 그리기
      const src = document.createElement("canvas");
      src.width = fullW; src.height = fullH;
      src.getContext("2d").putImageData(f.imageData, 0, 0);
      cc.drawImage(src, 0, 0, tw, th);

      const meta = document.createElement("div");
      meta.className = "frame-meta";
      meta.innerHTML = `<span class="frame-idx">#${i + 1}</span><input type="checkbox" class="frame-check" ${f.selected ? "checked" : ""} tabindex="-1" aria-hidden="true">`;

      item.appendChild(c);
      item.appendChild(meta);
      item.addEventListener("click", () => toggleFrame(i));
      filmstrip.appendChild(item);
    });
    updateSelectedCount();
  }

  function toggleFrame(i) {
    frames[i].selected = !frames[i].selected;
    const item = filmstrip.children[i];
    item.classList.toggle("is-selected", frames[i].selected);
    item.querySelector(".frame-check").checked = frames[i].selected;
    updateSelectedCount();
  }
  function setAllSelection(val) {
    frames.forEach((f, i) => {
      f.selected = val;
      const item = filmstrip.children[i];
      item.classList.toggle("is-selected", val);
      item.querySelector(".frame-check").checked = val;
    });
    updateSelectedCount();
  }
  function updateSelectedCount() {
    const n = frames.filter((f) => f.selected).length;
    selectedCountEl.textContent = n;
    updateSpeedNote();
  }

  $("#gif-select-all").addEventListener("click", () => setAllSelection(true));
  $("#gif-select-none").addEventListener("click", () => setAllSelection(false));

  setupDropzone(dropzone, input, loadFile, (f) => f.type === "image/gif" || /\.gif$/i.test(f.name));

  $("#gif-reset").addEventListener("click", () => {
    if (busy) return;
    frames = [];
    editor.hidden = true;
    dropzone.hidden = false;
    resetResult();
  });

  // ---------- 속도 컨트롤 ----------
  function setSpeed(v) {
    speed = Math.min(4, Math.max(0.25, Number(v) || 1));
    speedRange.value = speed;
    speedNum.value = speed;
    [...speedPresets.children].forEach((b) =>
      b.classList.toggle("is-active", Math.abs(Number(b.dataset.speed) - speed) < 0.001));
    updateSpeedNote();
  }
  function updateSpeedNote() {
    if (!frames.length) { speedNote.textContent = t("speedNoteInit"); return; }
    const sel = frames.filter((f) => f.selected);
    const useFrames = sel.length ? sel : frames;
    const totalMs = useFrames.reduce((a, f) => a + Math.max(20, f.delay / speed), 0);
    speedNote.textContent = t("speedNote", speed, useFrames.length, (totalMs / 1000).toFixed(2));
  }
  speedRange.addEventListener("input", () => setSpeed(speedRange.value));
  speedNum.addEventListener("input", () => setSpeed(speedNum.value));
  speedPresets.addEventListener("click", (e) => {
    const b = e.target.closest("[data-speed]");
    if (b) setSpeed(b.dataset.speed);
  });

  // ---------- 진행률 ----------
  function showProgress(label) {
    progressLabel.textContent = label;
    progressPct.textContent = "0%";
    progressBar.style.width = "0%";
    progressBlock.hidden = false;
    resultBlock.hidden = true;
  }
  function setProgress(ratio) {
    const pct = Math.min(100, Math.round(ratio * 100));
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
    extractBtn.disabled = lock;
    rebuildBtn.disabled = lock;
  }

  const stem = () => fileName.replace(/\.[^.]+$/, "") || "gif";

  // ---------- 프레임 PNG 추출 ----------
  extractBtn.addEventListener("click", async () => {
    if (busy || !frames.length) return;
    const selected = frames.map((f, i) => ({ f, i })).filter((x) => x.f.selected);
    if (!selected.length) { toast(t("tPickFrames"), true); return; }

    lockUI(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = fullW; canvas.height = fullH;
      const ctx = canvas.getContext("2d");
      for (let k = 0; k < selected.length; k++) {
        const { f, i } = selected[k];
        ctx.clearRect(0, 0, fullW, fullH);
        ctx.putImageData(f.imageData, 0, 0);
        const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${stem()}_frame${String(i + 1).padStart(3, "0")}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        await new Promise((r) => setTimeout(r, 250)); // 연속 다운로드 차단 방지
      }
      toast(t("tExtracted", selected.length));
    } catch (err) {
      console.error(err);
      toast(t("tExtractFail", err.message || err), true);
    } finally {
      lockUI(false);
    }
  });

  // ---------- 새 GIF 재조합 (gifenc) ----------
  rebuildBtn.addEventListener("click", async () => {
    if (busy || !frames.length) return;
    const sel = frames.filter((f) => f.selected);
    const useFrames = sel.length ? sel : frames;
    if (!useFrames.length) { toast(t("tNoFramesShort"), true); return; }

    lockUI(true);
    showProgress(t("pGifBuild"));
    try {
      const enc = GIFEncoder();
      const fmt = hasAlpha ? "rgba4444" : "rgb565";
      for (let i = 0; i < useFrames.length; i++) {
        const data = useFrames[i].imageData.data;
        const palette = quantize(data, 256, { format: fmt });
        const index = applyPalette(data, palette, fmt);
        const delay = Math.max(20, Math.round(useFrames[i].delay / speed));
        enc.writeFrame(index, fullW, fullH, { palette, delay, transparent: hasAlpha });
        setProgress((i + 1) / useFrames.length);
        if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0)); // UI 양보
      }
      enc.finish();
      const bytes = enc.bytes();
      const blob = new Blob([bytes], { type: "image/gif" });
      showResult(blob);
    } catch (err) {
      console.error(err);
      toast(`재조합 실패: ${err.message || err}`, true);
    } finally {
      progressBlock.hidden = true;
      lockUI(false);
    }
  });

  // 언어 변경 시 동적 텍스트(통계·속도 노트) 갱신
  document.addEventListener("mediaconv:langchange", () => { refreshStat(); updateSpeedNote(); });

  function showResult(blob) {
    resultURL = URL.createObjectURL(blob);
    resultPreview.innerHTML = "";
    const img = document.createElement("img");
    img.src = resultURL;
    img.alt = "재조합된 GIF";
    resultPreview.appendChild(img);
    downloadLink.href = resultURL;
    downloadLink.download = `${stem()}_${speed}x.gif`;
    resultSize.textContent = formatBytes(blob.size);
    resultBlock.hidden = false;
    resultBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  setSpeed(1);
}
