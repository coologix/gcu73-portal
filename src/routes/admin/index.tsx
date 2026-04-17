import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Users,
  FileText,
  Mail,
  TrendingUp,
  ArrowRight,
  Download,
  Send,
  Inbox,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { fetchSuperAdminIdentitySets, normalizeEmail } from '@/lib/staff'
import { cn } from '@/lib/utils'
import { QuickInviteDialog } from '@/components/admin/QuickInviteDialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { Form } from '@/types/database'

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

interface DashboardStats {
  totalMembers: number
  totalSubmissions: number
  pendingInvitations: number
  completionRate: number
}

interface RecentSubmission {
  id: string
  form_id: string
  user_id: string
  submitter_name: string
  status: string
  created_at: string
  form_title: string
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, isSuperAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const superAdminIdentitySets = await fetchSuperAdminIdentitySets(isSuperAdmin)

      const [profilesRes, submissionsRes, invitationsRes, formsRes] = await Promise.all([
        supabase.from('profiles').select('id, role'),
        supabase.from('submissions').select('id, user_id, status'),
        supabase
          .from('invitations')
          .select('id, email')
          .eq('status', 'pending'),
        supabase
          .from('forms')
          .select('*')
          .eq('is_active', true)
          .order('title', { ascending: true }),
      ])

      if (profilesRes.error) throw new Error(profilesRes.error.message)
      if (submissionsRes.error) throw new Error(submissionsRes.error.message)
      if (invitationsRes.error) throw new Error(invitationsRes.error.message)
      if (formsRes.error) throw new Error(formsRes.error.message)

      setForms(formsRes.data ?? [])

      const metricProfiles = (profilesRes.data ?? []).filter(
        (profile) => !superAdminIdentitySets.userIds.has(profile.id),
      )
      const metricSubmissions = (submissionsRes.data ?? []).filter(
        (submission) => !superAdminIdentitySets.userIds.has(submission.user_id),
      )
      const submittedUserIds = new Set(
        metricSubmissions
          ?.filter((submission) => submission.status === 'submitted')
          .map((submission) => submission.user_id) ?? [],
      )

      const eligibleMembers =
        metricProfiles.filter(
          (profile) => profile.role !== 'admin' || submittedUserIds.has(profile.id),
        )

      const totalMembers = eligibleMembers.length
      const totalSubmissions = metricSubmissions.length
      const pendingInvitations = (invitationsRes.data ?? []).filter(
        (invitation) => !superAdminIdentitySets.emails.has(normalizeEmail(invitation.email)),
      ).length

      const completedMemberCount = eligibleMembers.filter((profile) =>
        submittedUserIds.has(profile.id),
      ).length

      const completionRate =
        totalMembers > 0
          ? Math.round((completedMemberCount / totalMembers) * 100)
          : 0

      setStats({
        totalMembers,
        totalSubmissions,
        pendingInvitations,
        completionRate,
      })

