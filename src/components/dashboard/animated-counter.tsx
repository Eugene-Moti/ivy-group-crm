"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

const defaultFormatter = (n: number) => Math.round(n).toLocaleString("en-US");

export function AnimatedCounter({
  value,
  formatter = defaultFormatter,
}: {
  value: number;
  formatter?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = formatter(v);
      },
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restarting on every formatter identity change (often a fresh inline fn) would defeat the count-up animation; only `value` should retrigger it.
  }, [value]);

  return <span ref={ref}>{formatter(0)}</span>;
}
