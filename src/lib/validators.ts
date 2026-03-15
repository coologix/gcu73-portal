import { z } from 'zod'
import type { FormField, ValidationRules } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────

/** Safely extract a number from validation_rules */
function num(rules: ValidationRules | null, key: keyof ValidationRules): number | undefined {
  if (!rules) return undefined
  const v = rules[key]
  return typeof v === 'number' ? v : undefined
}

/** Safely extract a string from validation_rules */
function str(rules: ValidationRules | null, key: keyof ValidationRules): string | undefined {
  if (!rules) return undefined
  const v = rules[key]
  return typeof v === 'string' ? v : undefined
}

// ── Per-field schema builder ───────────────────────────────

/**
 * Creates a Zod schema for a single form field based on its type
 * and validation_rules.
 */
export function buildFieldSchema(field: FormField): z.ZodType {
  const rules = field.validation_rules
  let schema: z.ZodType

  switch (field.field_type) {
    case 'text':
    case 'password':
    case 'textarea':
    case 'tel': {
      let s = z.string()
      if (field.is_required) s = s.min(1, 'This field is required')
      const minLen = num(rules, 'min_length')
      const maxLen = num(rules, 'max_length')
      const pattern = str(rules, 'pattern')

      if (minLen !== undefined) s = s.min(minLen, `Minimum ${minLen} characters`)
      if (maxLen !== undefined) s = s.max(maxLen, `Maximum ${maxLen} characters`)
      if (pattern) s = s.regex(new RegExp(pattern), 'Invalid format')

      schema = s
      break
    }

    case 'email': {
      let s = z.string()
      if (field.is_required) s = s.min(1, 'This field is required')
      s = s.email('Please enter a valid email address')
      const maxLen = num(rules, 'max_length')
      if (maxLen !== undefined) s = s.max(maxLen, `Maximum ${maxLen} characters`)
      schema = s
      break
    }

    case 'number': {
      let s = z.coerce.number({ message: 'Please enter a valid number' })
      const min = num(rules, 'min_value')
      const max = num(rules, 'max_value')
      if (min !== undefined) s = s.min(min, `Minimum value is ${min}`)
      if (max !== undefined) s = s.max(max, `Maximum value is ${max}`)
      schema = s
      break
    }

    case 'date': {
      let s = z.string()
      if (field.is_required) s = s.min(1, 'Please select a date')
      schema = s
      break
    }

    case 'media': {
      let s = z.string()
      if (field.is_required) s = s.min(1, 'Please upload a file')
      schema = s
      break
    }

    default: {
      let s = z.string()
      if (field.is_required) s = s.min(1, 'This field is required')
      schema = s
    }
  }

  // Make the field optional when not required
  if (!field.is_required) {
    schema = schema.optional()
  }

  return schema
}

// ── Full-form schema builder ───────────────────────────────

/**
 * Builds a complete Zod object schema from an array of FormField records.
 * Keys are field.id (UUID).
 */
export function buildFormSchema(
  fields: FormField[],
): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {}

  for (const field of fields) {
    shape[field.id] = buildFieldSchema(field)
  }

  return z.object(shape)
}
