/**
 * Single source of truth for motion, springs, and gestures across Career Graph.
 */

export const easeOut = [0.16, 1, 0.3, 1] as const;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 200,
  damping: 24,
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: easeOut },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export const drawerSlide = {
  hidden: { x: "100%", opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: springSoft,
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export const modalPop = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

import type { Variants } from "framer-motion";

export const personalityVariants: Record<string, Variants> = {
  modern_professional: {
    initial: { opacity: 0, y: 8, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: easeOut } },
    exit: { opacity: 0, y: -8, scale: 0.99, transition: { duration: 0.15 } },
  },
  technical: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: easeOut } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
  },
  editorial: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.18 } },
  },
  research: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
  },
  executive: {
    initial: { opacity: 0, scale: 0.99, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: easeOut } },
    exit: { opacity: 0, scale: 0.99, y: -10, transition: { duration: 0.15 } },
  },
};

