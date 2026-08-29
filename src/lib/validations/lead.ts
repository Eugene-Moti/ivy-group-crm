import { z } from "zod";
import { LEAD_PRIORITIES, LEAD_TYPES, LOST_STATUS_KEY, WON_STATUS_KEY, getLostReasons } from "@/lib/constants";

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
    status: z.string().min(1, "Status is required."),
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
    lost_reason: z.string().optional(),
    lost_reason_note: z.string().optional(),
    deal_value: z
      .string()
      .optional()
      .refine((v) => isBlank(v) || !Number.isNaN(Number(v)), "Enter a valid number."),
    commission_amount: z
      .string()
      .optional()
      .refine((v) => isBlank(v) || !Number.isNaN(Number(v)), "Enter a valid number."),
    referral_fee_amount: z
      .string()
      .optional()
      .refine((v) => isBlank(v) || !Number.isNaN(Number(v)), "Enter a valid number."),
    referral_fee_paid: z.boolean().optional(),
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
  )
  .refine((data) => data.status !== LOST_STATUS_KEY || !isBlank(data.lost_reason), {
    message: "Select why this lead was lost.",
    path: ["lost_reason"],
  })
  .refine(
    (data) =>
      isBlank(data.lost_reason) ||
      (getLostReasons(data.lead_type) as string[]).includes(data.lost_reason!),
    {
      message: "That reason doesn't apply to this lead type — pick one from the list.",
      path: ["lost_reason"],
    }
  )
  .refine((data) => !(data.lead_type === "Real Estate Agent" && data.status === WON_STATUS_KEY), {
    message: "An agent can't be marked Won — use \"Add client details\" to convert their referral first.",
    path: ["status"],
  });

export type LeadFormValues = z.infer<typeof leadFormSchema>;
