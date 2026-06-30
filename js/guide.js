// 첫 방문 가이드 팝업. "오늘 다시 보지 않기" 체크 시 당일 동안 숨김.
const KEY = "mc_guide_hide_until";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function initGuide() {
  const overlay = document.getElementById("guide-overlay");
  if (!overlay) return;
  const dontShow = document.getElementById("guide-dont-show");
  const closeBtn = document.getElementById("guide-close");
  const xBtn = document.getElementById("guide-x");

  let hideUntil = null;
  try { hideUntil = localStorage.getItem(KEY); } catch (_) {}
  if (hideUntil === todayStr()) return; // 오늘은 숨김

  function open() {
    overlay.hidden = false;
    closeBtn.focus();
    document.addEventListener("keydown", onKey);
  }
  function close() {
    if (dontShow.checked) {
      try { localStorage.setItem(KEY, todayStr()); } catch (_) {}
    }
    overlay.hidden = true;
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  xBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  open();
}
