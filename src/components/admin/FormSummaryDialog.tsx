import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Loader2, Share2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { fetchFormShareSummary, type FormShareSummary } from '@/lib/form-share-summary'

interface SummaryDialogForm {
  id: string
  title: string
}

interface FormSummaryDialogProps {
  form: SummaryDialogForm | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isSuperAdmin: boolean
}

interface SummaryStat {
  label: string
  value: string | number
}

export function FormSummaryDialog({
  form,
  open,
  onOpenChange,
  isSuperAdmin,
}: FormSummaryDialogProps) {
  const [summary, setSummary] = useState<FormShareSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !form) return

    let cancelled = false

    async function loadSummary() {
      setIsLoading(true)

      try {
        const nextSummary = await fetchFormShareSummary(form, isSuperAdmin)
        if (!cancelled) {
          setSummary(nextSummary)
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to load form summary',
          )
          setSummary(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [form, open, isSuperAdmin])

  useEffect(() => {
    if (!open) {
      setSummary(null)
      setIsLoading(false)
    }
  }, [open])

  async function handleCopySummary() {
    if (!summary) return

    await navigator.clipboard.writeText(summary.shareText)
    toast.success('Form summary copied to clipboard')
  }

  const stats: SummaryStat[] = summary
    ? [
        { label: 'Accounts', value: summary.accountCount },
        {
          label: 'Started',
          value:
            summary.startRate !== null
              ? `${summary.startedCount} (${summary.startRate}%)`
              : `${summary.startedCount} (N/A)`,
        },
        {
          label: 'Completed',
          value:
            summary.completionRate !== null
              ? `${summary.completedCount} (${summary.completionRate}%)`
              : `${summary.completedCount} (N/A)`,
        },
        { label: 'Pending', value: summary.pendingCount },
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-3xl border-gcu-cream-dark p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-gcu-cream-dark bg-gradient-to-br from-white via-gcu-cream/50 to-gcu-cream px-6 py-5">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-gcu-maroon/8 text-gcu-maroon">
            <Share2 className="size-5" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gcu-maroon-dark">
            Share Form Summary
          </DialogTitle>
          <DialogDescription className="text-gcu-brown">
            Copy a WhatsApp-ready update.
          </DialogDescription>
          {form && (
            <p
              className="max-w-2xl truncate text-sm font-medium text-gcu-maroon-dark"
              title={form.title}
            >
              {form.title}
            </p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-gcu-brown" />
            </div>
          ) : !summary ? (
            <div className="rounded-xl border border-dashed border-gcu-cream-dark bg-gcu-cream/40 px-4 py-12 text-center">
              <p className="text-sm font-medium text-gcu-maroon-dark">
                No summary available yet
              </p>
              <p className="mt-1 text-sm text-gcu-brown">
                Open the dialog again after account activity has been recorded.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-gcu-cream-dark bg-gcu-cream/30 px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                    Snapshot
                  </p>
                  <p className="mt-1 text-sm font-medium text-gcu-maroon-dark">
                    As of {summary.generatedAtLabel}
                  </p>
                </div>
                <p className="text-xs text-gcu-brown">
                  Shareable summary for quick follow-up
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <Card key={stat.label} className="rounded-2xl border-gcu-cream-dark shadow-none">
                    <CardContent className="space-y-1 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-semibold text-gcu-maroon-dark">
                        {stat.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),minmax(0,1.02fr)]">
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gcu-maroon-dark">
                      Completed accounts
                    </h3>
                    <p className="text-xs text-gcu-brown">
                      Profile name is preferred, then submitted name fields, then email. Dates use the submitted date when available.
                    </p>
                  </div>

                  {summary.completedEntries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gcu-cream-dark bg-gcu-cream/30 px-4 py-6 text-sm text-gcu-brown">
                      No completed accounts available yet.
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-2xl border border-gcu-cream-dark bg-white p-3">
                      {summary.completedEntries.slice(0, 8).map((entry) => (
                        <div
                          key={`${entry.name}-${entry.completedAt}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gcu-cream-dark bg-gcu-cream/20 px-3 py-2"
                        >
                          <Badge
                            variant="outline"
                            className="border-gcu-cream-dark bg-gcu-cream/40 text-gcu-maroon-dark"
                          >
                            {entry.name}
                          </Badge>
                          <span className="shrink-0 text-xs font-medium text-gcu-brown">
                            {entry.completedDateLabel}
                          </span>
                        </div>
                      ))}
                      {summary.completedEntries.length > 8 && (
                        <p className="px-1 pt-1 text-xs text-gcu-brown">
                          {summary.completedEntries.length - 8} more completed accounts in the copied summary.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gcu-maroon-dark">
                      Pending accounts
                    </h3>
                    <p className="text-xs text-gcu-brown">
                      Includes accounts that have not completed. Email is shown for follow-up.
                    </p>
                  </div>

                  {summary.pendingEntries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gcu-cream-dark bg-gcu-cream/30 px-4 py-6 text-sm text-gcu-brown">
                      No pending accounts.
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-2xl border border-gcu-cream-dark bg-white p-3">
                      {summary.pendingEntries.slice(0, 8).map((entry, index) => (
                        <div
                          key={`${entry.email || entry.displayName || 'pending'}-${index}`}
                          className="flex flex-col gap-2 rounded-xl border border-gcu-cream-dark bg-gcu-cream/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gcu-maroon-dark">
                              {entry.email || entry.displayName || 'Unknown account'}
                            </p>
                            {entry.displayName && entry.email && (
                              <p className="truncate text-xs text-gcu-brown">
                                {entry.displayName}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <Badge
                              variant="outline"
                              className="border-gcu-cream-dark bg-white text-gcu-brown"
                            >
                              {entry.statusLabel}
                            </Badge>
                            {entry.activityDateLabel && (
                              <span className="text-xs font-medium text-gcu-brown">
                                {entry.activityDateLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {summary.pendingEntries.length > 8 && (
                        <p className="px-1 pt-1 text-xs text-gcu-brown">
                          {summary.pendingEntries.length - 8} more pending accounts in the copied summary.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gcu-maroon-dark">
                      WhatsApp-ready text
                    </h3>
                    <p className="text-xs text-gcu-brown">
                      Copy this message and paste it directly into WhatsApp.
                    </p>
                  </div>

                  <Textarea
                    value={summary.shareText}
                    readOnly
                    className="min-h-[420px] border-gcu-cream-dark bg-white text-sm leading-6"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gcu-cream-dark pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  className="bg-gcu-maroon hover:bg-gcu-maroon-light"
                  onClick={() => void handleCopySummary()}
                >
                  <Copy className="mr-1.5 size-4" />
                  Copy summary
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
