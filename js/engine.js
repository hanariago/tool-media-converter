// 엔진(ffmpeg.wasm) 온디맨드 로딩 + 상단 배너 UI + 작업 실행(워치독 폴백)
//
// core-mt(멀티스레드)는 빠르지만 일부 환경에서 인코딩이 데드락(무한 멈춤)할 수 있다.
// 그래서 작업 실행을 워치독으로 감싸, 첫 진척이 일정 시간 안에 없으면
// 단일스레드 코어로 자동 전환해 재실행한다. 한 번 전환되면 세션 동안 단일스레드 유지.

import { loadFFmpeg, isLoaded, usingMultiThread, getFFmpeg, onProgress, terminate } from "./ffmpeg-loader.js";
import { formatBytes, toast } from "./ui.js";
import { t } from "./i18n.js";

const banner = document.getElementById("engine-banner");
const titleEl = document.getElementById("engine-title");
const detailEl = document.getElementById("engine-detail");
const barEl = document.getElementById("engine-bar");
const percentEl = document.getElementById("engine-percent");

const WATCHDOG_MS = 15000; // 첫 진척까지 허용 시간
let readyHideTimer = null;
let forcedST = false;
try { forcedST = sessionStorage.getItem("mc_force_st") === "1"; } catch (_) {}

function showBanner(title, detail) {
  clearTimeout(readyHideTimer);
  banner.hidden = false;
  banner.classList.remove("is-ready");
  titleEl.textContent = title;
  detailEl.textContent = detail;
}

async function load() {
  showBanner(t("enginePreparing"), t("engineFirstDl"));
  await loadFFmpeg({
    forceSingleThread: forcedST,
    onProgress: ({ loadedBytes, totalBytes, percent }) => {
      barEl.style.width = `${percent}%`;
      percentEl.textContent = `${percent}%`;
      detailEl.textContent = percent >= 100
        ? t("engineGot", formatBytes(loadedBytes))
        : t("engineDl", formatBytes(loadedBytes), formatBytes(totalBytes));
    },
  });
  banner.classList.add("is-ready");
  titleEl.textContent = t("engineReady");
  detailEl.textContent = usingMultiThread() ? t("engineMt") : t("engineSt");
  percentEl.textContent = "100%";
  barEl.style.width = "100%";
  readyHideTimer = setTimeout(() => { banner.hidden = true; }, 2000);
}

/** 엔진이 준비됐는지 보장한다. 최초 호출 시 배너로 다운로드 진행률을 표시한다. */
export async function ensureEngine() {
  if (isLoaded()) return;
  await load();
}

// 작업을 워치독으로 감싼다. 첫 progress 가 timeoutMs 안에 안 오면 폴백.
function runWithWatchdog(jobThunk, aliveRef, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled && !aliveRef.alive) {
        settled = true;
        const e = new Error("watchdog timeout");
        e.code = "WATCHDOG";
        reject(e);
      }
    }, timeoutMs);
    jobThunk().then(
      (r) => { if (!settled) { settled = true; clearTimeout(timer); resolve(r); } },
      (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } }
    );
  });
}

/**
 * ffmpeg 작업을 실행한다. 멀티스레드가 멈추면 단일스레드로 자동 재시도.
 * @param {(ffmpeg:any)=>Promise<any>} job  ffmpeg 인스턴스를 받아 변환을 수행
 * @param {(progress:number)=>void} onProg  변환 진행률(0~1)
 */
export async function runJob(job, onProg = () => {}) {
  await ensureEngine();

  const aliveRef = { alive: false };
  let off = onProgress(({ progress }) => { aliveRef.alive = true; onProg(progress); });

  try {
    return await runWithWatchdog(() => job(getFFmpeg()), aliveRef, WATCHDOG_MS);
  } catch (e) {
    if (e && e.code === "WATCHDOG" && usingMultiThread()) {
      // 멀티스레드 데드락 → 단일스레드로 전환 후 재실행
      off();
      terminate();
      forcedST = true;
      try { sessionStorage.setItem("mc_force_st", "1"); } catch (_) {}
      toast(t("engineSwitched"));
      showBanner(t("engineSwitching"), t("engineSwitchDetail"));
      await load();
      aliveRef.alive = false;
      off = onProgress(({ progress }) => { aliveRef.alive = true; onProg(progress); });
      return await job(getFFmpeg());
    }
    throw e;
  } finally {
    off();
  }
}
