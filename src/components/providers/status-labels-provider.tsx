"use client";

import { createContext, useContext, useMemo } from "react";
import type { PipelineStage } from "@/lib/queries/settings";

const PipelineStagesContext = createContext<PipelineStage[]>([]);

export function StatusLabelsProvider({
  stages,
  children,
}: {
  stages: PipelineStage[];
  children: React.ReactNode;
}) {
  return (
    <PipelineStagesContext.Provider value={stages}>
      {children}
    </PipelineStagesContext.Provider>
  );
}

/** Every pipeline stage, ordered — for the Kanban board, status Selects, and Settings. */
export function usePipelineStages() {
  return useContext(PipelineStagesContext);
}

/** Admin-editable display labels for each pipeline stage, keyed by its stable key. */
export function useStatusLabels(): Record<string, string> {
  const stages = usePipelineStages();
  return useMemo(() => Object.fromEntries(stages.map((s) => [s.key, s.label])), [stages]);
}

/** The color assigned to a pipeline stage, for badges/Kanban/charts. */
export function useStatusColor(status: string): string {
  const stages = usePipelineStages();
  return stages.find((s) => s.key === status)?.color ?? "#7A8B84";
}
