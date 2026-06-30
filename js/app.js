// 엔트리포인트: 탭 전환 + 각 탭 초기화
import { initVideoTab } from "./tab-video.js";
import { initAudioTab } from "./tab-audio.js";

function setupTabs() {
  const tabs = [
    { btn: document.getElementById("tab-btn-video"), panel: document.getElementById("panel-video") },
    { btn: document.getElementById("tab-btn-audio"), panel: document.getElementById("panel-audio") },
  ];

  function activate(index) {
    tabs.forEach((t, i) => {
      const on = i === index;
      t.btn.classList.toggle("is-active", on);
      t.btn.setAttribute("aria-selected", String(on));
      t.btn.tabIndex = on ? 0 : -1;
      t.panel.classList.toggle("is-active", on);
      t.panel.hidden = !on;
    });
  }

  tabs.forEach((t, i) => {
    t.btn.addEventListener("click", () => activate(i));
    t.btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        activate(next);
        tabs[next].btn.focus();
      }
    });
  });
}

setupTabs();
initVideoTab();
initAudioTab();

// SharedArrayBuffer 미지원 환경 안내 (coi-serviceworker가 첫 방문 시 리로드하므로 보통 두 번째 로드부터 OK)
if (typeof window !== "undefined" && !window.crossOriginIsolated) {
  console.info("[media-converter] crossOriginIsolated=false → 단일스레드 모드로 동작합니다.");
}
