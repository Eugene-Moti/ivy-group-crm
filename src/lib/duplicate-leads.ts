import { toWhatsAppNumber } from "@/lib/format";

export type LeadIdentity = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  assigned_agent: { name: string } | null;
};

const MIN_PHONE_DIGITS = 9;

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  const normalized = toWhatsAppNumber(phone.trim());
  return normalized.length >= MIN_PHONE_DIGITS ? normalized : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || !email.trim()) return null;
  return email.trim().toLowerCase();
}

export type DuplicateMatch = { lead: LeadIdentity; matchedOn: ("phone" | "email")[] };

/**
 * Leads whose phone or email — after normalizing formatting differences
 * (spaces, dashes, +254/0 prefixes, casing) — match a candidate lead's.
 * Used both live on the lead form (warn, don't block) and for the
 * whole-database "possible duplicates" audit.
 */
export function findMatchingLeads(
  candidate: { phone?: string | null; email?: string | null },
  allLeads: LeadIdentity[],
  excludeId?: string
): DuplicateMatch[] {
  const phone = normalizePhone(candidate.phone);
  const email = normalizeEmail(candidate.email);
  if (!phone && !email) return [];

  const results: DuplicateMatch[] = [];
  for (const lead of allLeads) {
    if (lead.id === excludeId) continue;
    const matchedOn: ("phone" | "email")[] = [];
    if (phone && normalizePhone(lead.phone) === phone) matchedOn.push("phone");
    if (email && normalizeEmail(lead.email) === email) matchedOn.push("email");
    if (matchedOn.length) results.push({ lead, matchedOn });
  }
  return results;
}

export type DuplicateCluster = {
  key: string;
  field: "phone" | "email";
  leads: LeadIdentity[];
};

/** Whole-database scan: clusters of 2+ leads sharing a normalized phone or email. */
export function findAllDuplicateClusters(allLeads: LeadIdentity[]): DuplicateCluster[] {
  const byPhone = new Map<string, LeadIdentity[]>();
  const byEmail = new Map<string, LeadIdentity[]>();

  for (const lead of allLeads) {
    const phone = normalizePhone(lead.phone);
    if (phone) {
      const arr = byPhone.get(phone) ?? [];
      arr.push(lead);
      byPhone.set(phone, arr);
    }
    const email = normalizeEmail(lead.email);
    if (email) {
      const arr = byEmail.get(email) ?? [];
      arr.push(lead);
      byEmail.set(email, arr);
    }
  }

  const clusters: DuplicateCluster[] = [];
  for (const [key, leads] of byPhone) {
    if (leads.length > 1) clusters.push({ key, field: "phone", leads });
  }
  for (const [key, leads] of byEmail) {
    if (leads.length > 1) clusters.push({ key, field: "email", leads });
  }
  return clusters.sort((a, b) => b.leads.length - a.leads.length);
}
