import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Copy, Send, Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendSingleInvitation } from '@/lib/admin-invitations'
import type { Form } from '@/types/database'

interface QuickInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  forms: Form[]
  currentUserId: string
  onInviteSent?: () => void
}

export function QuickInviteDialog({
  open,
  onOpenChange,
  forms,
  currentUserId,
  onInviteSent,
}: QuickInviteDialogProps) {
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id ?? '')
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [manualInviteLink, setManualInviteLink] = useState<string | null>(null)

  useEffect(() => {
    if (!forms.length) {
      setSelectedFormId('')
      return
    }

    const hasSelectedForm = forms.some((form) => form.id === selectedFormId)
    if (!selectedFormId || !hasSelectedForm) {
      setSelectedFormId(forms[0].id)
    }
  }, [forms, selectedFormId])

  useEffect(() => {
    if (!open) {
      setEmail('')
      setManualInviteLink(null)
    }
  }, [open])

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) ?? null,
    [forms, selectedFormId],
  )

  async function handleSendInvite() {
    if (!selectedForm || !email.trim()) return

    setIsSending(true)
    setManualInviteLink(null)

    try {
      const result = await sendSingleInvitation({
        email,
        formId: selectedForm.id,
        formTitle: selectedForm.title,
        currentUserId,
      })

      if (result.status === 'duplicate') {
        toast.warning(`An invitation is already pending for ${result.email}`)
        return
      }

      onInviteSent?.()

      if (result.emailSent) {
        toast.success(`Invitation email sent to ${result.email}`)
        onOpenChange(false)
        return
      }

      setManualInviteLink(result.inviteLink)
      toast.success(`Invitation created for ${result.email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsSending(false)
    }
  }

  async function handleCopyManualLink() {
    if (!manualInviteLink) return
    await navigator.clipboard.writeText(manualInviteLink)
    toast.success('Invite link copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl border-gcu-cream-dark p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-gcu-cream-dark bg-gradient-to-br from-white via-gcu-cream/40 to-gcu-cream px-6 py-5">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-gcu-maroon/8 text-gcu-maroon">
            <Mail className="size-5" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gcu-maroon-dark">
            Invite One Member
          </DialogTitle>
          <DialogDescription className="max-w-lg text-gcu-brown">
            Choose a form and send a secure invitation without leaving the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {!forms.length ? (
            <div className="rounded-xl border border-dashed border-gcu-cream-dark bg-gcu-cream/40 px-4 py-6 text-center">
              <p className="text-sm font-medium text-gcu-maroon-dark">
                No active forms available
              </p>
              <p className="mt-1 text-sm text-gcu-brown">
                Create or reactivate a form before sending invitations.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)]">
                <div className="space-y-2">
                  <Label htmlFor="dashboard-invite-form">Form</Label>
                  <select
                    id="dashboard-invite-form"
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gcu-cream-dark bg-white px-3 text-sm outline-none focus-visible:border-gcu-maroon/30 focus-visible:ring-3 focus-visible:ring-gcu-maroon/20"
                  >
                    {forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboard-invite-email">Recipient email</Label>
                  <Input
                    id="dashboard-invite-email"
                    type="email"
                    placeholder="member@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleSendInvite()
                      }
                    }}
                    className="h-11 border-gcu-cream-dark"
                  />
                </div>
              </div>

              {selectedForm && (
                <div className="rounded-xl border border-gcu-cream-dark bg-gcu-cream/40 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                    Selected form
                  </p>
                  <p className="mt-1 text-sm font-medium text-gcu-maroon-dark">
                    {selectedForm.title}
                  </p>
                </div>
              )}

              {manualInviteLink && (
                <div className="rounded-xl border border-gcu-gold/40 bg-gcu-cream px-4 py-4">
                  <p className="text-sm font-medium text-gcu-maroon-dark">
                    Email could not be delivered
                  </p>
                  <p className="mt-1 text-sm text-gcu-brown">
                    The invitation was created. Copy the secure link below and share it manually.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input value={manualInviteLink} readOnly className="h-10 border-gcu-cream-dark bg-white" />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                      onClick={() => void handleCopyManualLink()}
                    >
                      <Copy className="mr-1.5 size-4" />
                      Copy link
                    </Button>
                  </div>
                </div>
              )}

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
                  disabled={isSending || !email.trim() || !selectedForm}
                  onClick={() => void handleSendInvite()}
                >
                  {isSending ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 size-4" />
                  )}
                  Send invitation
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
