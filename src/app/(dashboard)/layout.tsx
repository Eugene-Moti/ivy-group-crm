import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getPipelineStages } from "@/lib/queries/settings";
import { getWorkspace } from "@/lib/queries/workspace";
import { accentCss } from "@/lib/workspace";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { SaleReceiptHost } from "@/components/shared/sale-receipt";
import { ProfileProvider } from "@/components/providers/profile-provider";
import { OnlinePresenceProvider } from "@/components/providers/online-presence-provider";
import { StatusLabelsProvider } from "@/components/providers/status-labels-provider";
import { AssistantProvider } from "@/components/providers/assistant-provider";
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

  const [pipelineStages, workspace] = await Promise.all([
    getPipelineStages(),
    getWorkspace(),
  ]);
  const accentStyles = accentCss(workspace.accent);

  return (
    <WorkspaceProvider workspace={workspace}>
      <ProfileProvider profile={profile}>
        <OnlinePresenceProvider>
          <StatusLabelsProvider stages={pipelineStages}>
            <AssistantProvider>
              <Suspense fallback={null}>
                <RouteProgressBar />
              </Suspense>
              <IdleSessionGuard />
              <SaleReceiptHost />
              {accentStyles && <style>{accentStyles}</style>}
              <div className="orion-app flex h-screen overflow-hidden">
                <div className="orion-orbs" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Topbar />
                  <main className="flex-1 overflow-y-auto px-4 pt-1 pb-6 sm:px-6">
                    {children}
                  </main>
                </div>
              </div>
            </AssistantProvider>
          </StatusLabelsProvider>
        </OnlinePresenceProvider>
      </ProfileProvider>
    </WorkspaceProvider>
  );
}
