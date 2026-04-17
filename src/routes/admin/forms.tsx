import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  ArrowRight,
  Share2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { fetchSuperAdminIdentitySets } from '@/lib/staff'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormSummaryDialog } from '@/components/admin/FormSummaryDialog'
import type { Form } from '@/types/database'

// ── Animation helpers ────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

interface FormWithCounts extends Form {
  fieldCount: number
  submissionCount: number
}

export default function FormsPage() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const [forms, setForms] = useState<FormWithCounts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [summaryForm, setSummaryForm] = useState<Pick<Form, 'id' | 'title'> | null>(null)

  const fetchForms = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      if (!data || data.length === 0) {
        setForms([])
        return
      }

      const formIds = data.map((form) => form.id)
      const superAdminIdentitySets = await fetchSuperAdminIdentitySets(isSuperAdmin)

      const [fieldsRes, subsRes] = await Promise.all([
        supabase
          .from('form_fields')
          .select('id, form_id')
          .in('form_id', formIds),
        supabase
          .from('submissions')
          .select('id, form_id, user_id')
          .in('form_id', formIds),
      ])

      if (fieldsRes.error) throw new Error(fieldsRes.error.message)
      if (subsRes.error) throw new Error(subsRes.error.message)

      const fieldCountByFormId = new Map<string, number>()
      for (const field of fieldsRes.data ?? []) {
        fieldCountByFormId.set(
          field.form_id,
          (fieldCountByFormId.get(field.form_id) ?? 0) + 1,
        )
      }

      const submissionCountByFormId = new Map<string, number>()
      for (const submission of subsRes.data ?? []) {
        if (superAdminIdentitySets.userIds.has(submission.user_id)) {
          continue
        }

        submissionCountByFormId.set(
          submission.form_id,
          (submissionCountByFormId.get(submission.form_id) ?? 0) + 1,
        )
      }

      const enriched = data.map((form) => ({
        ...form,
        fieldCount: fieldCountByFormId.get(form.id) ?? 0,
        submissionCount: submissionCountByFormId.get(form.id) ?? 0,
      }))

      setForms(enriched)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load forms')
    } finally {
      setIsLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    void fetchForms()
  }, [fetchForms])

  async function handleDelete(formId: string) {
    if (!confirm('Are you sure you want to delete this form? This cannot be undone.')) {
      return
    }

    setDeletingId(formId)
    try {
      const { error } = await supabase.from('forms').delete().eq('id', formId)
      if (error) throw new Error(error.message)

      setForms((prev) => prev.filter((f) => f.id !== formId))
      toast.success('Form deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete form')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
    >
      <FormSummaryDialog
        form={summaryForm}
        open={summaryForm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSummaryForm(null)
          }
        }}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Brand accent bar */}
      <div className="-mx-6 -mt-6 mb-2 h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">Forms</h1>
          <p className="text-sm text-gcu-brown">
            Manage your data collection forms
          </p>
        </div>
        <Link
          to="/admin/forms/new"
          className={cn(
            buttonVariants({ size: 'sm' }),
            'bg-gcu-maroon hover:bg-gcu-maroon-light',
          )}
        >
          <Plus className="mr-1.5 size-4" />
          Create Form
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-lg bg-gcu-cream-dark/30 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gcu-cream-dark">
                <FileText className="size-7 text-gcu-brown" />
              </div>
              <p className="mt-4 text-sm font-medium text-gcu-maroon-dark">No forms yet</p>
              <p className="mt-1 text-xs text-gcu-brown">
                Create your first form to start collecting data.
              </p>
              <Link
                to="/admin/forms/new"
                className={cn(
                  buttonVariants({ size: 'sm', variant: 'outline' }),
                  'mt-4 border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark',
                )}
              >
                <Plus className="mr-1.5 size-4" />
                Create Form
              </Link>
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:p-6">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="rounded-2xl border border-gcu-cream-dark bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <h2
                            className="truncate text-lg font-semibold text-gcu-maroon-dark"
                            title={form.title}
                          >
                            {form.title}
                          </h2>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <code className="rounded-md bg-gcu-cream-dark px-2 py-1 text-xs text-gcu-brown">
                              {form.slug}
                            </code>
                            <Badge variant={form.is_active ? 'default' : 'secondary'}>
                              {form.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-sm">
                        <div className="rounded-xl border border-gcu-cream-dark bg-gcu-cream/20 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                            Fields
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
                            {form.fieldCount}
                          </p>
                        </div>
                        <div className="rounded-xl border border-gcu-cream-dark bg-gcu-cream/20 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                            Submissions
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
                            {form.submissionCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                        onClick={() =>
                          setSummaryForm({
                            id: form.id,
                            title: form.title,
                          })
                        }
                      >
                        <Share2 className="mr-1.5 size-4" />
                        Share summary
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                        onClick={() =>
                          navigate(`/admin/forms/${form.id}/submissions`)
                        }
                      >
                        View submissions
                        <ArrowRight className="ml-1.5 size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-gcu-brown hover:text-gcu-maroon"
                        onClick={() =>
                          navigate(`/admin/forms/${form.id}`)
                        }
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={deletingId === form.id}
                        onClick={() => handleDelete(form.id)}
                      >
                        {deletingId === form.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5 text-destructive" />
                        )}
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
