import { motion } from 'framer-motion'
import { progressVariants } from './wizard-animations'
import { cn } from '@/lib/utils'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  progress: number
}

export function WizardProgress({ currentStep, totalSteps, progress }: WizardProgressProps) {
  return (
    <div className="fixed top-0 inset-x-0 z-50">
      {/* Thin progress bar */}
      <div className="h-1 w-full bg-muted/40">
        <motion.div
          className={cn('h-full bg-primary rounded-r-full')}
          variants={progressVariants}
          initial="initial"
          animate="animate"
          custom={progress}
        />
      </div>

      {/* Step counter */}
      <div className="flex justify-end px-4 py-2">
        <span className="text-xs text-muted-foreground font-medium tabular-nums">
          {currentStep + 1} of {totalSteps}
        </span>
      </div>
    </div>
  )
}
