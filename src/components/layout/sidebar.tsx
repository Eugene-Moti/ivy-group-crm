import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { ContactFooter } from "@/components/layout/contact-footer";

export function Sidebar() {
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar p-4 lg:flex">
      {/* A faint evergreen glow at the top of the chrome. */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-evergreen/25 blur-3xl" />
      <div className="relative px-2 py-2">
        <Logo />
      </div>
      <div className="relative mt-6 flex-1">
        <NavLinks />
      </div>
      <div className="px-2 pb-1">
        <ContactFooter className="text-sidebar-foreground" />
      </div>
    </aside>
  );
}
