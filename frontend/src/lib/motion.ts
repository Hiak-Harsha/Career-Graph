import type { Variants } from "framer-motion";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_SNAP = [0.4, 0, 0.2, 1] as const;

/**
 * Standard staggered container for lists, grids, and navigation items.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

/**
 * Standard staggered child item matching design tokens.
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: EASE_OUT,
    },
  },
};

/**
 * Standard drawer slide-in transition matching the 280ms spring token.
 */
export const drawerEnter: Variants = {
  hidden: { x: "100%", opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 28,
      stiffness: 280,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: EASE_OUT,
    },
  },
};

/**
 * Standard modal scale-up transition matching the 200ms ease token.
 */
export const modalScale: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: EASE_OUT,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: {
      duration: 0.15,
      ease: EASE_OUT,
    },
  },
};

/**
 * Simple fade up for hero sections, cards, and graph canvas elements.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: EASE_OUT,
    },
  },
};

/**
 * 5 Distinct Personality switch animation signatures for Resume paper rendering.
 */
export const personalityVariants: Record<string, Variants> = {
  modern_professional: {
    initial: { opacity: 0, scale: 0.985 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.985, transition: { duration: 0.15 } },
  },
  technical_minimalist: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: EASE_SNAP } },
    exit: { opacity: 0, x: 8, transition: { duration: 0.12 } },
  },
  editorial_narrative: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  },
  research_academic: {
    initial: { opacity: 0, filter: "blur(4px)" },
    animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.3 } },
    exit: { opacity: 0, filter: "blur(2px)", transition: { duration: 0.18 } },
  },
  executive_leadership: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
    exit: { opacity: 0, y: 6, transition: { duration: 0.16 } },
  },
};
