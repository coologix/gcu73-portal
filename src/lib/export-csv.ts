import Papa from 'papaparse'
import type { FormField, Submission, SubmissionValue } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

export interface CSVExportOptions {
  /** When false, sensitive field values are replaced with [REDACTED]. Default: false */
  includeSensitive?: boolean
}

// ── Helpers ────────────────────────────────────────────────

/** Index submission values by field_id for O(1) lookup */
function indexValues(
  values: SubmissionValue[],
): Map<string, SubmissionValue> {
  const map = new Map<string, SubmissionValue>()
  for (const v of values) {
    map.set(v.field_id, v)
  }
  return map
}

/** Resolve display value for a cell */
function cellValue(
  field: FormField,
  sv: SubmissionValue | undefined,
  includeSensitive: boolean,
): string {
  if (!sv) return ''

  // Sensitive field redaction
  if (field.is_sensitive && !includeSensitive) return '[REDACTED]'

  // Media fields display their file URL
  if (field.field_type === 'media') return sv.file_url ?? ''

  return sv.value ?? ''
}

// ── Export function ────────────────────────────────────────

export interface SubmissionWithValues extends Submission {
  submission_values: SubmissionValue[]
}

/**
 * Exports an array of submissions to a CSV file and triggers a browser download.
 *
 * @param submissions  - Submissions with nested `submission_values`
 * @param fields       - The ordered form fields (used for headers)
 * @param options      - Export options
 */
export function exportSubmissionsToCSV(
  submissions: SubmissionWithValues[],
  fields: FormField[],
  options: CSVExportOptions = {},
): void {
  const { includeSensitive = false } = options

  // Sort fields by sort_order so columns are deterministic
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  // Build header row from field labels
  const headers = sorted.map((f) => f.label)

  // Build data rows
  const rows = submissions.map((sub) => {
    const valueMap = indexValues(sub.submission_values)
    return sorted.map((field) =>
      cellValue(field, valueMap.get(field.id), includeSensitive),
    )
  })

  // Generate CSV string
  const csv = Papa.unparse({
    fields: headers,
    data: rows,
  })

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'submissions.csv'
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
