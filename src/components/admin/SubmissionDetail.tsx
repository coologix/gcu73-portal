import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { FormField, Submission } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

interface FieldValue {
  field: FormField
  value: string | null
  fileUrl: string | null
}

const STATUS_CONFIG: Record<
  Submission['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  update_requested: { label: 'Update Requested', variant: 'destructive' },
}

// ── Masked value component ─────────────────────────────────

function MaskedValue({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false)

  const masked = value.length > 4
    ? '*'.repeat(value.length - 4) + value.slice(-4)
    : '*'.repeat(value.length)

  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-mono text-sm">{revealed ? value : masked}</span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="text-muted-foreground hover:text-foreground"
      >
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────

interface SubmissionDetailProps {
  submissionId: string
  status: Submission['status']
  fieldValues: FieldValue[]
  onBack: () => void
  onRequestUpdate?: (submissionId: string) => Promise<void>
  onMarkComplete?: (submissionId: string) => Promise<void>
  className?: string
}

export function SubmissionDetail({
  submissionId,
  status,
  fieldValues,
  onBack,
  onRequestUpdate,
  onMarkComplete,
  className,
}: SubmissionDetailProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const statusCfg = STATUS_CONFIG[status]

  const handleAction = async (
    action: ((id: string) => Promise<void>) | undefined,
    key: string,
  ) => {
    if (!action) return
    setActionLoading(key)
    try {
      await action(submissionId)
    } finally {
      setActionLoading(null)
    }
  }

  // Find the passport photo field
  const passportField = fieldValues.find(
    (fv) =>
      fv.field.field_type === 'media' &&
      (fv.field.label.toLowerCase().includes('passport') ||
        fv.field.label.toLowerCase().includes('photo')),
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="flex-1 text-lg font-semibold">Submission Detail</h2>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      {/* Passport photo */}
      {passportField?.fileUrl && (
        <Card>
          <CardHeader>
            <CardTitle>{passportField.field.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={passportField.fileUrl}
              alt={passportField.field.label}
              className="h-48 w-auto rounded-lg object-cover"
            />
          </CardContent>
        </Card>
      )}

      {/* Field values */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldValues
            .filter((fv) => fv !== passportField)
            .map((fv) => (
              <div key={fv.field.id}>
                <p className="text-xs font-medium text-muted-foreground">
                  {fv.field.label}
                </p>

                {fv.field.is_sensitive && fv.value ? (
                  <MaskedValue value={fv.value} />
                ) : fv.field.field_type === 'media' && fv.fileUrl ? (
                  <a
                    href={fv.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    View file
                  </a>
                ) : (
                  <p className="text-sm">{fv.value || '--'}</p>
                )}

                <Separator className="mt-3" />
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onRequestUpdate && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction(onRequestUpdate, 'update')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'update' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Request Update
          </Button>
        )}
        {onMarkComplete && (
          <Button
            type="button"
            onClick={() => handleAction(onMarkComplete, 'complete')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'complete' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  )
}
