import { Suspense } from "react";
import { OrionView } from "@/components/orion/orion-view";

export default function OrionPage() {
  return (
    <Suspense fallback={null}>
      <OrionView />
    </Suspense>
  );
}
