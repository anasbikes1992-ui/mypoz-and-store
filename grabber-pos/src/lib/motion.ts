import type { Transition, Variants } from "framer-motion";

/** Shared spring — Apple-like snappy settle */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 28,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

/** Fade + rise; pass `reduced` from useReducedMotion() */
export function fadeUp(reduced: boolean | null, delay = 0): {
  initial: false | { opacity: number; y: number };
  animate: { opacity: number; y: number };
  transition: Transition;
} {
  if (reduced) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...springSoft, delay },
  };
}

export function staggerContainer(reduced: boolean | null): Variants {
  if (reduced) {
    return {
      hidden: {},
      show: { transition: { staggerChildren: 0 } },
    };
  }
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.045, delayChildren: 0.06 },
    },
  };
}

export function staggerItem(reduced: boolean | null): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1, y: 0, scale: 1 },
      show: { opacity: 1, y: 0, scale: 1 },
    };
  }
  return {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: springSoft,
    },
  };
}

/** iOS-like tile tint cycle (not purple sludge) */
export const TILE_TINTS = [
  "var(--tint-blue)",
  "var(--tint-teal)",
  "var(--tint-coral)",
  "var(--tint-pink)",
  "var(--tint-amber)",
  "var(--tint-green)",
] as const;

export function tileTint(index: number): string {
  return TILE_TINTS[index % TILE_TINTS.length];
}

/** Charming card hover / press — no-ops when reduced motion is preferred */
export function interactiveCard(reduced: boolean | null): {
  whileHover?: { y: number; scale: number };
  whileTap?: { scale: number };
  transition: Transition;
} {
  if (reduced) {
    return { transition: { duration: 0 } };
  }
  return {
    whileHover: { y: -5, scale: 1.015 },
    whileTap: { scale: 0.985 },
    transition: springSoft,
  };
}