      const { data: recent } = await supabase
        .from('submissions')
        .select('id, user_id, status, created_at, form_id')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recent && recent.length > 0) {
        const formIds = [...new Set(recent.map((r) => r.form_id))]
        const submitterIds = [...new Set(recent.map((r) => r.user_id))]
        const { data: recentForms } = await supabase
          .from('forms')
          .select('id, title')
          .in('id', formIds)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', submitterIds)

        const formMap = new Map(recentForms?.map((f) => [f.id, f.title]) ?? [])
        const profileMap = new Map(profiles?.map((profile) => [profile.id, profile]) ?? [])

        setRecentSubmissions(
          recent.map((r) => ({
            id: r.id,
            form_id: r.form_id,
            user_id: r.user_id,
            submitter_name:
              profileMap.get(r.user_id)?.full_name ||
              profileMap.get(r.user_id)?.email ||
              r.user_id,
            status: r.status,
            created_at: r.created_at,
            form_title: formMap.get(r.form_id) ?? 'Unknown Form',
          })),
        )
      } else {
        setRecentSubmissions([])
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load dashboard data',
      )
    } finally {
      setIsLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    void fetchDashboardData()
  }, [fetchDashboardData])

  const statCards = stats
    ? [
        {
          label: 'Total Members',
          value: stats.totalMembers,
          icon: Users,
          color: 'text-gcu-maroon',
          bg: 'bg-gcu-cream-dark',
          accent: 'border-b-gcu-maroon',
          href: '/admin/users' as string | null,
        },
        {
          label: 'Submissions',
          value: stats.totalSubmissions,
          icon: FileText,
          color: 'text-gcu-red',
          bg: 'bg-gcu-pink-light',
          accent: 'border-b-gcu-red',
          href: '/admin/forms' as string | null,
        },
        {
          label: 'Pending Invitations',
          value: stats.pendingInvitations,
          icon: Mail,
          color: 'text-gcu-brown',
          bg: 'bg-gcu-cream',
          accent: 'border-b-gcu-gold',
          href: '/admin/invitations' as string | null,
        },
        {
          label: 'Completion Rate',
          value: `${stats.completionRate}%`,
          icon: TrendingUp,
          color: 'text-gcu-gold',
          bg: 'bg-gcu-cream-dark',
          accent: 'border-b-gcu-gold-light',
          href: null,
        },
      ]
    : []

  const quickActions = [
    {
      href: '/admin/invitations',
      icon: Inbox,
      title: 'Manage Invitations',
      description: 'Review status, resend links, and track invitation history',
    },
    {
      href: null,
      onClick: () => setIsInviteDialogOpen(true),
      icon: Send,
      title: 'Invite One Member',
      description: 'Open a quick-send modal without leaving the dashboard',
      disabled: !user || forms.length === 0,
    },
    {
      href: '/admin/forms',
      icon: FileText,
      title: 'View Forms',
      description: 'Manage data collection forms',
    },
    {
      href: '/admin/export',
      icon: Download,
      title: 'Export Data',
      description: 'Download submissions and reports',
    },
  ]

  return (
    <div className="space-y-8">
      {user && (
        <QuickInviteDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          forms={forms}
          currentUserId={user.id}
          onInviteSent={() => {
            void fetchDashboardData()
          }}
        />
      )}

      {/* Brand accent bar */}
      <div className="-mx-6 -mt-6 mb-2 h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gcu-brown">
          Overview of the GCU &apos;73 Portal activity
        </p>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div key={stat.label} variants={fadeUp} custom={i}>
                  <Card
                    className={cn(
                      'border-b-2 transition-shadow hover:shadow-md hover:shadow-gcu-maroon/5',
                      stat.accent,
                      stat.href && 'cursor-pointer',
                    )}
                    onClick={stat.href ? () => navigate(stat.href!) : undefined}
                  >
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gcu-brown">{stat.label}</p>
                        <div
                          className={cn('flex size-10 items-center justify-center rounded-xl', stat.bg)}
                        >
                          <Icon className={cn('size-5', stat.color)} />
                        </div>
                      </div>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-gcu-maroon-dark">
                        {stat.value}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
      </motion.div>

      {/* Quick actions + recent activity */}
      <motion.div
        className="grid gap-6 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Quick actions */}
        <motion.div variants={fadeUp} custom={0} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base text-gcu-maroon-dark">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => {
                const ActionIcon = action.icon
                const cardClassName = cn(
                  'group flex items-start gap-3 rounded-lg border border-gcu-cream-dark bg-white p-3 text-left transition-all hover:border-gcu-cream-dark hover:bg-gcu-cream/50 hover:shadow-sm',
                  action.disabled && 'cursor-not-allowed opacity-50 hover:bg-white hover:shadow-none',
                )

                if (action.href) {
                  return (
                    <Link
                      key={action.title}
                      to={action.href}
                      className={cardClassName}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gcu-cream-dark text-gcu-maroon transition-colors group-hover:bg-gcu-maroon group-hover:text-white">
                        <ActionIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gcu-maroon-dark">
                          {action.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gcu-brown">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-gcu-brown/40 transition-transform group-hover:translate-x-0.5 group-hover:text-gcu-maroon" />
                    </Link>
                  )
                }

                return (
                  <button
                    key={action.title}
                    type="button"
                    className={cardClassName}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gcu-cream-dark text-gcu-maroon transition-colors group-hover:bg-gcu-maroon group-hover:text-white">
                      <ActionIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gcu-maroon-dark">
                        {action.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gcu-brown">
                        {action.description}
                      </p>
                      {action.disabled && (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                          No active forms
                        </p>
                      )}
                    </div>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-gcu-brown/40 transition-transform group-hover:translate-x-0.5 group-hover:text-gcu-maroon" />
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div variants={fadeUp} custom={1} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base text-gcu-maroon-dark">Recent Activity</CardTitle>
              <CardDescription>Latest submissions across all forms</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-1 h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSubmissions.length === 0 ? (
                <div className="rounded-lg bg-gcu-cream-dark/50 py-12 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gcu-cream-dark">
                    <Inbox className="size-6 text-gcu-brown" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gcu-maroon-dark">
                    No submissions yet
                  </p>
                  <p className="mt-1 text-xs text-gcu-brown">
                    Submissions will appear here once members start responding.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSubmissions.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        navigate(`/admin/forms/${sub.form_id}/submissions/${sub.id}`)
                      }
                      className="group flex w-full items-center justify-between rounded-lg border border-gcu-cream-dark p-3 text-left transition-colors hover:bg-gcu-cream/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gcu-maroon/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gcu-maroon-dark">
                          {sub.submitter_name}
                        </p>
                        <p className="text-xs text-gcu-brown">
                          {sub.form_title} &middot;{' '}
                          {new Date(sub.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <Badge
                          variant={
                            sub.status === 'submitted'
                              ? 'default'
                              : sub.status === 'update_requested'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {sub.status.replace('_', ' ')}
                        </Badge>
                        <ArrowRight className="size-4 text-gcu-brown/40 transition-transform group-hover:translate-x-0.5 group-hover:text-gcu-maroon" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
