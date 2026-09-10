"use client";

import { createContext, useContext } from "react";
import type { PrivateAccess } from "@/lib/private/access";

const PrivateAccessContext = createContext<PrivateAccess>({ hasAccess: false, isOwner: false });

export function PrivateAccessProvider({
  value,
  children,
}: {
  value: PrivateAccess;
  children: React.ReactNode;
}) {
  return <PrivateAccessContext.Provider value={value}>{children}</PrivateAccessContext.Provider>;
}

/** Whether the signed-in user is on the private-clients allowlist (and whether they own it). */
export function usePrivateAccess() {
  return useContext(PrivateAccessContext);
}
