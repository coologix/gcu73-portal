import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Inbox,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Submission, Form, Invitation } from '@/types/database'

interface SubmissionWithForm extends Submission {
  form?: Form | null
}

interface AvailableForm extends Form {
  pendingInvitation?: Invitation | null
}

const statusConfig: Record<
  Submission['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Clock }
> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  submitted: { label: 'Submitted', variant: 'default', icon: CheckCircle2 },
  update_requested: {
    label: 'Update Requested',
    variant: 'destructive',
    icon: AlertCircle,
  },
}

// ── Animation helpers ────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile, isAdmin, signOut } = useAuth()

  const [submissions, setSubmissions] = useState<SubmissionWithForm[]>([])
  const [availableForms, setAvailableForms] = useState<AvailableForm[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchSubmissions() {
      setIsLoading(true)
      try {
        // Fetch user submissions
        const { data: subs, error: subsError } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })

        if (subsError) throw new Error(subsError.message)
        const nextSubmissions = subs ?? []
        const submissionFormIds = [...new Set(nextSubmissions.map((submission) => submission.form_id))]
        const submittedFormIds = new Set(submissionFormIds)

        // Fetch related forms
        if (nextSubmissions.length > 0) {
          const { data: forms } = await supabase
            .from('forms')
            .select('*')
            .in('id', submissionFormIds)

          const formMap = new Map(forms?.map((f) => [f.id, f]) ?? [])

          const enriched: SubmissionWithForm[] = nextSubmissions.map((submission) => ({
            ...submission,
            form: formMap.get(submission.form_id) ?? null,
          }))

          setSubmissions(enriched)
        } else {
          setSubmissions([])
        }

        const { data: activeForms, error: activeFormsError } = await supabase
          .from('forms')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (activeFormsError) throw new Error(activeFormsError.message)

        let pendingInvites: Invitation[] = []
        if (user.email) {
          const { data: invites, error: invitesError } = await supabase
            .from('invitations')
            .select('*')
            .eq('email', user.email)
            .eq('status', 'pending')

          if (invitesError) throw new Error(invitesError.message)
          pendingInvites = invites ?? []
        }

        const pendingInviteMap = new Map<string, Invitation>()
        for (const invitation of pendingInvites) {
          if (!submittedFormIds.has(invitation.form_id) && !pendingInviteMap.has(invitation.form_id)) {
            pendingInviteMap.set(invitation.form_id, invitation)
          }
        }

        setAvailableForms(
          (activeForms ?? [])
            .filter((form) => !submittedFormIds.has(form.id))
            .map((form) => ({
              ...form,
              pendingInvitation: pendingInviteMap.get(form.id) ?? null,
            })),
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load submissions',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void fetchSubmissions()
  }, [user])

  const hasUpdateRequests = submissions.some(
    (s) => s.status === 'update_requested',
  )

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gcu-cream/50 to-white font-sans">
      {/* Brand accent bar */}
      <div className="h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div>
            <h1 className="text-base font-bold tracking-tight text-gcu-maroon-dark">
              Welcome back, {firstName}
            </h1>
            {profile?.full_name && (
              <p className="text-xs text-gcu-brown">
                {profile.full_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-gcu-maroon border-gcu-maroon/20 hover:bg-gcu-cream')}
              >
                Admin Panel
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gcu-brown hover:text-gcu-maroon">
              <LogOut className="mr-1.5 size-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <motion.main
        className="mx-auto max-w-3xl px-4 py-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Available forms */}
        {availableForms.length > 0 && (
          <motion.div variants={fadeUp} custom={0}>
            <div className="mb-6 space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-gcu-maroon-dark">Available Forms</h2>
                <p className="text-xs text-gcu-brown">
                  Choose a form below to get started with your submission.
                </p>
              </div>
              {availableForms.map((form) => (
                <Link
                  key={form.id}
                  to={
                    form.pendingInvitation
                      ? `/form/${form.slug}?inviteToken=${form.pendingInvitation.token}`
                      : `/form/${form.slug}`
                  }
                  className="group flex flex-col gap-4 rounded-lg border border-gcu-gold/30 bg-gcu-cream-dark p-4 transition-all hover:shadow-md hover:shadow-gcu-maroon/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gcu-maroon/10">
                      <FileText className="size-5 text-gcu-maroon" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gcu-maroon-dark">
                          {form.title}
                        </p>
                        {form.pendingInvitation && (
                          <Badge
                            variant="outline"
                            className="border-gcu-gold/50 bg-white text-gcu-brown"
                          >
                            Invited
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gcu-brown">
                        {form.pendingInvitation
                          ? 'You were invited to complete this form.'
                          : form.description?.trim() || 'Complete this form to share your details.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-end text-xs font-medium text-gcu-maroon sm:min-w-[92px] sm:justify-end sm:self-center sm:pl-4">
                    <span className="whitespace-nowrap">Start form</span>
                    <ArrowRight className="size-4 text-gcu-brown transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Update request banner */}
        {hasUpdateRequests && (
          <motion.div variants={fadeUp} custom={0}>
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-gcu-gold/30 bg-gcu-cream-dark p-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-gcu-brown" />
              <div>
                <p className="text-sm font-medium text-gcu-maroon">
                  Action required
                </p>
                <p className="mt-0.5 text-xs text-gcu-brown">
                  One or more of your submissions require updates. Please review
                  and resubmit.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && submissions.length === 0 && availableForms.length === 0 && (
          <motion.div variants={fadeUp} custom={0}>
            <div className="rounded-xl border border-gcu-cream-dark bg-gcu-cream-dark/50 py-20 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gcu-cream-dark">
                <Inbox className="size-8 text-gcu-brown" />
              </div>
              <h2 className="mt-6 text-lg font-semibold text-gcu-maroon-dark">
                No active forms right now
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gcu-brown">
                There are no active forms available at the moment. Check back later or
                contact an administrator if you expected to see one here.
              </p>
              <Link
                to="/"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'mt-6 border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark hover:text-gcu-maroon-dark',
                )}
              >
                Go to Home
              </Link>
            </div>
          </motion.div>
        )}

        {/* Submissions list */}
        {!isLoading && submissions.length > 0 && (
          <motion.div className="space-y-3" variants={stagger}>
            <motion.h2
              className="text-sm font-medium text-gcu-brown"
              variants={fadeUp}
              custom={0}
            >
              Your Submissions ({submissions.length})
            </motion.h2>
            {submissions.map((submission, i) => {
              const config = statusConfig[submission.status]
              const StatusIcon = config.icon

              return (
                <motion.div key={submission.id} variants={fadeUp} custom={i + 1}>
                  <Card
                    className="cursor-pointer border-gcu-cream-dark/80 transition-all hover:shadow-md hover:shadow-gcu-maroon/5 hover:border-gcu-cream-dark"
                    onClick={() => {
                      if (submission.form) {
                        navigate(
                          submission.status === 'submitted'
                            ? `/submissions/${submission.id}`
                            : `/form/${submission.form.slug}/submissions/${submission.id}/edit`,
                        )
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-gcu-cream-dark">
                            <FileText className="size-4 text-gcu-maroon" />
                          </div>
                          <CardTitle className="text-base">
                            {submission.form?.title ?? 'Untitled Form'}
                          </CardTitle>
                        </div>
                        <Badge variant={config.variant}>
                          <StatusIcon className="mr-1 size-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <CardDescription className="ml-[42px]">
                        {submission.submitted_at
                          ? `Submitted ${new Date(submission.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : `Last updated ${new Date(submission.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="ml-[42px] flex items-center text-xs font-medium text-gcu-maroon">
                        <span>
                          {submission.status === 'update_requested'
                            ? 'Review and update'
                            : 'View details'}
                        </span>
                        <ArrowRight className="ml-1 size-3" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.main>
    </div>
  )
}
