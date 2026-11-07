"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

export interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Positioned inside a `relative` container; x/y are container-relative pixels. */
export function ChartTooltip({ tip }: { tip: TipState | null }) {
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#0e1424] px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: tip.x, top: tip.y - 8 }}
          role="status"
        >
          {tip.content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
