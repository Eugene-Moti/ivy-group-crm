import {
  CalendarClock,
  Copy,
  Gauge,
  Handshake,
  LayoutDashboard,
  LineChart,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type ReportEntry = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type ReportGroup = {
  label: string;
  icon: LucideIcon;
  reports: ReportEntry[];
};

/**
 * The single source of truth for the Reports page's navigation — grouped by
 * what question each report answers, rather than one long flat row of 13
 * tabs. `VALID_TABS` (for the ?tab= deep-link param) and the mobile Select
 * are both derived from this, so a new report only needs adding here.
 */
export const REPORT_GROUPS: ReportGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    reports: [
      {
        id: "full-analysis",
        label: "Full analysis",
        description:
          "Every lead, sales manager, project, and source rolled into one summary, with data-driven suggestions on where to focus next.",
        icon: LayoutDashboard,
      },
      {
        id: "marketing",
        label: "Marketing",
        description:
          "Offer/negotiating counts, site visits booked, source performance, and manager breakdowns — redacted for sharing outside the sales team.",
        icon: Megaphone,
      },
    ],
  },
  {
    label: "Revenue",
    icon: Wallet,
    reports: [
      {
        id: "units-sold",
        label: "Units sold & bonuses",
        description:
          "Every unit sold, unit and client details, and the marketing team's bonus — by sales manager.",
        icon: Wallet,
      },
    ],
  },
  {
    label: "Performance",
    icon: TrendingUp,
    reports: [
      {
        id: "source",
        label: "Source performance",
        description: "Which lead sources bring in the most leads, and which actually convert.",
        icon: TrendingUp,
      },
      {
        id: "conversion",
        label: "Conversion by stage",
        description: "Where leads pile up or drop off as they move through the pipeline.",
        icon: Workflow,
      },
      {
        id: "agent",
        label: "Sales manager performance",
        description: "Win rate and overdue follow-ups by sales manager.",
        icon: Users,
      },
      {
        id: "velocity",
        label: "Pipeline velocity",
        description: "How many days leads typically spend in each stage before moving on.",
        icon: Gauge,
      },
      {
        id: "conversion-timeline",
        label: "Conversion timeline",
        description: "How long it takes a lead to close, from first contact to Won.",
        icon: LineChart,
      },
      {
        id: "referrers",
        label: "Referrers",
        description: "Referral performance by agent, plus a review tool for agent/client link mismatches.",
        icon: Handshake,
      },
    ],
  },
  {
    label: "Pipeline & Follow-ups",
    icon: CalendarClock,
    reports: [
      {
        id: "follow-ups",
        label: "Follow-up status",
        description: "Overdue, due today, and upcoming follow-ups across the whole team.",
        icon: CalendarClock,
      },
      {
        id: "lost-leads",
        label: "Lost leads",
        description: "Why deals were lost, broken down by reason, source, project, and manager.",
        icon: TrendingDown,
      },
    ],
  },
  {
    label: "Data quality",
    icon: ShieldCheck,
    reports: [
      {
        id: "duplicates",
        label: "Duplicates",
        description: "Leads sharing a phone number or email — a possible sign of double entry.",
        icon: Copy,
      },
      {
        id: "agent-won-audit",
        label: "Agent Won audit",
        description: "Agent leads incorrectly marked Won instead of being converted to a client lead.",
        icon: ShieldAlert,
      },
    ],
  },
  {
    label: "Custom",
    icon: SlidersHorizontal,
    reports: [
      {
        id: "builder",
        label: "Query builder",
        description: "Filter leads by any combination of fields and save the view for later.",
        icon: SlidersHorizontal,
      },
    ],
  },
];

export const VALID_TABS: string[] = REPORT_GROUPS.flatMap((g) => g.reports.map((r) => r.id));

export function findReport(id: string): ReportEntry | undefined {
  for (const group of REPORT_GROUPS) {
    const found = group.reports.find((r) => r.id === id);
    if (found) return found;
  }
  return undefined;
}
