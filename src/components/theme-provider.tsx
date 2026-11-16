"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme + motion defaults for the whole app. MotionConfig reducedMotion
 * "user" makes every framer animation honour the device's reduced-motion
 * setting (movement is skipped, fades still happen) while components
 * render the same markup on the server and the client. Branching on
 * useReducedMotion() in render instead caused hydration mismatches that
 * left elements stuck invisible for people with animations turned off.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
