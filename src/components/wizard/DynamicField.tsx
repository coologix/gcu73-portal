import { useCallback, useRef, useEffect } from 'react'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import type { FormField } from '@/types/database'
import { MaskedInput } from './MaskedInput'
import { MediaUpload } from './MediaUpload'
import { cn } from '@/lib/utils'

interface DynamicFieldProps {
  field: FormField
  control: Control<Record<string, string>>
  errors: FieldErrors<Record<string, string>>
  autoFocus?: boolean
}

/** Shared underline-style input classes */
const underlineClasses = cn(
  'w-full bg-transparent border-0 border-b-2 border-muted-foreground/30',
  'text-2xl font-light tracking-wide',
  'py-3 outline-none transition-colors',
  'placeholder:text-muted-foreground/40',
  'focus:border-primary',
)

const errorClasses = 'border-destructive focus:border-destructive'

export function DynamicField({ field, control, errors, autoFocus }: DynamicFieldProps) {
  const fieldError = errors[field.id]
  const hasError = !!fieldError
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Auto-focus the input when the step becomes active
  useEffect(() => {
    if (autoFocus) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  // Detect if this password field should use numeric input (NIN/BVN patterns)
  const isNumericPassword = useCallback(() => {
    if (field.field_type !== 'password') return false
    const pattern = field.validation_rules?.pattern
    if (!pattern) return false
    // Common patterns for NIN/BVN are purely numeric
    return /^\^?\\d|^\^\[0-9\]/.test(pattern)
  }, [field])

  return (
    <div className="w-full space-y-2">
      <Controller
        name={field.id}
        control={control}
        render={({ field: rhfField }) => {
          switch (field.field_type) {
            case 'text':
              return (
                <input
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  type="text"
                  placeholder={field.placeholder ?? ''}
                  className={cn(underlineClasses, hasError && errorClasses)}
                  autoComplete="off"
                />
              )

            case 'number':
              return (
                <input
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  type="text"
                  inputMode="numeric"
                  placeholder={field.placeholder ?? ''}
                  className={cn(underlineClasses, hasError && errorClasses)}
                  autoComplete="off"
                />
              )

            case 'email':
              return (
                <input
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  type="email"
                  placeholder={field.placeholder ?? 'name@example.com'}
                  className={cn(underlineClasses, hasError && errorClasses)}
                  autoComplete="email"
                />
              )

            case 'date':
              return (
                <input
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  type="date"
                  className={cn(
                    underlineClasses,
                    'text-xl',
                    hasError && errorClasses,
                    // Fix for date input placeholder color
                    !rhfField.value && 'text-muted-foreground/40',
                  )}
                />
              )

            case 'textarea':
              return (
                <textarea
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
                  }}
                  placeholder={field.placeholder ?? ''}
                  rows={3}
                  className={cn(
                    'w-full bg-transparent border-0 border-b-2 border-muted-foreground/30',
                    'text-xl font-light tracking-wide',
                    'py-3 outline-none transition-colors resize-none',
                    'placeholder:text-muted-foreground/40',
                    'focus:border-primary',
                    'field-sizing-content min-h-[4rem]',
                    hasError && errorClasses,
                  )}
                />
              )

            case 'password':
              return (
                <MaskedInput
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  placeholder={field.placeholder ?? ''}
                  numeric={isNumericPassword()}
                  error={hasError}
                />
              )

            case 'media':
              return (
                <MediaUpload
                  fieldId={field.id}
                  value={rhfField.value}
                  onChange={rhfField.onChange}
                  error={hasError}
                />
              )

            default:
              return (
                <input
                  {...rhfField}
                  ref={(el) => {
                    rhfField.ref(el)
                    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  type="text"
                  placeholder={field.placeholder ?? ''}
                  className={cn(underlineClasses, hasError && errorClasses)}
                  autoComplete="off"
                />
              )
          }
        }}
      />

      {/* Error message */}
      {fieldError?.message && (
        <p className="text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1">
          {String(fieldError.message)}
        </p>
      )}
    </div>
  )
}
