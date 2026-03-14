import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Form } from '@/types/database'

type ExportFormat = 'csv' | 'json'

export default function ExportPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    async function fetchForms() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .order('title', { ascending: true })

        if (error) throw new Error(error.message)
        setForms(data ?? [])
        if (data && data.length > 0) {
          setSelectedFormId(data[0].id)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load forms')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchForms()
  }, [])

  // ── Export handler ─────────────────────────────────────────

  async function handleExport() {
    if (!selectedFormId) {
      toast.error('Please select a form to export')
      return
    }

    setIsExporting(true)
    try {
      // Fetch form fields
      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', selectedFormId)
        .order('sort_order', { ascending: true })

      if (fieldsError) throw new Error(fieldsError.message)

      // Fetch submissions
      const { data: submissions, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('form_id', selectedFormId)
        .eq('status', 'submitted')

      if (subsError) throw new Error(subsError.message)

      if (!submissions || submissions.length === 0) {
        toast.info('No submitted data to export for this form.')
        return
      }

      const submitterIds = [...new Set(submissions.map((submission) => submission.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', submitterIds)

      if (profilesError) throw new Error(profilesError.message)

      // Fetch all submission values
      const subIds = submissions.map((s) => s.id)
      const { data: values, error: valsError } = await supabase
        .from('submission_values')
        .select('*')
        .in('submission_id', subIds)

      if (valsError) throw new Error(valsError.message)

      // Build export data
      const fieldLabels = (fields ?? []).map((f) => f.label)
      const fieldIds = (fields ?? []).map((f) => f.id)
      const profileMap = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile]),
      )

      const rows = submissions.map((sub) => {
        const subValues = (values ?? []).filter(
          (v) => v.submission_id === sub.id,
        )
        const valueMap = new Map(subValues.map((v) => [v.field_id, v]))
        const submitter = profileMap.get(sub.user_id)

        const row: Record<string, string> = {
          'Submitted By': submitter?.full_name || submitter?.email || sub.user_id,
          'Submitted At': sub.submitted_at ?? '',
        }

        for (let i = 0; i < fieldIds.length; i++) {
          const val = valueMap.get(fieldIds[i])
          row[fieldLabels[i]] = val?.file_url ?? val?.value ?? ''
        }

        return row
      })

      // Generate file content
      let content: string
      let mimeType: string
      let extension: string

      if (exportFormat === 'csv') {
        const headers = Object.keys(rows[0])
        const csvRows = [
          headers.map((h) => `"${h}"`).join(','),
          ...rows.map((row) =>
            headers
              .map((h) => `"${(row[h] ?? '').replace(/"/g, '""')}"`)
              .join(','),
          ),
        ]
        content = csvRows.join('\n')
        mimeType = 'text/csv'
        extension = 'csv'
      } else {
        content = JSON.stringify(rows, null, 2)
        mimeType = 'application/json'
        extension = 'json'
      }

      // Trigger download
      const selectedForm = forms.find((f) => f.id === selectedFormId)
      const fileName = `${selectedForm?.slug ?? 'export'}-${new Date().toISOString().slice(0, 10)}.${extension}`

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${rows.length} records as ${extension.toUpperCase()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-sm text-muted-foreground">
          Download submission data in CSV or JSON format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Settings</CardTitle>
          <CardDescription>
            Choose a form and format, then download the submitted data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form selection */}
          <div className="space-y-2">
            <Label htmlFor="export-form">Form</Label>
            {isLoading ? (
              <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <select
                id="export-form"
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {forms.length === 0 && (
                  <option value="">No forms available</option>
                )}
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`flex flex-1 items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  exportFormat === 'csv'
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                    : 'hover:bg-muted/50'
                }`}
              >
                <FileSpreadsheet
                  className={`size-5 ${
                    exportFormat === 'csv'
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Spreadsheet-compatible
                  </p>
                </div>
                {exportFormat === 'csv' && (
                  <CheckCircle2 className="ml-auto size-4 text-amber-600" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`flex flex-1 items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  exportFormat === 'json'
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                    : 'hover:bg-muted/50'
                }`}
              >
                <FileText
                  className={`size-5 ${
                    exportFormat === 'json'
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">JSON</p>
                  <p className="text-xs text-muted-foreground">
                    Developer-friendly
                  </p>
                </div>
                {exportFormat === 'json' && (
                  <CheckCircle2 className="ml-auto size-4 text-amber-600" />
                )}
              </button>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              className="bg-slate-900 hover:bg-slate-800"
              size="sm"
              disabled={isExporting || !selectedFormId}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 size-3.5" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
