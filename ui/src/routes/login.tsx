import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ArrowRight, MapPinned, Satellite, ScanSearch } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "CropEye" }] }),
});

function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-10"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(135deg,rgba(5,10,8,0.88),rgba(5,10,8,0.62)_50%,rgba(16,73,41,0.6))]" />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
              <Leaf className="h-4 w-4" />
              CropEye Field Intelligence
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              A professional command center for modern crop monitoring.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/72 sm:text-lg">
              Review detections, track drone activity, and keep every field organized from a single polished workspace.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              {[
                { icon: MapPinned, label: "Field overview" },
                { icon: Satellite, label: "Drone coverage" },
                { icon: ScanSearch, label: "Detection insights" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur">
                  <Icon className="h-4 w-4 text-primary-foreground" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">OLIVE TREE</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Enter the CropEye workspace</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Open the dashboard and start reviewing your farm intelligence immediately.
                </p>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-primary shadow-sm sm:flex">
                <Leaf className="h-7 w-7" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                "Live crop visibility",
                "Organized detections",
                "Drone monitoring",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-sm font-medium text-foreground">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/detection"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-transform transition-colors hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Enter dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
