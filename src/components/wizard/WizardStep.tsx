import { motion, AnimatePresence } from 'framer-motion'
import { stepVariants } from './wizard-animations'
import { DynamicField } from './DynamicField'
import type { FormField } from '@/types/database'
import type { Control, FieldErrors } from 'react-hook-form'

interface WizardStepProps {
  field: FormField
  stepIndex: number
  totalSteps: number
  direction: number
  control: Control<Record<string, string>>
  errors: FieldErrors<Record<string, string>>
}

export function WizardStep({
  field,
  stepIndex,
  totalSteps,
  direction,
  control,
  errors,
}: WizardStepProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={field.id}
        custom={direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-full max-w-lg mx-auto px-6">
          {/* Step counter */}
          <p className="text-sm font-medium text-primary mb-2">
            {stepIndex + 1}
            <span className="text-muted-foreground">
              {' '}
              / {totalSteps}
            </span>
          </p>

          {/* Label */}
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            {field.label}
            {field.is_required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </h2>

          {/* Description */}
          {field.description && (
            <p className="text-base text-muted-foreground mb-8">
              {field.description}
            </p>
          )}

          {/* Field input */}
          <div className={!field.description ? 'mt-6' : ''}>
            <DynamicField
              field={field}
              control={control}
              errors={errors}
              autoFocus
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
