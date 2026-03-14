import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FormField, ValidationRules } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'date', label: 'Date' },
  { value: 'media', label: 'Media' },
] as const

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'] as const

interface FieldConfigValues {
  label: string
  description: string
  placeholder: string
  field_type: FormField['field_type']
  is_required: boolean
  is_sensitive: boolean
  // Validation rules
  min_length?: number | ''
  max_length?: number | ''
  pattern?: string
  min_value?: number | ''
  max_value?: number | ''
  max_file_size_mb?: number | ''
  allowed_extensions: string[]
}

interface FieldConfigProps {
  field: FormField
  onSave: (updated: Partial<FormField>) => void
  onCancel: () => void
  className?: string
}

// ── Helpers ────────────────────────────────────────────────

function parseRules(rules: ValidationRules | null): Partial<FieldConfigValues> {
  if (!rules) return { allowed_extensions: [] }
  return {
    min_length: rules.min_length ?? '',
    max_length: rules.max_length ?? '',
    pattern: rules.pattern ?? '',
    min_value: rules.min_value ?? '',
    max_value: rules.max_value ?? '',
    max_file_size_mb: rules.max_file_size_mb ?? '',
    allowed_extensions: rules.allowed_extensions ?? [],
  }
}

function buildRules(values: FieldConfigValues): ValidationRules {
  const rules: ValidationRules = {}
  if (values.min_length !== '' && values.min_length !== undefined) {
    rules.min_length = Number(values.min_length)
  }
  if (values.max_length !== '' && values.max_length !== undefined) {
    rules.max_length = Number(values.max_length)
  }
  if (values.pattern) rules.pattern = values.pattern
  if (values.min_value !== '' && values.min_value !== undefined) {
    rules.min_value = Number(values.min_value)
  }
  if (values.max_value !== '' && values.max_value !== undefined) {
    rules.max_value = Number(values.max_value)
  }
  if (values.max_file_size_mb !== '' && values.max_file_size_mb !== undefined) {
    rules.max_file_size_mb = Number(values.max_file_size_mb)
  }
  if (values.allowed_extensions.length > 0) {
    rules.allowed_extensions = values.allowed_extensions
  }
  return rules
}

// ── Component ──────────────────────────────────────────────

export function FieldConfig({ field, onSave, onCancel, className }: FieldConfigProps) {
  const parsed = parseRules(field.validation_rules)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty },
  } = useForm<FieldConfigValues>({
    defaultValues: {
      label: field.label,
      description: field.description ?? '',
      placeholder: field.placeholder ?? '',
      field_type: field.field_type,
      is_required: field.is_required,
      is_sensitive: field.is_sensitive,
      min_length: parsed.min_length,
      max_length: parsed.max_length,
      pattern: parsed.pattern,
      min_value: parsed.min_value,
      max_value: parsed.max_value,
      max_file_size_mb: parsed.max_file_size_mb,
      allowed_extensions: parsed.allowed_extensions ?? [],
    },
  })

  const fieldType = watch('field_type')
  const isRequired = watch('is_required')
  const isSensitive = watch('is_sensitive')
  const selectedExtensions = watch('allowed_extensions')

  // Reset form when field changes
  useEffect(() => {
    const p = parseRules(field.validation_rules)
    reset({
      label: field.label,
      description: field.description ?? '',
      placeholder: field.placeholder ?? '',
      field_type: field.field_type,
      is_required: field.is_required,
      is_sensitive: field.is_sensitive,
      min_length: p.min_length,
      max_length: p.max_length,
      pattern: p.pattern,
      min_value: p.min_value,
      max_value: p.max_value,
      max_file_size_mb: p.max_file_size_mb,
      allowed_extensions: p.allowed_extensions ?? [],
    })
  }, [field, reset])

  const onSubmit = (values: FieldConfigValues) => {
    onSave({
      label: values.label,
      description: values.description || null,
      placeholder: values.placeholder || null,
      field_type: values.field_type,
      is_required: values.is_required,
      is_sensitive: values.is_sensitive,
      validation_rules: buildRules(values),
    })
  }

  const showTextValidation = ['text', 'password', 'email', 'textarea'].includes(fieldType)
  const showNumberValidation = fieldType === 'number'
  const showMediaValidation = fieldType === 'media'

  function toggleExtension(ext: string) {
    const current = selectedExtensions ?? []
    const next = current.includes(ext)
      ? current.filter((e) => e !== ext)
      : [...current, ext]
    setValue('allowed_extensions', next, { shouldDirty: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      {/* Basic fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fc-label">Label</Label>
          <Input id="fc-label" {...register('label', { required: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fc-description">Description</Label>
          <Input id="fc-description" {...register('description')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fc-placeholder">Placeholder</Label>
          <Input id="fc-placeholder" {...register('placeholder')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fc-field-type">Field Type</Label>
          <select
            id="fc-field-type"
            {...register('field_type')}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>
                {ft.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="fc-required">Required</Label>
          <Switch
            id="fc-required"
            checked={isRequired}
            onCheckedChange={(checked) =>
              setValue('is_required', Boolean(checked), { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="fc-sensitive">Sensitive</Label>
          <Switch
            id="fc-sensitive"
            checked={isSensitive}
            onCheckedChange={(checked) =>
              setValue('is_sensitive', Boolean(checked), { shouldDirty: true })
            }
          />
        </div>
      </div>

      {/* Validation rules */}
      {(showTextValidation || showNumberValidation || showMediaValidation) && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Validation Rules</h4>

            {showTextValidation && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fc-min-len">Min Length</Label>
                    <Input
                      id="fc-min-len"
                      type="number"
                      min={0}
                      {...register('min_length', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fc-max-len">Max Length</Label>
                    <Input
                      id="fc-max-len"
                      type="number"
                      min={0}
                      {...register('max_length', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fc-pattern">Pattern (regex)</Label>
                  <Input id="fc-pattern" placeholder="e.g. ^[A-Z].*" {...register('pattern')} />
                </div>
              </>
            )}

            {showNumberValidation && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fc-min-val">Min Value</Label>
                  <Input
                    id="fc-min-val"
                    type="number"
                    {...register('min_value', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fc-max-val">Max Value</Label>
                  <Input
                    id="fc-max-val"
                    type="number"
                    {...register('max_value', { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}

            {showMediaValidation && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fc-max-size">Max File Size (MB)</Label>
                  <Input
                    id="fc-max-size"
                    type="number"
                    min={0}
                    step={0.5}
                    {...register('max_file_size_mb', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Allowed Extensions</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALLOWED_EXTENSIONS.map((ext) => {
                      const checked = (selectedExtensions ?? []).includes(ext)
                      return (
                        <button
                          key={ext}
                          type="button"
                          onClick={() => toggleExtension(ext)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                            checked
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted',
                          )}
                        >
                          .{ext}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={!isDirty}>
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
