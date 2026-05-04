import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings – CropEye" }] }),
});

function SettingsPage() {
  return (
    <DashboardLayout title="Settings" subtitle="Application settings">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No account settings available. The application runs without user accounts.
        </p>
      </div>
    </DashboardLayout>
  );
}
