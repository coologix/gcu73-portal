import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Search,
  FileText,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { Form, Submission } from '@/types/database'

interface SubmissionListItem extends Submission {
  submitterName: string
  submitterEmail: string
}

type StatusFilter = 'all' | Submission['status']

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'update_requested', label: 'Update Requested' },
]

export default function SubmissionsPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<Form | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<SubmissionListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!formId) return

    async function fetchData() {
      setIsLoading(true)
      try {
        // Fetch form
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId!)
          .single()

        if (formError) throw new Error(formError.message)
        setForm(formData)

        // Fetch submissions
        const { data: subs, error: subsError } = await supabase
          .from('submissions')
          .select('*')
          .eq('form_id', formId!)
          .order('created_at', { ascending: false })

        if (subsError) throw new Error(subsError.message)

        const nextSubmissions = subs ?? []
        if (nextSubmissions.length === 0) {
          setSubmissions([])
          return
        }

        const submitterIds = [...new Set(nextSubmissions.map((submission) => submission.user_id))]
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', submitterIds)

        if (profilesError) throw new Error(profilesError.message)

        const profileMap = new Map(
          (profiles ?? []).map((profile) => [profile.id, profile]),
        )

        setSubmissions(
          nextSubmissions.map((submission) => {
            const profile = profileMap.get(submission.user_id)
            return {
              ...submission,
              submitterName:
                profile?.full_name || profile?.email || submission.user_id,
              submitterEmail: profile?.email ?? '',
            }
          }),
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load submissions',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [formId])

  // Filter submissions
  const filtered = submissions.filter((sub) => {
    const matchesStatus =
      statusFilter === 'all' || sub.status === statusFilter
    const matchesSearch =
      !search ||
      sub.submitterName.toLowerCase().includes(search.toLowerCase()) ||
      sub.submitterEmail.toLowerCase().includes(search.toLowerCase()) ||
      sub.id.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  async function handleDeleteSubmission() {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw new Error(error.message)

      setSubmissions((prev) => prev.filter((submission) => submission.id !== deleteTarget.id))
      toast.success('Submission deleted')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete submission',
      )
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null)
          }
        }}
        title="Delete submission"
        description={
          deleteTarget
            ? `Delete the submission from ${deleteTarget.submitterName}. This will permanently remove all saved responses for this form.`
            : 'Delete this submission.'
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete submission'}
        onConfirm={handleDeleteSubmission}
        variant="destructive"
      />

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('/admin/forms')}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to forms</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="text-sm text-muted-foreground">
            {form?.title ?? 'Loading...'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1.5">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">No submissions found</p>
              <p className="text-xs text-muted-foreground">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No one has submitted this form yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium">{sub.submitterName}</p>
                        {sub.submitterEmail && (
                          <p className="text-xs text-muted-foreground">
                            {sub.submitterEmail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {sub.submitted_at
                        ? new Date(sub.submitted_at).toLocaleDateString(
                            'en-GB',
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          )
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.updated_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/forms/${formId}/submissions/${sub.id}`} className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}>
                          View
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(sub)}
                          title={`Delete submission from ${sub.submitterName}`}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Count summary */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {submissions.length} submission
          {submissions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
