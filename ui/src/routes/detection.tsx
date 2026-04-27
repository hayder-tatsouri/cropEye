import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wifi, WifiOff } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UploadCard } from "@/components/detection/UploadCard";
import {
  DetectionViewer,
  type BoundingBox,
} from "@/components/detection/DetectionViewer";
import { ResultList } from "@/components/detection/ResultList";
import { LiveStreamViewer } from "@/components/detection/LiveStreamViewer";
import {
  STREAM_API_URL,
  getStreamUrl,
  pingDetectionServer,
  pingStreamServer,
  runDetection,
} from "@/lib/detection-api";

export const Route = createFileRoute("/detection")({
  component: DetectionPage,
  head: () => ({
    meta: [{ title: "Detection – CropEye" }],
  }),
});

type ViewerState = "empty" | "loading" | "error" | "ready";
type LiveDetection = { confidence: number };
type DetectionFeed = { tree_count: number; detections: LiveDetection[] };

const HEALTH_CHECK_TIMEOUT_MS = 2500;
const HEALTH_CHECK_RETRY_MS = 8000;
const DETECTIONS_API_URL = "http://192.168.0.179:5000/detections";

function DetectionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [state, setState] = useState<ViewerState>("empty");
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [streamOnline, setStreamOnline] = useState<boolean | null>(null);
  const [data, setData] = useState<DetectionFeed>({
    tree_count: 0,
    detections: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  // Manage object URL lifecycle
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Probe both servers until they are confirmed online.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ctrl1 = new AbortController();
      const ctrl2 = new AbortController();
      const t1 = window.setTimeout(
        () => ctrl1.abort(),
        HEALTH_CHECK_TIMEOUT_MS,
      );
      const t2 = window.setTimeout(
        () => ctrl2.abort(),
        HEALTH_CHECK_TIMEOUT_MS,
      );
      const [model, stream] = await Promise.all([
        pingDetectionServer(ctrl1.signal),
        pingStreamServer(ctrl2.signal),
      ]);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (!cancelled) {
        setServerOnline(model);
        setStreamOnline(stream);
        if (!(model && stream)) {
          window.setTimeout(() => {
            if (!cancelled) void check();
          }, HEALTH_CHECK_RETRY_MS);
        }
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pollDetections = async () => {
      try {
        const res = await fetch(DETECTIONS_API_URL);
        if (!res.ok) return;
        const json = (await res.json()) as DetectionFeed;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        // Ignore transient polling errors and keep previous data.
      }
    };

    void pollDetections();
    const interval = window.setInterval(() => {
      void pollDetections();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const startDetection = async (target: File) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState("loading");
    setBoxes([]);
    setErrorMessage(undefined);

    try {
      const results = await runDetection(target, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setBoxes(results);
      setState("ready");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const msg =
        err instanceof Error ? err.message : "Failed to reach detection server";
      setErrorMessage(
        `${msg}. Make sure the model is running at ${STREAM_API_URL}.`,
      );
      setState("error");
    }
  };

  const handleFileSelect = (f: File | null) => {
    setFile(f);
    setBoxes([]);
    setErrorMessage(undefined);
    if (!f) {
      abortRef.current?.abort();
      setState("empty");
      return;
    }
    if (serverOnline) {
      void startDetection(f);
    } else {
      setState("empty");
    }
  };

  // Auto-run if server comes online with a file already selected
  useEffect(() => {
    if (serverOnline && file && state === "empty") {
      void startDetection(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverOnline]);

  const handleStart = () => {
    if (!file) return;
    void startDetection(file);
  };

  return (
    <DashboardLayout
      title="Detection"
      subtitle="Run a new crop scan with AI-powered analysis"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: input */}
        <div className="space-y-4 lg:col-span-4 xl:col-span-3">
          <UploadCard
            file={file}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onStart={handleStart}
            liveMode={liveMode}
            onLiveModeChange={setLiveMode}
            isProcessing={state === "loading"}
          />

          {liveMode && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground">
                Drone Telemetry
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <span className="text-muted-foreground">Signal</span>
                  <span className="font-medium text-foreground">
                    {streamOnline
                      ? "Strong"
                      : streamOnline === false
                        ? "Offline"
                        : "Checking..."}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <span className="text-muted-foreground">Battery</span>
                  <span className="font-medium text-foreground">84%</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <span className="text-muted-foreground">Altitude</span>
                  <span className="font-medium text-foreground">42 m</span>
                </div>
              </div>

              <div className="mt-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Trees detected: {data.tree_count}
                </h4>
                <div className="mt-2 space-y-1 text-xs text-foreground">
                  {data.detections.length > 0 ? (
                    data.detections.map((d, i) => (
                      <p key={i}>
                        Tree {i + 1} - confidence: {(d.confidence * 100).toFixed(1)}%
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No trees detected yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: viewer + results (or live stream) */}
        <div className="space-y-5 lg:col-span-8 xl:col-span-9">
          {liveMode ? (
            <LiveStreamViewer
              streamUrl={getStreamUrl()}
              online={streamOnline}
            />
          ) : (
            <>
              <DetectionViewer
                imageUrl={previewUrl}
                boxes={boxes}
                state={previewUrl ? state : "empty"}
                errorMessage={errorMessage}
              />
              <ResultList
                results={boxes}
                state={previewUrl ? state : "empty"}
              />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
