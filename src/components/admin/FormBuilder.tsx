import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Save,
  Loader2,
  Asterisk,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FieldConfig } from '@/components/admin/FieldConfig'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { FormField } from '@/types/database'

// ── Constants ──────────────────────────────────────────────

const FIELD_TYPE_OPTIONS: { value: FormField['field_type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'date', label: 'Date' },
  { value: 'media', label: 'Media Upload' },
]

// ── Sortable field item ────────────────────────────────────

interface SortableFieldProps {
  field: FormField
  onEdit: (field: FormField) => void
  onDelete: (fieldId: string) => void
}

function SortableField({ field, onEdit, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-lg border bg-card p-3 ring-1 ring-transparent transition-shadow',
        isDragging && 'z-10 shadow-lg ring-primary/30',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Field info */}
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <span className="truncate text-sm font-medium">{field.label}</span>
        {field.is_required && (
          <Asterisk className="size-3 shrink-0 text-red-500" />
        )}
      </div>

      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {field.field_type}
      </Badge>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(field)}
        >
          <Pencil className="size-3.5" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button type="button" variant="ghost" size="icon-xs" />
            }
          >
            <Trash2 className="size-3.5 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete field</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{field.label}&rdquo;? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onDelete(field.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// ── FormBuilder ────────────────────────────────────────────

interface FormBuilderProps {
  formId: string
  initialFields: FormField[]
  className?: string
}

export function FormBuilder({ formId, initialFields, className }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(
    [...initialFields].sort((a, b) => a.sort_order - b.sort_order),
  )
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // ── Drag end handler ─────────────────────────────────────

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id)
      const newIndex = prev.findIndex((f) => f.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      // Update sort_order values
      return reordered.map((f, i) => ({ ...f, sort_order: i }))
    })
  }, [])

  // ── Add field ────────────────────────────────────────────

  const addField = useCallback(
    (fieldType: FormField['field_type']) => {
      const now = new Date().toISOString()
      const label = FIELD_TYPE_OPTIONS.find((o) => o.value === fieldType)?.label ?? 'New Field'

      const newField: FormField = {
        id: crypto.randomUUID(),
        form_id: formId,
        field_type: fieldType,
        label: `${label} Field`,
        description: null,
        placeholder: null,
        is_required: false,
        is_sensitive: false,
        validation_rules: null,
        sort_order: fields.length,
        created_at: now,
      }

      setFields((prev) => [...prev, newField])
      setEditingField(newField)
    },
    [formId, fields.length],
  )

  // ── Delete field ─────────────────────────────────────────

  const deleteField = useCallback((fieldId: string) => {
    setFields((prev) =>
      prev
        .filter((f) => f.id !== fieldId)
        .map((f, i) => ({ ...f, sort_order: i })),
    )
    setEditingField((cur) => (cur?.id === fieldId ? null : cur))
  }, [])

  // ── Update field from FieldConfig ────────────────────────

  const updateField = useCallback(
    (updates: Partial<FormField>) => {
      if (!editingField) return
      setFields((prev) =>
        prev.map((f) =>
          f.id === editingField.id ? { ...f, ...updates } : f,
        ),
      )
      setEditingField(null)
    },
    [editingField],
  )

  // ── Save all to Supabase ─────────────────────────────────

  const saveAll = async () => {
    setSaving(true)
    try {
      // Delete existing fields for this form, then insert current set
      const { error: deleteError } = await supabase
        .from('form_fields')
        .delete()
        .eq('form_id', formId)

      if (deleteError) throw deleteError

      if (fields.length > 0) {
        const rows = fields.map((f) => ({
          id: f.id,
          form_id: f.form_id,
          field_type: f.field_type,
          label: f.label,
          description: f.description,
          placeholder: f.placeholder,
          is_required: f.is_required,
          is_sensitive: f.is_sensitive,
          validation_rules: f.validation_rules,
          sort_order: f.sort_order,
        }))

        const { error: insertError } = await supabase
          .from('form_fields')
          .upsert(rows)

        if (insertError) throw insertError
      }
    } catch (err) {
      console.error('Failed to save form fields:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className={cn('space-y-4', className)}>
      {/* Field list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                onEdit={setEditingField}
                onDelete={deleteField}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No fields yet. Add one below to get started.
        </div>
      )}

      {/* Add field + Save */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" size="sm" />}
          >
            <Plus className="size-4" />
            Add Field
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => addField(opt.value)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          size="sm"
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Fields
        </Button>
      </div>

      {/* Field config dialog */}
      <Dialog
        open={!!editingField}
        onOpenChange={(open) => {
          if (!open) setEditingField(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Field</DialogTitle>
          </DialogHeader>
          {editingField && (
            <FieldConfig
              field={editingField}
              onSave={updateField}
              onCancel={() => setEditingField(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
