"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { SidebarWorkspace } from "@/components/layout/sidebar";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="orion-rail w-72 border-0 p-3 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="px-2 pt-2 pb-4">
          <Logo />
        </div>
        <SidebarWorkspace />
        <div className="mt-5">
          <NavLinks onNavigate={() => setOpen(false)} layoutGroup="sheet" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
