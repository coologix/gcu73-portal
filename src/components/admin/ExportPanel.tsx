import { useState, useEffect } from 'react'
import { Download, Loader2, AlertTriangle, FileSpreadsheet, FileText } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Form, FormField } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

type ExportFormat = 'csv' | 'pdf'

interface ExportPanelProps {
  forms: Form[]
  className?: string
}

// ── Component ──────────────────────────────────────────────

export function ExportPanel({ forms, className }: ExportPanelProps) {
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id ?? '')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [includeSensitive, setIncludeSensitive] = useState(false)
  const [fields, setFields] = useState<FormField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Fetch fields when form changes
  useEffect(() => {
    if (!selectedFormId) return

    let cancelled = false
    setLoadingFields(true)

    supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', selectedFormId)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to fetch fields:', error)
        } else {
          setFields(data ?? [])
        }
        setLoadingFields(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedFormId])

  // Fields that will be exported
  const exportableFields = includeSensitive
    ? fields
    : fields.filter((f) => !f.is_sensitive)

  const sensitiveCount = fields.filter((f) => f.is_sensitive).length

  // ── Export handler ───────────────────────────────────────

  const handleExport = async () => {
    if (!selectedFormId || exportableFields.length === 0) return
    setExporting(true)

    try {
      if (format === 'csv') {
        const { exportSubmissionsToCSV } = await import('@/lib/export-csv')
        await exportSubmissionsToCSV(selectedFormId, exportableFields, includeSensitive)
      } else {
        const { exportSubmissionsToPDF } = await import('@/lib/export-pdf')
        await exportSubmissionsToPDF(selectedFormId, exportableFields, includeSensitive)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Form selector */}
      <div className="space-y-2">
        <Label htmlFor="exp-form">Form</Label>
        <select
          id="exp-form"
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </div>

      {/* Format selector */}
      <div className="space-y-2">
        <Label>Format</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormat('csv')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              format === 'csv'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <FileSpreadsheet className="size-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => setFormat('pdf')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              format === 'pdf'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <FileText className="size-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Sensitive data toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="exp-sensitive">Include Sensitive Data</Label>
          <Switch
            id="exp-sensitive"
            checked={includeSensitive}
            onCheckedChange={(checked) => setIncludeSensitive(Boolean(checked))}
          />
        </div>
        {includeSensitive && sensitiveCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            Export will include {sensitiveCount} sensitive field
            {sensitiveCount !== 1 ? 's' : ''} (e.g. NIN, BVN). Handle with care.
          </div>
        )}
      </div>

      <Separator />

      {/* Preview of fields to export */}
      <div className="space-y-2">
        <Label>Fields to Export</Label>
        {loadingFields ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : exportableFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No fields to export.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {exportableFields.map((f) => (
              <Badge key={f.id} variant="secondary" className="text-[10px]">
                {f.label}
                {f.is_sensitive && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">*</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Download button */}
      <Button
        type="button"
        className="w-full"
        onClick={handleExport}
        disabled={exporting || exportableFields.length === 0}
      >
        {exporting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Download {format.toUpperCase()}
      </Button>
    </div>
  )
}
