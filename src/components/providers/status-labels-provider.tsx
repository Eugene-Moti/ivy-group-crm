"use client";

import { createContext, useContext } from "react";
import { DEFAULT_STATUS_LABELS } from "@/lib/constants";
import type { StatusLabels } from "@/lib/queries/settings";

const StatusLabelsContext = createContext<StatusLabels>(DEFAULT_STATUS_LABELS);

export function StatusLabelsProvider({
  labels,
  children,
}: {
  labels: StatusLabels;
  children: React.ReactNode;
}) {
  return (
    <StatusLabelsContext.Provider value={labels}>
      {children}
    </StatusLabelsContext.Provider>
  );
}

/** Admin-editable display labels for each pipeline stage, keyed by the stable LeadStatus value. */
export function useStatusLabels() {
  return useContext(StatusLabelsContext);
}
