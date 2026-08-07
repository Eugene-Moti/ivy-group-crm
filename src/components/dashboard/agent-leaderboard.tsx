import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";

export function AgentLeaderboard({
  data,
}: {
  data: { id: string; name: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Sales manager leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72 overflow-y-auto">
        {data.length ? (
          <ol className="space-y-3">
            {data.map((agent, i) => (
              <li key={agent.id}>
                <Link
                  href={`/leads?agent=${encodeURIComponent(agent.id)}`}
                  className="flex items-center gap-3 rounded-lg -mx-1 px-1 py-0.5 transition-colors hover:bg-muted/50"
                >
                  <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium hover:text-gold">
                        {agent.name}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {agent.count}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${(agent.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyChartState message="No leads assigned to sales managers yet." />
        )}
      </CardContent>
    </Card>
  );
}
