import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { AlertCircle, Loader2 } from 'lucide-react'
import { FormWizard } from '@/components/wizard/FormWizard'
import { useAuth } from '@/lib/auth'
import { completeInvitationForCurrentUser } from '@/lib/invitations'
import { supabase } from '@/lib/supabase'

export default function FormPage() {
  const { slug, submissionId } = useParams<{
    slug: string
    submissionId: string
  }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [routeStatus, setRouteStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const invitationToken = searchParams.get('inviteToken')

  useEffect(() => {
    if (!slug || !user) return

    let cancelled = false

    async function resolveRoute() {
      setRouteStatus('loading')
      setError(null)

      try {
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('id')
          .eq('slug', slug)
          .single()

        if (formError || !formData) {
          throw new Error(formError?.message ?? 'Form not found')
        }

        if (submissionId) {
          const { data: existingSubmission, error: existingSubmissionError } = await supabase
            .from('submissions')
            .select('id, status, form_id')
            .eq('id', submissionId)
            .eq('user_id', user.id)
            .single()

          if (existingSubmissionError || !existingSubmission) {
            throw new Error(existingSubmissionError?.message ?? 'Submission not found')
          }

          if (existingSubmission.form_id !== formData.id) {
            throw new Error('Submission does not belong to this form')
          }

          if (existingSubmission.status === 'submitted') {
            if (invitationToken) {
              const { error: invitationError } =
                await completeInvitationForCurrentUser({
                  formId: formData.id,
                  token: invitationToken,
                })

              if (invitationError) {
                console.warn(
                  'Failed to reconcile invitation completion:',
                  invitationError.message,
                )
              }
            }

            navigate(`/submissions/${existingSubmission.id}`, { replace: true })
            return
          }

          if (!cancelled) {
            setRouteStatus('ready')
          }
          return
        }

        const { data: currentSubmission, error: currentSubmissionError } = await supabase
          .from('submissions')
          .select('id, status')
          .eq('form_id', formData.id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (currentSubmissionError) {
          throw new Error(currentSubmissionError.message)
        }

        if (currentSubmission) {
          if (currentSubmission.status === 'submitted' && invitationToken) {
            const { error: invitationError } =
              await completeInvitationForCurrentUser({
                formId: formData.id,
                token: invitationToken,
              })

            if (invitationError) {
              console.warn(
                'Failed to reconcile invitation completion:',
                invitationError.message,
              )
            }
          }

          const target =
            currentSubmission.status === 'submitted'
              ? `/submissions/${currentSubmission.id}`
              : `/form/${slug}/submissions/${currentSubmission.id}/edit`

          navigate(target, { replace: true })
          return
        }

        if (!cancelled) {
          setRouteStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load form')
          setRouteStatus('error')
        }
      }
    }

    void resolveRoute()

    return () => {
      cancelled = true
    }
  }, [invitationToken, navigate, slug, submissionId, user])

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">No form specified.</p>
      </div>
    )
  }

  if (routeStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (routeStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <p className="mt-4 text-base font-medium">Unable to open this form</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? 'Something went wrong while loading your submission.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <FormWizard
      formSlug={slug}
      submissionId={submissionId}
      invitationToken={invitationToken}
      onClose={() => navigate(submissionId ? `/submissions/${submissionId}` : '/dashboard')}
    />
  )
}
