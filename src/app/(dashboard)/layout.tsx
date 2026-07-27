import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStatusLabels } from "@/lib/queries/settings";
import { ProfileProvider } from "@/components/providers/profile-provider";
import { StatusLabelsProvider } from "@/components/providers/status-labels-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { IdleSessionGuard } from "@/components/layout/idle-session-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const statusLabels = await getStatusLabels();

  return (
    <ProfileProvider profile={profile}>
      <StatusLabelsProvider labels={statusLabels}>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <IdleSessionGuard />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </StatusLabelsProvider>
    </ProfileProvider>
  );
}
