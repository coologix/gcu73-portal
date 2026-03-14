import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UploadedMediaPreview } from '@/components/shared/UploadedMediaPreview'
import { Separator } from '@/components/ui/separator'
import type { Form, FormField, Submission, SubmissionValue } from '@/types/database'

const statusVariant: Record<
  Submission['status'],
  'default' | 'secondary' | 'destructive'
> = {
  draft: 'secondary',
  submitted: 'default',
  update_requested: 'destructive',
}

function maskValue(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length)
  }

  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`
}

export default function UserSubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [values, setValues] = useState<SubmissionValue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submissionId) return

    let cancelled = false

    async function fetchSubmissionDetail() {
      setIsLoading(true)
      setError(null)

      try {
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', submissionId)
          .single()

        if (submissionError || !submissionData) {
          throw new Error(submissionError?.message ?? 'Submission not found')
        }

        const [formRes, fieldsRes, valuesRes] = await Promise.all([
          supabase
            .from('forms')
            .select('*')
            .eq('id', submissionData.form_id)
            .single(),
          supabase
            .from('form_fields')
            .select('*')
            .eq('form_id', submissionData.form_id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('submission_values')
            .select('*')
            .eq('submission_id', submissionData.id),
        ])

        if (formRes.error || !formRes.data) {
          throw new Error(formRes.error?.message ?? 'Form not found')
        }

        if (fieldsRes.error) {
          throw new Error(fieldsRes.error.message)
        }

        if (valuesRes.error) {
          throw new Error(valuesRes.error.message)
        }

        if (!cancelled) {
          setSubmission(submissionData)
          setForm(formRes.data)
          setFields(fieldsRes.data ?? [])
          setValues(valuesRes.data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          const nextError =
            err instanceof Error ? err.message : 'Failed to load submission'
          setError(nextError)
          toast.error(nextError)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchSubmissionDetail()

    return () => {
      cancelled = true
    }
  }, [submissionId])

  const valueMap = useMemo(
    () =>
      new Map(
        values.map((value) => [value.field_id, value]),
      ),
    [values],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !submission || !form) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">Unable to load submission</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? 'The requested submission could not be found.'}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/dashboard')}
        >
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to dashboard</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">
            {form.title}
          </h1>
          <p className="text-sm text-gcu-brown">
            Review the information you submitted for this form.
          </p>
        </div>
        <Badge variant={statusVariant[submission.status]}>
          {submission.status.replace('_', ' ')}
        </Badge>
      </div>

      <Card className="border-gcu-cream-dark">
        <CardHeader>
          <CardTitle className="text-base">Submission Summary</CardTitle>
          <CardDescription>
            Submitted{' '}
            {submission.submitted_at
              ? new Date(submission.submitted_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'not yet'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="mt-1 font-medium capitalize">
              {submission.status.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="mt-1 font-medium">
              {new Date(submission.updated_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gcu-cream-dark">
        <CardHeader>
          <CardTitle className="text-base">Responses</CardTitle>
          <CardDescription>
            {values.length} of {fields.length} fields answered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="rounded-lg bg-gcu-cream-dark/40 py-12 text-center">
              <FileText className="mx-auto size-8 text-gcu-brown" />
              <p className="mt-3 text-sm font-medium text-gcu-maroon-dark">
                No saved responses
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field) => {
                const value = valueMap.get(field.id)
                const displayValue = field.field_type === 'media'
                  ? value?.file_url
                  : value?.value

                return (
                  <div key={field.id}>
                    <dt className="text-sm text-muted-foreground">
                      {field.label}
                      {field.is_required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {field.field_type === 'media' && value?.file_url ? (
                        <UploadedMediaPreview
                          url={value.file_url}
                          label={field.label}
                          fileName={value.file_name}
                        />
                      ) : displayValue ? (
                        field.is_sensitive ? maskValue(displayValue) : displayValue
                      ) : (
                        <span className="italic text-muted-foreground">
                          Not provided
                        </span>
                      )}
                    </dd>
                    <Separator className="mt-3" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {submission.status === 'update_requested' && (
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-gcu-maroon hover:bg-gcu-maroon-light"
            onClick={() =>
              navigate(`/form/${form.slug}/submissions/${submission.id}/edit`)
            }
          >
            <Pencil className="mr-1.5 size-4" />
            Edit submission
          </Button>
        </div>
      )}

      {submission.status === 'submitted' && (
        <div className="rounded-lg border border-gcu-cream-dark bg-gcu-cream-dark/40 p-4 text-sm text-gcu-brown">
          <div className="flex items-center gap-2 font-medium text-gcu-maroon-dark">
            <CheckCircle2 className="size-4" />
            Submission received
          </div>
          <p className="mt-2">
            Your submission is complete. If the administrator needs changes,
            you will see an update request here.
          </p>
        </div>
      )}
    </div>
  )
}
