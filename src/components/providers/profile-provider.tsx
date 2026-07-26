"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/auth";

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

/** Current signed-in user's profile (role, name, email) on the client. */
export function useProfile() {
  return useContext(ProfileContext);
}

/** Convenience hook: true only once the profile has loaded and role is admin. */
export function useIsAdmin() {
  const profile = useProfile();
  return profile?.role === "admin";
}
