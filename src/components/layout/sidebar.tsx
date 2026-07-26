import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { ContactFooter } from "@/components/layout/contact-footer";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
      <div className="px-2 py-2">
        <Logo />
      </div>
      <div className="mt-6 flex-1">
        <NavLinks />
      </div>
      <div className="px-2 pb-1">
        <ContactFooter className="text-sidebar-foreground" />
      </div>
    </aside>
  );
}
