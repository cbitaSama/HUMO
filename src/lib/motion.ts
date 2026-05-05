import type { Variants, Transition } from "framer-motion"

export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.8,
}

export const easeOut: Transition = {
  duration: 0.35,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit:    { opacity: 0, y: -6, filter: "blur(2px)" },
}

export const listVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
}

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
}

export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
}

export const modalSheet: Variants = {
  initial: { opacity: 0, y: 40, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 34 } },
  exit:    { opacity: 0, y: 20, scale: 0.97, transition: { duration: 0.18 } },
}

export const tickIcon: Variants = {
  initial: { scale: 0, rotate: -90 },
  animate: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 500, damping: 22 } },
  exit:    { scale: 0, rotate: 90, transition: { duration: 0.15 } },
}
