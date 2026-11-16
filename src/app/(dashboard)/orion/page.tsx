import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ASK_ORION_ENABLED } from "@/lib/features";
import { OrionView } from "@/components/orion/orion-view";

export default function OrionPage() {
  if (!ASK_ORION_ENABLED) notFound();
  return (
    <Suspense fallback={null}>
      <OrionView />
    </Suspense>
  );
}
