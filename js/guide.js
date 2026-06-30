// 첫 방문 가이드 팝업 (온보딩 모달). 텍스트는 data-i18n로 처리됨.
// 키 접두어 mediaConv* — 같은 origin의 다른 도구와 충돌 방지.
const HIDE_KEY = "mediaConvGuideHide";  // localStorage: "오늘 다시 보지 않기" 날짜
const SEEN_KEY = "mediaConvGuideSeen";  // sessionStorage: 같은 세션에 이미 봄

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function initGuide() {
  const overlay = document.getElementById("guide-overlay");
  if (!overlay) return;
  const dontShow = document.getElementById("guide-dont-show");
  const closeBtn = document.getElementById("guide-close");
  const xBtn = document.getElementById("guide-x");

  let hide = null, seen = null;
  try { hide = localStorage.getItem(HIDE_KEY); } catch (_) {}
  try { seen = sessionStorage.getItem(SEEN_KEY); } catch (_) {}

  // 오늘 숨김(localStorage 날짜) 또는 이번 세션에 이미 봄(sessionStorage)이면 표시 안 함
  if (hide === todayStr() || seen) return;

  function close() {
    if (dontShow.checked) {
      try { localStorage.setItem(HIDE_KEY, todayStr()); } catch (_) {}
    }
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (_) {}
    overlay.hidden = true;
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  closeBtn.addEventListener("click", close);
  xBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onKey);

  overlay.hidden = false;
  closeBtn.focus();
}
