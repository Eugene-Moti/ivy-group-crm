"use client";

import { createContext, useContext } from "react";
import { DEFAULT_WORKSPACE, type Workspace } from "@/lib/workspace";

const WorkspaceContext = createContext<Workspace>(DEFAULT_WORKSPACE);

export function WorkspaceProvider({ workspace, children }: { workspace: Workspace; children: React.ReactNode }) {
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Workspace {
  return useContext(WorkspaceContext);
}
