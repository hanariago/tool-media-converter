// ffmpeg.wasm 싱글톤 로더
// - crossOriginIsolated 면 멀티스레드 코어(core-mt), 아니면 단일스레드 코어로 폴백
// - 코어 다운로드를 직접 스트리밍하면서 MB/진행률을 콜백으로 보고

// 글루 코드는 로컬에 vendoring 되어 있어야 한다 (cross-origin 모듈 워커 차단 회피).
// 코어(wasm)만 CDN에서 blob으로 내려받는다.
import { FFmpeg } from "./vendor/ffmpeg/index.js";
import { fetchFile } from "./vendor/util/index.js";

const MT_BASE = "https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/esm";
const ST_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

let ffmpeg = null;       // FFmpeg 인스턴스
let loadPromise = null;  // 진행 중/완료된 로드 프로미스 (한 번만 로드)
let isMultiThread = false;

export { fetchFile };

export function isLoaded() {
  return !!ffmpeg && ffmpeg.loaded;
}

export function usingMultiThread() {
  return isMultiThread;
}

// 단일 파일을 스트리밍 다운로드하며 누적 바이트를 콜백으로 보고, Blob URL 반환
async function downloadToBlobURL(url, mime, onBytes) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`다운로드 실패 (${resp.status}): ${url}`);
  const total = Number(resp.headers.get("Content-Length")) || 0;
  const reader = resp.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onBytes(value.length, total > 0 ? total - received : 0);
  }
  const blob = new Blob(chunks, { type: mime });
  return URL.createObjectURL(blob);
}

/**
 * ffmpeg 코어를 로드한다 (최초 1회만 실제 수행).
 * @param {object} cb
 * @param {(info:{loadedBytes:number,totalBytes:number,percent:number})=>void} cb.onProgress
 * @param {(line:string)=>void} [cb.onLog]
 * @returns {Promise<FFmpeg>}
 */
export function loadFFmpeg({ onProgress = () => {}, onLog = () => {}, forceSingleThread = false } = {}) {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    isMultiThread = !forceSingleThread && typeof window !== "undefined" && window.crossOriginIsolated === true;
    const base = isMultiThread ? MT_BASE : ST_BASE;

    // 멀티스레드 코어는 wasm(약 31MB)이 대부분, 단일스레드는 약 25MB.
    const estTotal = isMultiThread ? 31_500_000 : 25_500_000;
    let loadedBytes = 0;
    const report = (chunk) => {
      loadedBytes += chunk;
      const percent = Math.min(99, Math.round((loadedBytes / estTotal) * 100));
      onProgress({ loadedBytes, totalBytes: estTotal, percent });
    };

    const coreURL = await downloadToBlobURL(`${base}/ffmpeg-core.js`, "text/javascript", report);
    const wasmURL = await downloadToBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm", report);

    const config = { coreURL, wasmURL };
    if (isMultiThread) {
      config.workerURL = await downloadToBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript", report);
    }

    ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => onLog(message));
    await ffmpeg.load(config);

    onProgress({ loadedBytes, totalBytes: loadedBytes, percent: 100 });
    return ffmpeg;
  })();

  return loadPromise;
}

// 변환 진행률 리스너 등록 (0~1). 해제 함수 반환.
export function onProgress(handler) {
  if (!ffmpeg) return () => {};
  ffmpeg.on("progress", handler);
  return () => ffmpeg.off("progress", handler);
}

export function getFFmpeg() {
  if (!ffmpeg) throw new Error("ffmpeg가 아직 로드되지 않았습니다.");
  return ffmpeg;
}

// 실행 중인 작업을 중단하고 인스턴스를 폐기 (다음 작업 시 재로드)
export function terminate() {
  if (ffmpeg) {
    try { ffmpeg.terminate(); } catch (_) {}
  }
  ffmpeg = null;
  loadPromise = null;
}
