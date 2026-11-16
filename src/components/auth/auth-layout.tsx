"use client";

import { motion } from "framer-motion";
import { OrionMark } from "@/components/brand/orion-mark";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { DEFAULT_WORKSPACE, type Workspace } from "@/lib/workspace";

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES = ["Pipeline", "Unit sales", "Site visits", "Follow-ups", "Reports"];

/**
 * Shared frame for every sign-in step (password, PIN enrolment, PIN
 * verify). The CRM hero image fills the whole screen with a slow drift,
 * darkened toward the right so the glass sign-in card sits on warm light;
 * the brand story sits bottom-left. Purely presentational — each step keeps
 * its own form component and auth logic untouched.
 */
export function AuthLayout({ children, workspace = DEFAULT_WORKSPACE }: { children: React.ReactNode; workspace?: Workspace }) {
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: EASE },
  });

  return (
    <WorkspaceProvider workspace={workspace}>
      <div className="dark relative isolate min-h-screen overflow-hidden bg-[#070907] text-foreground">
        {/* Hero image + overlays */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <picture>
            <source media="(min-width: 1024px)" srcSet="/brand/login-hero.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element -- a decorative, pre-optimised background; next/image adds nothing here */}
            <img
              src="/brand/login-hero-sm.webp"
              alt=""
              className="orion-kenburns size-full object-cover object-[22%_50%] opacity-90"
            />
          </picture>
          {/* Seat the image in the brand: evergreen night on the left, readable dark under the card. */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_9_7/0.35)_0%,rgb(7_9_7/0.15)_35%,rgb(7_9_7/0.55)_62%,rgb(7_9_7/0.8)_100%)] max-lg:bg-[rgb(7_9_7/0.72)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgb(7_9_7/0.95)_0%,rgb(7_9_7/0.6)_32%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_0%_100%,rgb(7_9_7/0.85),transparent_75%)] max-lg:hidden" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_15%_20%,rgb(35_130_79/0.28),transparent_70%)] mix-blend-screen" />
          <div className="orion-stars absolute inset-0" />
        </div>

        <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
          <section className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
            <motion.div {...rise(0)} className="flex items-center gap-3">
              <OrionMark className="orion-float size-10" />
              <div className="leading-none">
                <span className="block font-display text-2xl tracking-[0.18em] text-[#f6f4ee]">ORION</span>
                <span className="mt-1 block text-[11px] tracking-wide text-white/50">Real estate CRM</span>
              </div>
            </motion.div>

            <div className="mt-auto flex max-w-xl flex-col items-start gap-5 pb-8">
              <motion.h2 {...rise(0.15)} className="font-display text-5xl leading-[1.04] text-[#f6f4ee] xl:text-6xl">
                Every deal,
                <br />
                <span className="bg-gradient-to-r from-gold-soft via-[#f3dc9e] to-gold bg-clip-text text-transparent">in orbit.</span>
              </motion.h2>
              <motion.p {...rise(0.28)} className="max-w-md text-base leading-relaxed text-[#dcd8cc]">
                Leads, site visits, reservations and payments for real estate teams, kept in one calm place.
              </motion.p>
              <motion.ul {...rise(0.4)} className="flex flex-wrap gap-2">
                {FEATURES.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-[#f0ede4] backdrop-blur-md"
                  >
                    {f}
                  </li>
                ))}
              </motion.ul>
            </div>

            <p className="text-xs text-white/45">© {new Date().getFullYear()} Orion CRM · The CRM for real estate teams</p>
          </section>

          <section className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-4 sm:p-8">
            <div className="flex items-center gap-3 lg:hidden">
              <OrionMark className="size-10" />
              <span className="font-display text-2xl tracking-[0.16em] text-[#f6f4ee]">ORION</span>
            </div>
            {children}
          </section>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
