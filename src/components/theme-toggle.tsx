"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="group size-9 rounded-full"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4 text-gold transition-transform duration-500 ease-[var(--ease-orion-spring)] group-hover:rotate-90 dark:block" />
      <Moon className="block size-4 transition-transform duration-500 ease-[var(--ease-orion-spring)] group-hover:-rotate-12 dark:hidden" />
    </Button>
  );
}
