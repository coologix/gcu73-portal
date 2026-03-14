import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  const [forms, setForms] = useState<FormWithCounts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchForms() {
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

      // Fetch field counts and submission counts in parallel
      const enriched = await Promise.all(
        data.map(async (form) => {
          const [fieldsRes, subsRes] = await Promise.all([
            supabase
              .from('form_fields')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id),
            supabase
              .from('submissions')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id),
          ])

          return {
            ...form,
            fieldCount: fieldsRes.count ?? 0,
            submissionCount: subsRes.count ?? 0,
          }
        }),
      )

      setForms(enriched)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load forms')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchForms()
  }, [])

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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Fields</TableHead>
                    <TableHead className="text-right">Submissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id} className="transition-colors hover:bg-gcu-cream/50">
                      <TableCell className="font-medium text-gcu-maroon-dark">
                        <span className="line-clamp-2">{form.title}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="rounded bg-gcu-cream-dark px-1.5 py-0.5 text-xs text-gcu-brown">
                          {form.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.is_active ? 'default' : 'secondary'}>
                          {form.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{form.fieldCount}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-gcu-cream-dark px-2.5 py-1 text-sm font-semibold text-gcu-maroon-dark">
                          {form.submissionCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
