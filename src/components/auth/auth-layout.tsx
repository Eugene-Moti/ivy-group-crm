"use client";

import { motion, useReducedMotion } from "framer-motion";
import { OrionMark } from "@/components/brand/orion-mark";

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES = ["Pipeline", "Unit sales", "Site visits", "Follow-ups"];

/**
 * Shared frame for every sign-in step (password, PIN enrolment, PIN
 * verify): a night-sky brand panel with the planet mark on the left, the
 * step's own card on the right. Purely presentational — each step keeps
 * its own form component and auth logic untouched.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: EASE } };

  return (
    <div className="dark relative grid min-h-screen bg-[#070907] text-foreground lg:grid-cols-[1.1fr_1fr]">
      <section className="orion-sky relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="relative flex items-center gap-3">
          <OrionMark className="size-9" />
          <span className="font-display text-xl tracking-[0.16em] text-[#f6f4ee]">ORION</span>
        </div>

        <div className="relative flex flex-col items-start gap-8">
          <motion.div
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.85, rotate: -6 },
                  animate: { opacity: 1, scale: 1, rotate: 0 },
                  transition: { duration: 1.1, ease: EASE },
                })}
            className="orion-float"
          >
            <OrionMark variant="bare" glint gapColor="#0d1a12" className="size-56 drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)] xl:size-64" />
          </motion.div>
          <motion.h2 {...rise(0.2)} className="font-display text-5xl leading-[1.05] text-[#f6f4ee] xl:text-6xl">
            Every deal,
            <br />
            <span className="text-gold-soft">in orbit.</span>
          </motion.h2>
          <motion.p {...rise(0.32)} className="max-w-md text-base leading-relaxed text-[#c7c2b5]">
            Leads, site visits, reservations and payments for real estate teams, kept in one calm place.
          </motion.p>
          <motion.ul {...rise(0.44)} className="flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#edeae2] backdrop-blur"
              >
                {f}
              </li>
            ))}
          </motion.ul>
        </div>

        <p className="relative text-xs text-white/40">Orion CRM · The CRM for real estate teams</p>
      </section>

      <section className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-4 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(35,130,79,0.22),transparent_70%),radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(196,145,46,0.12),transparent_70%)]"
        />
        <div className="relative flex items-center gap-3 lg:hidden">
          <OrionMark className="size-10" />
          <span className="font-display text-2xl tracking-[0.16em] text-[#f6f4ee]">ORION</span>
        </div>
        {children}
      </section>
    </div>
  );
}
