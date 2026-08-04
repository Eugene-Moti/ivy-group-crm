import { z } from "zod";
import { LEAD_PRIORITIES, LEAD_STATUSES, LEAD_TYPES } from "@/lib/constants";

function isBlank(value: string | undefined): boolean {
  return !value || value.trim() === "";
}

export const leadFormSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required."),
    last_name: z.string().trim().min(1, "Last name is required."),
    phone: z.string().optional(),
    email: z
      .string()
      .optional()
      .refine(
        (v) => isBlank(v) || z.string().email().safeParse(v).success,
        "Enter a valid email address."
      ),
    lead_source_id: z.string().optional(),
    campaign_id: z.string().optional(),
    priority: z.enum(LEAD_PRIORITIES),
    status: z.enum(LEAD_STATUSES),
    lead_type: z.enum(LEAD_TYPES),
    referred_by_lead_id: z.string().optional(),
    created_at: z.string().optional(),
    property_type_id: z.string().optional(),
    preferred_area: z.string().optional(),
    budget_min: z
      .string()
      .optional()
      .refine(
        (v) => isBlank(v) || !Number.isNaN(Number(v)),
        "Enter a valid number."
      ),
    budget_max: z
      .string()
      .optional()
      .refine(
        (v) => isBlank(v) || !Number.isNaN(Number(v)),
        "Enter a valid number."
      ),
    bedrooms: z
      .string()
      .optional()
      .refine(
        (v) => isBlank(v) || !Number.isNaN(Number(v)),
        "Enter a valid number."
      ),
    next_follow_up_at: z.string().optional(),
    assigned_to: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (isBlank(data.budget_min) || isBlank(data.budget_max)) return true;
      return Number(data.budget_min) <= Number(data.budget_max);
    },
    {
      message: "Minimum budget must be less than or equal to maximum budget.",
      path: ["budget_min"],
    }
  );

export type LeadFormValues = z.infer<typeof leadFormSchema>;
