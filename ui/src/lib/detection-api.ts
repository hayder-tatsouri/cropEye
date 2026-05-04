import type { BoundingBox } from "@/components/detection/DetectionViewer";

// ── Server URLs ───────────────────────────────────────────────
const PI_URL    = "http://192.168.0.179:5000";
const LOCAL_URL = "http://localhost:5000";

export const STREAM_VIDEO_PATH = "/video";

// Active URL — auto-detected on first ping
let activeUrl: string | null = null;

// ── Types ─────────────────────────────────────────────────────
interface RawPrediction {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  w?: number;
  h?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  bbox?: number[];
  box?: number[];
  label?: string;
  class?: string;
  class_name?: string;
  name?: string;
  confidence?: number;
  score?: number;
  conf?: number;
  status?: string;
}

interface RawResponse {
  predictions?: RawPrediction[];
  detections?: RawPrediction[];
  results?: RawPrediction[];
  boxes?: RawPrediction[];
  image_width?: number;
  image_height?: number;
  width?: number;
  height?: number;
}

// ── Auto-detect server ────────────────────────────────────────
/**
 * Tries Pi first, then localhost.
 * Returns the URL of whichever responds first, or null if neither is up.
 */
export async function detectActiveServer(
  signal?: AbortSignal,
): Promise<string | null> {
  for (const url of [PI_URL, LOCAL_URL]) {
    try {
      const res = await fetch(`${url}/`, {
        method: "GET",
        signal,
        mode: "cors",
      });
      if (res.ok || res.status === 404) {
        activeUrl = url;
        console.log(`[Detection] Connected to: ${url}`);
        return url;
      }
    } catch {
      // not reachable, try next
    }
  }
  activeUrl = null;
  return null;
}

/**
 * Returns the currently active server URL.
 * Auto-detects if not set yet.
 */
export async function getActiveUrl(): Promise<string> {
  if (activeUrl) return activeUrl;
  const url = await detectActiveServer();
  if (!url) throw new Error("No detection server found. Start local_server.py or connect to Pi.");
  return url;
}

export function getStreamUrl(): string {
  // Use Pi for live stream (local server doesn't stream video)
  return `${PI_URL}${STREAM_VIDEO_PATH}`;
}

export function getActiveServerUrl(): string | null {
  return activeUrl;
}

export function isPiConnected(): boolean {
  return activeUrl === PI_URL;
}

export function isLocalConnected(): boolean {
  return activeUrl === LOCAL_URL;
}

// ── Helpers ───────────────────────────────────────────────────
const INFECTED_HINTS = [
  "rust", "blight", "mildew", "spot", "mold",
  "infect", "disease", "rot", "wilt", "scab",
  "virus", "sick", "unhealthy", "damaged",
];

function inferStatus(label: string, raw?: string): "healthy" | "infected" {
  if (raw) {
    const r = raw.toLowerCase();
    if (r.includes("healthy") || r === "ok" || r === "normal") return "healthy";
    if (r.includes("infect") || r.includes("disease") || r === "bad" || r.includes("damaged"))
      return "infected";
  }
  const l = label.toLowerCase();
  if (l.includes("healthy")) return "healthy";
  return INFECTED_HINTS.some((h) => l.includes(h)) ? "infected" : "healthy";
}

function normalizeBox(
  p: RawPrediction,
  imgW: number,
  imgH: number,
): BoundingBox | null {
  let x: number | undefined;
  let y: number | undefined;
  let w: number | undefined;
  let h: number | undefined;

  const arr = p.bbox ?? p.box;
  if (arr && arr.length === 4) {
    const isPixel = arr.some((v) => v > 1.5);
    if (isPixel) {
      const [a, b, c, d] = arr;
      if (c > a && d > b && (c > imgW * 0.5 || a + c > imgW)) {
        x = a / imgW; y = b / imgH;
        w = (c - a) / imgW; h = (d - b) / imgH;
      } else {
        x = a / imgW; y = b / imgH;
        w = c / imgW; h = d / imgH;
      }
    } else {
      const [a, b, c, d] = arr;
      x = a; y = b; w = c; h = d;
    }
  } else if (
    p.x1 !== undefined && p.y1 !== undefined &&
    p.x2 !== undefined && p.y2 !== undefined
  ) {
    const isPixel = [p.x1, p.y1, p.x2, p.y2].some((v) => v > 1.5);
    const div = isPixel ? { w: imgW, h: imgH } : { w: 1, h: 1 };
    x = p.x1 / div.w; y = p.y1 / div.h;
    w = (p.x2 - p.x1) / div.w;
    h = (p.y2 - p.y1) / div.h;
  } else {
    const px = p.x;
    const py = p.y;
    const pw = p.width ?? p.w;
    const ph = p.height ?? p.h;
    if (px === undefined || py === undefined || pw === undefined || ph === undefined)
      return null;
    const isPixel = [px, py, pw, ph].some((v) => v > 1.5);
    if (isPixel) {
      x = px / imgW; y = py / imgH;
      w = pw / imgW; h = ph / imgH;
    } else {
      x = px; y = py; w = pw; h = ph;
    }
  }

  if (x === undefined || y === undefined || w === undefined || h === undefined)
    return null;

  const label     = p.label ?? p.class_name ?? p.class ?? p.name ?? "Detection";
  const confidence = p.confidence ?? p.score ?? p.conf ?? 0;

  return {
    x:          Math.max(0, Math.min(1, x)),
    y:          Math.max(0, Math.min(1, y)),
    width:      Math.max(0, Math.min(1, w)),
    height:     Math.max(0, Math.min(1, h)),
    label,
    confidence: confidence > 1 ? confidence / 100 : confidence,
    status:     inferStatus(label, p.status),
  };
}

function readImageDims(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 1, h: 1 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ── Main detection function ───────────────────────────────────
export async function runDetection(
  file: File,
  signal?: AbortSignal,
): Promise<BoundingBox[]> {
  const url = await getActiveUrl();

  const form = new FormData();
  form.append("file", file);
  form.append("image", file);

  const res = await fetch(`${url}/predict`, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok) throw new Error(`Server responded ${res.status}`);

  const data = (await res.json()) as RawResponse | RawPrediction[];
  const rawList: RawPrediction[] = Array.isArray(data)
    ? data
    : (data.predictions ?? data.detections ?? data.results ?? data.boxes ?? []);

  let imgW = 1;
  let imgH = 1;
  if (!Array.isArray(data)) {
    imgW = data.image_width ?? data.width ?? 0;
    imgH = data.image_height ?? data.height ?? 0;
  }
  if (!imgW || !imgH) {
    const dims = await readImageDims(file);
    imgW = dims.w;
    imgH = dims.h;
  }

  return rawList
    .map((p) => normalizeBox(p, imgW, imgH))
    .filter((b): b is BoundingBox => b !== null);
}

// ── Ping helpers ──────────────────────────────────────────────
export async function pingDetectionServer(
  signal?: AbortSignal,
): Promise<boolean> {
  const url = await detectActiveServer(signal);
  return url !== null;
}

export async function pingStreamServer(
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(`${PI_URL}${STREAM_VIDEO_PATH}`, {
      method: "GET",
      signal,
      mode: "no-cors",
    });
    return res.type === "opaque" || res.ok || res.status === 404;
  } catch {
    return false;
  }
}

// ── Export active URL for display in UI ──────────────────────
export const STREAM_API_URL = PI_URL;
