import { Sparkles } from "lucide-react";
import { PortfolioBriefing } from "@/components/orion/portfolio-briefing";
import { OrionChat } from "@/components/orion/orion-chat";

export function OrionView() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <h1 className="text-2xl font-semibold tracking-tight">Orion</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI analyst — reviews every lead, note, and piece of evidence in the pipeline to tell you what needs
          attention and what to do about it.
        </p>
      </div>

      <div className="grid min-h-[560px] flex-1 grid-cols-1 gap-4 lg:h-[calc(100vh-13rem)] lg:grid-cols-[1fr_420px]">
        <OrionChat />
        <PortfolioBriefing />
      </div>
    </div>
  );
}
