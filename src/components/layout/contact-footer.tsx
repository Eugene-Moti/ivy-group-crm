import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANY_CONTACT } from "@/lib/company";

export function ContactFooter({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className)}>
      <a
        href={`tel:${COMPANY_CONTACT.phoneHref}`}
        className="flex items-center gap-1.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <Phone className="size-3" />
        {COMPANY_CONTACT.phoneDisplay}
      </a>
      <a
        href={`mailto:${COMPANY_CONTACT.email}`}
        className="flex items-center gap-1.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <Mail className="size-3" />
        {COMPANY_CONTACT.email}
      </a>
    </div>
  );
}
