import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  Gauge,
  Zap,
  BatteryMedium,
  MapPin,
  SignalHigh,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DroneCard, type DroneCardStatus } from "@/components/dashboard/DroneCard";
import { DroneMap } from "@/components/dashboard/DroneMap";

export const Route = createFileRoute("/drone")({
  head: () => ({
    meta: [
      { title: "Drone Monitoring — CropEye" },
      {
        name: "description",
        content:
          "Live drone telemetry and flight tracking for crop monitoring with real-time altitude, speed, battery and GPS data.",
      },
    ],
  }),
  component: DroneMonitoringPage,
});

interface DroneData {
  altitude: number;
  speed: number;
  battery: number;
  voltage: number;
  latitude: number;
  longitude: number;
  signal: number;
}

const INITIAL: DroneData = {
  altitude: 82,
  speed: 14.2,
  battery: 78,
  voltage: 11.1,
  latitude: 36.8137496,
  longitude:10.0637659,
  signal: 92,
};

function batteryStatus(b: number): DroneCardStatus {
  if (b < 15) return "critical";
  if (b < 30) return "warning";
  return "normal";
}

function signalStatus(s: number): DroneCardStatus {
  if (s < 50) return "critical";
  if (s < 70) return "warning";
  return "normal";
}

function DroneMonitoringPage() {
  const [data, setData] = useState<DroneData>(INITIAL);
  const [path, setPath] = useState<Array<[number, number]>>([
    [INITIAL.latitude, INITIAL.longitude],
  ]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const wsUrl =
      import.meta.env.VITE_DRONE_WS_URL ?? "ws://192.168.0.179:8765";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsLive(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Partial<DroneData> & {
          path?: Array<[number, number]>;
          battery_voltage?: number;
          batteryVoltage?: number;
        };

        setData((prev) => {
          const parsedVoltage =
            typeof payload.voltage === "number"
              ? payload.voltage
              : typeof payload.battery_voltage === "number"
                ? payload.battery_voltage
                : typeof payload.batteryVoltage === "number"
                  ? payload.batteryVoltage
                  : prev.voltage;

          const next: DroneData = {
            altitude: typeof payload.altitude === "number" ? payload.altitude : prev.altitude,
            speed: typeof payload.speed === "number" ? payload.speed : prev.speed,
            battery: typeof payload.battery === "number" ? payload.battery : prev.battery,
            voltage: parsedVoltage,
            latitude: typeof payload.latitude === "number" ? payload.latitude : prev.latitude,
            longitude: typeof payload.longitude === "number" ? payload.longitude : prev.longitude,
            signal: typeof payload.signal === "number" ? payload.signal : prev.signal,
          };

          setPath((prevPath) => {
            if (Array.isArray(payload.path) && payload.path.length > 0) {
              return payload.path.slice(-30);
            }
            const updated: Array<[number, number]> = [
              ...prevPath,
              [next.latitude, next.longitude],
            ];
            return updated.slice(-30);
          });

          return next;
        });
      } catch (error) {
        console.error("Failed to parse telemetry payload", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      setIsLive(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <DashboardLayout
      title="Drone Monitoring"
      subtitle="Live telemetry and flight tracking"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-success">
          {isLive ? "Live" : "Offline"}
        </span>
        <span className="text-xs text-muted-foreground">
          {isLive ? "· Receiving telemetry stream" : "· Waiting for telemetry stream"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Map first on mobile, right side on desktop */}
        <section className="order-1 lg:order-2 lg:col-span-8">
          <DroneMap
            latitude={data.latitude}
            longitude={data.longitude}
            altitude={data.altitude}
            battery={Math.round(data.battery)}
            path={path}
          />
        </section>

        {/* Telemetry panel */}
        <section className="order-2 lg:order-1 lg:col-span-4">
          <div className="grid grid-cols-2 gap-3">
            <DroneCard
              label="Altitude"
              value={data.altitude.toFixed(1)}
              unit="m"
              icon={ArrowUp}
            />
            <DroneCard
              label="Speed"
              value={data.speed.toFixed(1)}
              unit="m/s"
              icon={Gauge}
            />
            <DroneCard
              label="Battery"
              value={Math.round(data.battery).toString()}
              unit="%"
              icon={BatteryMedium}
              status={batteryStatus(data.battery)}
            />
            <DroneCard
              label="Signal"
              value={data.signal.toString()}
              unit="%"
              icon={SignalHigh}
              status={signalStatus(data.signal)}
            />
            <DroneCard
              label="Voltage"
              value={data.voltage.toFixed(2)}
              unit="V"
              icon={Zap}
            />
            <div className="col-span-2 rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  GPS Coordinates
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Latitude
                  </p>
                  <p className="text-base font-semibold tabular-nums text-foreground">
                    {data.latitude.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Longitude
                  </p>
                  <p className="text-base font-semibold tabular-nums text-foreground">
                    {data.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
