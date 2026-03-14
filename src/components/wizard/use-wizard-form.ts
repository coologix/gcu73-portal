import { useState, useCallback, useMemo, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildFormSchema, buildFieldSchema } from '@/lib/validators'
import type { FormField } from '@/types/database'
import { z } from 'zod'

const STORAGE_PREFIX = 'gcu73_wizard_'

interface UseWizardFormOptions {
  fields: FormField[]
  formId: string
  userEmail?: string
}

export function useWizardForm({ fields, formId, userEmail }: UseWizardFormOptions) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)

  const storageKey = `${STORAGE_PREFIX}${formId}`

  // Build the full Zod schema from all fields
  const schema = useMemo(() => buildFormSchema(fields), [fields])

  // Load persisted form data from localStorage
  const defaultValues = useMemo(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        return JSON.parse(saved) as Record<string, string>
      } catch {
        // Corrupted data, ignore
      }
    }
    // Initialize all fields — prefill email fields with user's email
    const defaults: Record<string, string> = {}
    for (const field of fields) {
      if (field.field_type === 'email' && userEmail) {
        defaults[field.id] = userEmail
      } else {
        defaults[field.id] = ''
      }
    }
    return defaults
  }, [fields, storageKey, userEmail])

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema) as Resolver<Record<string, string>>,
    defaultValues,
    mode: 'onTouched',
  })

  // Persist form data to localStorage on every change
  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values))
      } catch {
        // Storage full or unavailable, silently ignore
      }
    })
    return () => subscription.unsubscribe()
  }, [form, storageKey])

  const currentField = fields[currentStep] ?? null
  const totalSteps = fields.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  // Validate the current field before advancing
  const goForward = useCallback(async () => {
    if (!currentField) return false

    // Validate only the current field
    const fieldId = currentField.id
    const value = form.getValues(fieldId)
    const fieldSchema = buildFieldSchema(currentField)

    try {
      // For required fields, also check empty string
      if (currentField.is_required && (value === '' || value === undefined)) {
        form.setError(fieldId, { type: 'required', message: 'This field is required' })
        return false
      }

      // Validate with the field schema
      if (value !== '' && value !== undefined) {
        z.parse(fieldSchema, value)
      }

      // Clear any existing errors for this field
      form.clearErrors(fieldId)

      if (!isLastStep) {
        setDirection(1)
        setCurrentStep((prev) => prev + 1)
      }

      return true
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issue = err.issues[0]
        form.setError(fieldId, {
          type: 'validation',
          message: issue?.message ?? 'Invalid value',
        })
      }
      return false
    }
  }, [currentField, form, isLastStep])

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      setDirection(-1)
      setCurrentStep((prev) => prev - 1)
    }
  }, [isFirstStep])

  // Clear persisted data after successful submission
  const clearPersistedData = useCallback(() => {
    localStorage.removeItem(storageKey)
  }, [storageKey])

  const handleSubmit = form.handleSubmit

  return {
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
    handleSubmit,
    clearPersistedData,
  }
}
