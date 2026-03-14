import type { Variants } from 'framer-motion'

/**
 * Typeform-style vertical parallax transitions.
 *
 * Forward (direction > 0): current slides up + fades, next slides in from below.
 * Backward (direction < 0): current slides down, previous slides in from above.
 */
export const stepVariants: Variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? '100%' : '-30%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: (direction: number) => ({
    y: direction > 0 ? '-30%' : '100%',
    opacity: 0,
    scale: 0.95,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  }),
}

/**
 * Animated width for the progress bar.
 */
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  }),
}
