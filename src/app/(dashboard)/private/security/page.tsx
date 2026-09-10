import { requireUnlockedPrivate } from "@/lib/private/guard";
import { getPrivateAllowlist } from "@/lib/private/access";
import { getPrivateAccessLog } from "@/lib/queries/private-leads";
import { getAllProfiles } from "@/lib/queries/settings";
import { PrivateSecurityPanel } from "@/components/private/private-security-panel";
import { PrivateAllowlistManager } from "@/components/private/private-allowlist-manager";
import { PrivateAccessLogTable } from "@/components/private/private-access-log-table";

export default async function PrivateSecurityPage() {
  const { isOwner } = await requireUnlockedPrivate();

  const [allowlist, profiles, log] = await Promise.all([
    getPrivateAllowlist(),
    isOwner ? getAllProfiles() : Promise.resolve([]),
    isOwner ? getPrivateAccessLog() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Private area security</h1>
        <p className="text-sm text-muted-foreground">
          Your unlock methods, and — if you own this area — who else can see private clients.
        </p>
      </div>

      <PrivateSecurityPanel />

      {isOwner && (
        <>
          <PrivateAllowlistManager allowlist={allowlist} profiles={profiles} />
          <PrivateAccessLogTable rows={log} />
        </>
      )}
    </div>
  );
}
