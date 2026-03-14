import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────

interface ParsedEmail {
  email: string
  valid: boolean
}

interface BulkCsvUploadProps {
  onEmailsParsed: (emails: string[]) => void
  className?: string
}

// ── Helpers ────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function extractEmails(results: Papa.ParseResult<Record<string, string>>): ParsedEmail[] {
  const emails: ParsedEmail[] = []
  const seen = new Set<string>()

  for (const row of results.data) {
    // Try to find an email-like value in any column
    for (const value of Object.values(row)) {
      const trimmed = (value ?? '').trim().toLowerCase()
      if (trimmed && !seen.has(trimmed) && trimmed.includes('@')) {
        seen.add(trimmed)
        emails.push({ email: trimmed, valid: EMAIL_RE.test(trimmed) })
      }
    }
  }

  return emails
}

// ── Component ──────────────────────────────────────────────

export function BulkCsvUpload({ onEmailsParsed, className }: BulkCsvUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedEmail[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    setError(null)
    setParsed([])

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }

    setFileName(file.name)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const emails = extractEmails(results)
        if (emails.length === 0) {
          setError('No email addresses found in the CSV file.')
          return
        }
        setParsed(emails)
        onEmailsParsed(emails.filter((e) => e.valid).map((e) => e.email))
      },
      error(err) {
        setError(`Failed to parse CSV: ${err.message}`)
      },
    })
  }, [onEmailsParsed])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const reset = () => {
    setFileName(null)
    setParsed([])
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const validCount = parsed.filter((e) => e.valid).length
  const invalidCount = parsed.filter((e) => !e.valid).length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
        )}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Drop a CSV file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Accepts .csv files with email addresses
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* File & preview */}
      {fileName && parsed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <span className="font-medium">{fileName}</span>
              <Badge variant="secondary">{validCount} valid</Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">{invalidCount} invalid</Badge>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon-xs" onClick={reset}>
              <X className="size-4" />
            </Button>
          </div>

          {/* Parsed email list */}
          <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
            <ul className="space-y-1">
              {parsed.map((entry, i) => (
                <li
                  key={i}
                  className={cn(
                    'rounded px-2 py-1 text-xs font-mono',
                    entry.valid
                      ? 'text-foreground'
                      : 'bg-destructive/5 text-destructive line-through',
                  )}
                >
                  {entry.email}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
