import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FormField, SubmissionValue } from '@/types/database'
import type { SubmissionWithValues } from '@/lib/export-csv'

// ── Types ──────────────────────────────────────────────────

export interface PDFExportOptions {
  /** When false, sensitive field values are replaced with [REDACTED]. Default: false */
  includeSensitive?: boolean
}

// ── Helpers ────────────────────────────────────────────────

function indexValues(
  values: SubmissionValue[],
): Map<string, SubmissionValue> {
  const map = new Map<string, SubmissionValue>()
  for (const v of values) {
    map.set(v.field_id, v)
  }
  return map
}

function cellValue(
  field: FormField,
  sv: SubmissionValue | undefined,
  includeSensitive: boolean,
): string {
  if (!sv) return ''
  if (field.is_sensitive && !includeSensitive) return '[REDACTED]'
  if (field.field_type === 'media') return sv.file_url ?? ''
  return sv.value ?? ''
}

// ── Export function ────────────────────────────────────────

/**
 * Exports submissions as a PDF table and triggers a browser download.
 *
 * @param submissions - Submissions with nested `submission_values`
 * @param fields      - The ordered form fields (used for column headers)
 * @param formTitle   - Title displayed at the top of the document
 * @param options     - Export options
 */
export function exportSubmissionsToPDF(
  submissions: SubmissionWithValues[],
  fields: FormField[],
  formTitle: string,
  options: PDFExportOptions = {},
): void {
  const { includeSensitive = false } = options

  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  const head = [sorted.map((f) => f.label)]

  const body = submissions.map((sub) => {
    const valueMap = indexValues(sub.submission_values)
    return sorted.map((field) =>
      cellValue(field, valueMap.get(field.id), includeSensitive),
    )
  })

  const doc = new jsPDF({ orientation: 'landscape' })

  // Title
  doc.setFontSize(16)
  doc.text(formTitle, 14, 18)

  // Table
  autoTable(doc, {
    startY: 26,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  doc.save(`${formTitle.replace(/\s+/g, '_')}_submissions.pdf`)
}
