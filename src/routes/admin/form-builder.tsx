import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormBuilder } from '@/components/admin/FormBuilder'
import type { Form, FormField } from '@/types/database'

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isNew = id === 'new'
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)

  // New form creation state
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isNew || !id) return

    async function fetchForm() {
      setIsLoading(true)
      try {
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', id!)
          .single()

        if (formError) throw new Error(formError.message)
        setForm(formData)

        const { data: fieldsData, error: fieldsError } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', id!)
          .order('sort_order', { ascending: true })

        if (fieldsError) throw new Error(fieldsError.message)
        setFields(fieldsData ?? [])
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load form')
        navigate('/admin/forms', { replace: true })
      } finally {
        setIsLoading(false)
      }
    }

    void fetchForm()
  }, [id, isNew, navigate])

  // Auto-generate slug from title
  function handleTitleChange(value: string) {
    setNewTitle(value)
    setNewSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
  }

  async function handleCreateForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!newTitle.trim() || !newSlug.trim()) {
      toast.error('Title and slug are required')
      return
    }

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: newTitle.trim(),
          slug: newSlug.trim(),
          description: newDescription.trim(),
          created_by: user!.id,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      toast.success('Form created')
      navigate(`/admin/forms/${data.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create form')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? 'Create Form' : `Edit: ${form?.title ?? 'Form'}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? 'Design a new data collection form'
              : `${fields.length} field${fields.length !== 1 ? 's' : ''} configured`}
          </p>
        </div>
      </div>

      {isNew ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Form Details</CardTitle>
            <CardDescription>
              Provide basic information for your form. You can add fields after creating it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-title">Title</Label>
                <Input
                  id="form-title"
                  placeholder="e.g. Member Registration"
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-slug">Slug</Label>
                <Input
                  id="form-slug"
                  placeholder="e.g. member-registration"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier. Auto-generated from the title.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  placeholder="Briefly describe the purpose of this form..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 size-4" />
                      Create Form
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : form ? (
        <FormBuilder formId={form.id} initialFields={fields} />
      ) : null}
    </div>
  )
}
