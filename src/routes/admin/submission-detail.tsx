import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Submission, SubmissionValue, FormField, Form } from '@/types/database'

export default function SubmissionDetailPage() {
  const { formId, submissionId } = useParams<{
    formId: string
    submissionId: string
  }>()
  const navigate = useNavigate()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [values, setValues] = useState<SubmissionValue[]>([])
  const [fields, setFields] = useState<FormField[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!formId || !submissionId) return

    async function fetchData() {
      setIsLoading(true)
      try {
        // Fetch all data in parallel
        const [formRes, subRes, fieldsRes, valuesRes] = await Promise.all([
          supabase.from('forms').select('*').eq('id', formId!).single(),
          supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId!)
            .single(),
          supabase
            .from('form_fields')
            .select('*')
            .eq('form_id', formId!)
            .order('sort_order', { ascending: true }),
          supabase
            .from('submission_values')
            .select('*')
            .eq('submission_id', submissionId!),
        ])

        if (formRes.error) throw new Error(formRes.error.message)
        if (subRes.error) throw new Error(subRes.error.message)
        if (fieldsRes.error) throw new Error(fieldsRes.error.message)
        if (valuesRes.error) throw new Error(valuesRes.error.message)

        setForm(formRes.data)
        setSubmission(subRes.data)
        setFields(fieldsRes.data ?? [])
        setValues(valuesRes.data ?? [])
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load submission',
        )
        navigate(`/admin/submissions/${formId}`, { replace: true })
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [formId, submissionId, navigate])

  // ── Request update handler ─────────────────────────────────

  async function handleRequestUpdate() {
    if (!submission) return
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'update_requested' })
        .eq('id', submission.id)

      if (error) throw new Error(error.message)

      setSubmission((prev) =>
        prev ? { ...prev, status: 'update_requested' } : prev,
      )
      toast.success('Update requested')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to request update',
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">Submission not found</p>
      </div>
    )
  }

  // Build a map from field ID to field for easy lookup
  const fieldMap = new Map(fields.map((f) => [f.id, f]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(`/admin/submissions/${formId}`)}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to submissions</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Submission Detail
          </h1>
          <p className="text-sm text-muted-foreground">
            {form?.title ?? 'Form'} &middot; {submission.submitted_by}
          </p>
        </div>
        <Badge
          variant={
            submission.status === 'submitted'
              ? 'default'
              : submission.status === 'update_requested'
                ? 'destructive'
                : 'secondary'
          }
        >
          {submission.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Submitted By</dt>
              <dd className="font-medium">{submission.submitted_by}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">
                {submission.status.replace('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {new Date(submission.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="font-medium">
                {new Date(submission.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Field values */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Responses</CardTitle>
          <CardDescription>
            {values.length} of {fields.length} fields answered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {values.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No responses recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field) => {
                const val = values.find((v) => v.field_id === field.id)
                return (
                  <div key={field.id}>
                    <dt className="text-sm text-muted-foreground">
                      {field.label}
                      {field.is_required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium">
                      {val?.file_url ? (
                        <a
                          href={val.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 underline-offset-4 hover:underline"
                        >
                          {val.file_name ?? 'View file'}
                        </a>
                      ) : val?.value ? (
                        val.value
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

      {/* Actions */}
      {submission.status === 'submitted' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestUpdate}
          >
            Request Update
          </Button>
        </div>
      )}
    </div>
  )
}
