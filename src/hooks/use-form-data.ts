import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Form, FormField } from '@/types/database'

interface UseFormDataReturn {
  form: Form | null
  fields: FormField[]
  loading: boolean
  error: string | null
}

/**
 * Fetches a form and its fields by slug.
 *
 * Fields are returned sorted by `sort_order`.
 */
export function useFormData(slug: string): UseFormDataReturn {
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)

      // 1. Fetch form by slug
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .single() as { data: Form | null; error: { message: string } | null }

      if (formError || !formData) {
        if (!cancelled) {
          setError(formError?.message ?? 'Form not found')
          setLoading(false)
        }
        return
      }

      // 2. Fetch related fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formData.id)
        .order('sort_order', { ascending: true }) as {
          data: FormField[] | null
          error: { message: string } | null
        }

      if (!cancelled) {
        if (fieldsError) {
          setError(fieldsError.message)
        } else {
          setForm(formData)
          setFields(fieldsData ?? [])
        }
        setLoading(false)
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [slug])

  return { form, fields, loading, error }
}
