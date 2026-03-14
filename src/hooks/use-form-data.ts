import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Form, FormField, Submission, SubmissionValue } from '@/types/database'

interface UseFormDataOptions {
  submissionId?: string
}

interface UseFormDataReturn {
  form: Form | null
  fields: FormField[]
  submission: Submission | null
  initialValues: Record<string, string>
  loading: boolean
  error: string | null
}

/**
 * Fetches a form and its fields by slug.
 *
 * Fields are returned sorted by `sort_order`.
 */
export function useFormData(
  slug: string,
  options: UseFormDataOptions = {},
): UseFormDataReturn {
  const { submissionId } = options
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [initialValues, setInitialValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)
      setSubmission(null)
      setInitialValues({})

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

      const requests: Promise<unknown>[] = [
        supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formData.id)
          .order('sort_order', { ascending: true }) as Promise<{
            data: FormField[] | null
            error: { message: string } | null
          }>,
      ]

      if (submissionId) {
        requests.push(
          supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .single() as Promise<{
              data: Submission | null
              error: { message: string } | null
            }>,
        )
        requests.push(
          supabase
            .from('submission_values')
            .select('*')
            .eq('submission_id', submissionId) as Promise<{
              data: SubmissionValue[] | null
              error: { message: string } | null
            }>,
        )
      }

      const results = await Promise.all(requests)
      const fieldsRes = results[0] as {
        data: FormField[] | null
        error: { message: string } | null
      }

      if (!cancelled) {
        if (fieldsRes.error) {
          setError(fieldsRes.error.message)
          setLoading(false)
          return
        }

        const nextFields = fieldsRes.data ?? []

        if (submissionId) {
          const submissionRes = results[1] as {
            data: Submission | null
            error: { message: string } | null
          }
          const valuesRes = results[2] as {
            data: SubmissionValue[] | null
            error: { message: string } | null
          }

          if (submissionRes.error || !submissionRes.data) {
            setError(submissionRes.error?.message ?? 'Submission not found')
            setLoading(false)
            return
          }

          if (valuesRes.error) {
            setError(valuesRes.error.message)
            setLoading(false)
            return
          }

          if (submissionRes.data.form_id !== formData.id) {
            setError('Submission does not belong to this form')
            setLoading(false)
            return
          }

          const valueMap = new Map(
            (valuesRes.data ?? []).map((value) => [
              value.field_id,
              value.file_url ?? value.value ?? '',
            ]),
          )

          const nextInitialValues: Record<string, string> = {}
          for (const field of nextFields) {
            nextInitialValues[field.id] = valueMap.get(field.id) ?? ''
          }

          setSubmission(submissionRes.data)
          setInitialValues(nextInitialValues)
        }

        setForm(formData)
        setFields(nextFields)
        setLoading(false)
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [slug, submissionId])

  return { form, fields, submission, initialValues, loading, error }
}
