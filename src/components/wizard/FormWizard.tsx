import { useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react'
import { useFormData } from '@/hooks/use-form-data'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useWizardForm } from './use-wizard-form'
import { WizardProgress } from './WizardProgress'
import { WizardStep } from './WizardStep'
import { WizardNav } from './WizardNav'
import { cn } from '@/lib/utils'
import type { FormField as FormFieldType, SubmissionInsert, SubmissionValueInsert } from '@/types/database'

interface FormWizardProps {
  formSlug: string
  onClose?: () => void
}

export function FormWizard({ formSlug, onClose }: FormWizardProps) {
  const { form: formData, fields, loading, error } = useFormData(formSlug)
  const { user } = useAuth()

  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Lock body scroll on mount
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Wait for fields to be loaded before initialising the wizard hook
  const hasFields = fields.length > 0 && formData !== null

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onClose={onClose} />}
      {!loading && !error && !hasFields && (
        <ErrorState message="No form fields found." onClose={onClose} />
      )}
      {hasFields && !submitted && (
        <WizardContent
          formId={formData.id}
          fields={fields}
          userId={user?.id ?? ''}
          userEmail={user?.email ?? ''}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClose={onClose}
          onSubmit={async (values) => {
            setIsSubmitting(true)
            setSubmitError(null)

            try {
              // 1. Create the submission record
              const insertPayload: SubmissionInsert = {
                form_id: formData.id,
                user_id: user?.id ?? '',
                submitted_by: user?.id ?? '',
                status: 'submitted',
                submitted_at: new Date().toISOString(),
              }

              const { data: submission, error: subError } = await supabase
                .from('submissions')
                .insert(insertPayload as never)
                .select('id')
                .single() as { data: { id: string } | null; error: { message: string } | null }

              if (subError) throw new Error(subError.message)
              if (!submission) throw new Error('Failed to create submission')

              // 2. Insert all submission values
              const submissionValues: SubmissionValueInsert[] = fields.map(
                (field) => ({
                  submission_id: submission.id,
                  field_id: field.id,
                  value: String(values[field.id] ?? ''),
                  file_url: field.field_type === 'media'
                    ? String(values[field.id] ?? '')
                    : null,
                  file_name: null,
                }),
              )

              const { error: valuesError } = await supabase
                .from('submission_values')
                .insert(submissionValues as never) as { error: { message: string } | null }

              if (valuesError) throw new Error(valuesError.message)

              // 3. Mark any pending invitations for this user+form as completed
              if (user?.email) {
                await supabase
                  .from('invitations')
                  .update({
                    status: 'completed' as const,
                    completed_at: new Date().toISOString(),
                  })
                  .eq('email', user.email)
                  .eq('form_id', formData.id)
                  .eq('status', 'pending')
              }

              setSubmitted(true)
            } catch (err) {
              setSubmitError(
                err instanceof Error ? err.message : 'Submission failed',
              )
            } finally {
              setIsSubmitting(false)
            }
          }}
        />
      )}
      {submitted && <SuccessState onClose={onClose} />}

      {/* Close button */}
      {onClose && !submitted && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Are you sure you want to exit? Your progress will be saved.')) {
              onClose()
            }
          }}
          className={cn(
            'fixed top-3 left-4 z-[60]',
            'size-9 rounded-full flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-colors',
          )}
          aria-label="Close wizard"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  )
}

// ── Wizard content (only rendered when fields are loaded) ──

interface WizardContentProps {
  formId: string
  fields: FormFieldType[]
  userId: string
  userEmail: string
  isSubmitting: boolean
  submitError: string | null
  onClose?: () => void
  onSubmit: (values: Record<string, string>) => Promise<void>
}

function WizardContent({
  formId,
  fields,
  userEmail,
  isSubmitting,
  submitError,
  onSubmit,
}: WizardContentProps) {
  const wizard = useWizardForm({ fields, formId, userEmail })

  const {
    form,
    currentStep,
    direction,
    currentField,
    totalSteps,
    goForward,
    goBack,
    isFirstStep,
    isLastStep,
    progress,
    clearPersistedData,
  } = wizard

  // Handle form submission
  const onFormSubmit = useCallback(
    async (values: Record<string, string>) => {
      await onSubmit(values)
      clearPersistedData()
    },
    [onSubmit, clearPersistedData],
  )

  const submitForm = useCallback(() => {
    void form.handleSubmit(onFormSubmit)()
  }, [form, onFormSubmit])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if inside a textarea
      const target = e.target as HTMLElement
      const isTextarea = target.tagName === 'TEXTAREA'

      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        goBack()
        return
      }

      if (e.key === 'Enter' && !isTextarea) {
        e.preventDefault()
        if (isLastStep) {
          submitForm()
        } else {
          void goForward()
        }
      }

      if (e.key === 'Escape') {
        // Escape is handled by the close button with confirmation
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goForward, goBack, isLastStep, submitForm])

  // Touch / drag gesture for swipe navigation
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      const swipeThreshold = 50
      const velocityThreshold = 300

      if (
        info.offset.y < -swipeThreshold ||
        info.velocity.y < -velocityThreshold
      ) {
        // Swiped up -> go forward
        if (isLastStep) {
          submitForm()
        } else {
          void goForward()
        }
      } else if (
        info.offset.y > swipeThreshold ||
        info.velocity.y > velocityThreshold
      ) {
        // Swiped down -> go back
        goBack()
      }
    },
    [goForward, goBack, isLastStep, submitForm],
  )

  if (!currentField) return null

  return (
    <>
      <WizardProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        progress={progress}
      />

      {/* Main content area with drag gesture */}
      <motion.div
        className="relative h-[100dvh] w-full overflow-hidden"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <WizardStep
          field={currentField}
          stepIndex={currentStep}
          totalSteps={totalSteps}
          direction={direction}
          control={form.control}
          errors={form.formState.errors}
        />
      </motion.div>

      {/* Submit error */}
      {submitError && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-6">
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg border border-destructive/20">
            {submitError}
          </div>
        </div>
      )}

      <WizardNav
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isSubmitting={isSubmitting}
        onBack={goBack}
        onNext={() => void goForward()}
        onSubmit={submitForm}
      />
    </>
  )
}

// ── Loading state ──────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex h-[100dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Loading form...</p>
      </div>
    </div>
  )
}

// ── Error state ────────────────────────────────────────────

function ErrorState({
  message,
  onClose,
}: {
  message: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-[100dvh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">{message}</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 text-primary underline underline-offset-4 text-sm hover:text-primary/80"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  )
}

// ── Success state ──────────────────────────────────────────

function SuccessState({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-[100dvh] items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-6 text-center max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
        >
          <CheckCircle2 className="size-16 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Submission Complete</h2>
        <p className="text-muted-foreground">
          Your information has been submitted successfully. Thank you!
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Close
          </button>
        )}
      </motion.div>
    </div>
  )
}
