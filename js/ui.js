// 공통 UI 유틸리티

export const $ = (sel, root = document) => root.querySelector(sel);

// 초 -> "m:ss" 또는 "h:mm:ss" (소수점 1자리까지 옵션)
export function formatTime(sec, withDecimal = false) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const sStr = withDecimal ? s.toFixed(1).padStart(4, "0") : String(Math.floor(s)).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${sStr}`;
  return `${m}:${sStr}`;
}

// "m:ss", "h:mm:ss", "ss.s", "90" 등을 초로 파싱
export function parseTime(str) {
  if (typeof str === "number") return str;
  str = String(str).trim();
  if (!str) return 0;
  const parts = str.split(":").map((p) => parseFloat(p) || 0);
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return Math.max(0, sec);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let toastTimer = null;
export function toast(message, isError = false) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 5000 : 3000);
}

// 드래그앤드롭 + 클릭 업로드 연결
export function setupDropzone(dropzoneEl, inputEl, onFile, accept = null) {
  const open = () => inputEl.click();
  dropzoneEl.addEventListener("click", open);
  dropzoneEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  inputEl.addEventListener("change", () => {
    if (inputEl.files && inputEl.files[0]) onFile(inputEl.files[0]);
    inputEl.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dropzoneEl.addEventListener(ev, (e) => { e.preventDefault(); dropzoneEl.classList.add("is-dragover"); })
  );
  ["dragleave", "dragend", "drop"].forEach((ev) =>
    dropzoneEl.addEventListener(ev, (e) => { e.preventDefault(); dropzoneEl.classList.remove("is-dragover"); })
  );
  dropzoneEl.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (accept && !accept(file)) { toast("지원하지 않는 파일 형식이에요.", true); return; }
    onFile(file);
  });
}

export function triggerDownload(anchorEl, blob, filename) {
  const url = URL.createObjectURL(blob);
  anchorEl.href = url;
  anchorEl.download = filename;
}

/**
 * 듀얼 핸들 레인지 슬라이더. 마우스/터치(Pointer Events) 대응.
 * @returns {{ setDuration:Function, getRange:Function, setRange:Function, setPlayhead:Function, setDisabled:Function }}
 */
export function createRangeSlider(container, { onChange = () => {}, onScrub = null } = {}) {
  container.innerHTML = `
    <div class="rs-track"></div>
    <div class="rs-range"></div>
    <div class="rs-playhead"></div>
    <div class="rs-handle rs-start" tabindex="0" role="slider" aria-label="시작 지점"></div>
    <div class="rs-handle rs-end" tabindex="0" role="slider" aria-label="끝 지점"></div>
  `;
  const track = container.querySelector(".rs-track");
  const startHandle = container.querySelector(".rs-start");
  const endHandle = container.querySelector(".rs-end");
  const playhead = container.querySelector(".rs-playhead");

  let duration = 0;
  let start = 0;
  let end = 0;
  let dragging = null;

  function render() {
    const sPct = duration > 0 ? (start / duration) * 100 : 0;
    const ePct = duration > 0 ? (end / duration) * 100 : 100;
    container.style.setProperty("--start", `${sPct}%`);
    container.style.setProperty("--end", `${ePct}%`);
    startHandle.setAttribute("aria-valuenow", start.toFixed(1));
    endHandle.setAttribute("aria-valuenow", end.toFixed(1));
  }

  function ratioFromEvent(e) {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, x));
  }

  function onPointerDown(which, e) {
    e.preventDefault();
    dragging = which;
    container.setPointerCapture?.(e.pointerId);
    (which === "start" ? startHandle : endHandle).focus();
  }

  container.addEventListener("pointerdown", (e) => {
    if (duration <= 0) return;
    if (e.target === startHandle) return onPointerDown("start", e);
    if (e.target === endHandle) return onPointerDown("end", e);
    // 트랙 클릭: 스크럽(미리보기 탐색)
    if (onScrub) onScrub(ratioFromEvent(e) * duration);
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging || duration <= 0) return;
    const t = ratioFromEvent(e) * duration;
    const minGap = Math.min(0.1, duration / 100);
    if (dragging === "start") start = Math.min(t, end - minGap);
    else end = Math.max(t, start + minGap);
    start = Math.max(0, start);
    end = Math.min(duration, end);
    render();
    onChange(start, end);
  });

  window.addEventListener("pointerup", () => { dragging = null; });

  // 키보드 접근성
  function keyHandler(which) {
    return (e) => {
      if (duration <= 0) return;
      const step = e.shiftKey ? duration / 20 : duration / 200;
      let handled = true;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        if (which === "start") start = Math.max(0, start - step);
        else end = Math.max(start + 0.1, end - step);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        if (which === "start") start = Math.min(end - 0.1, start + step);
        else end = Math.min(duration, end + step);
      } else handled = false;
      if (handled) { e.preventDefault(); render(); onChange(start, end); }
    };
  }
  startHandle.addEventListener("keydown", keyHandler("start"));
  endHandle.addEventListener("keydown", keyHandler("end"));

  return {
    setDuration(d) {
      duration = d || 0;
      start = 0;
      end = duration;
      startHandle.setAttribute("aria-valuemin", "0");
      endHandle.setAttribute("aria-valuemax", duration.toFixed(1));
      render();
    },
    getRange() { return { start, end }; },
    setRange(s, e) {
      if (s != null) start = Math.max(0, Math.min(s, duration));
      if (e != null) end = Math.max(start + 0.1, Math.min(e, duration));
      render();
      onChange(start, end);
    },
    setPlayhead(t) {
      const pct = duration > 0 ? (t / duration) * 100 : 0;
      playhead.style.left = `${pct}%`;
    },
    setDisabled(disabled) {
      container.classList.toggle("is-disabled", disabled);
    },
  };
}
