import { z } from "zod";
import { LEAD_TYPES } from "@/lib/constants";

function isBlank(value: string | undefined): boolean {
  return !value || value.trim() === "";
}

/**
 * What an inbound lead-capture call (a website form's own backend, or a
 * no-code bridge like Zapier/Make sitting in front of Facebook Lead Ads)
 * is expected to send. Deliberately permissive on shape — the sender is
 * outside this codebase — but still requires enough to make a usable lead:
 * a name, and some way to actually reach them.
 */
export const leadWebhookSchema = z
  .object({
    first_name: z.string().trim().min(1, "first_name is required."),
    last_name: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .optional()
      .refine((v) => isBlank(v) || z.string().email().safeParse(v).success, "email is invalid."),
    source: z.string().trim().optional(),
    project: z.string().trim().optional(),
    message: z.string().trim().optional(),
    lead_type: z.enum(LEAD_TYPES).optional(),
  })
  .refine((data) => !isBlank(data.phone) || !isBlank(data.email), {
    message: "Provide at least a phone or an email.",
    path: ["phone"],
  });

export type LeadWebhookPayload = z.infer<typeof leadWebhookSchema>;
