"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toWhatsAppNumber } from "@/lib/format";

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function QuickContactActions({
  phone,
  email,
}: {
  phone: string | null;
  email: string | null;
}) {
  return (
    <div className="flex items-center gap-0.5" onClick={stop}>
      {phone && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <a href={`tel:${phone}`} aria-label="Call">
                <Phone className="size-3.5" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Call {phone}</TooltipContent>
        </Tooltip>
      )}
      {phone && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <a
                href={`https://wa.me/${toWhatsAppNumber(phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <MessageCircle className="size-3.5" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>WhatsApp {phone}</TooltipContent>
        </Tooltip>
      )}
      {email && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <a href={`mailto:${email}`} aria-label="Email">
                <Mail className="size-3.5" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Email {email}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
