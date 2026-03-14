import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  Send,
  Loader2,
  RotateCcw,
  XCircle,
  Mail,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BulkCsvUpload } from '@/components/admin/BulkCsvUpload'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Form, Invitation } from '@/types/database'

// ── Status config ──────────────────────────────────────────

const INVITATION_STATUS: Record<
  Invitation['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'outline' },
  completed: { label: 'Completed', variant: 'default' },
  expired: { label: 'Expired', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

// ── Component ──────────────────────────────────────────────

interface InvitationManagerProps {
  forms: Form[]
  currentUserId: string
  className?: string
}

export function InvitationManager({
  forms,
  currentUserId,
  className,
}: InvitationManagerProps) {
  // ── Shared state ─────────────────────────────────────────
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id ?? '')

  // ── Single invite state ──────────────────────────────────
  const [singleEmail, setSingleEmail] = useState('')
  const [sendingSingle, setSendingSingle] = useState(false)

  // ── Bulk invite state ────────────────────────────────────
  const [bulkEmails, setBulkEmails] = useState<string[]>([])
  const [sendingBulk, setSendingBulk] = useState(false)

  // ── Invitation list state ────────────────────────────────
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // ── Fetch invitations ────────────────────────────────────

  const fetchInvitations = useCallback(async () => {
    setLoadingList(true)
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvitations(data ?? [])
    } catch (err) {
      console.error('Failed to fetch invitations:', err)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void fetchInvitations()
  }, [fetchInvitations])

  // ── Send single invite ───────────────────────────────────

  const sendSingleInvite = async () => {
    if (!singleEmail.trim() || !selectedFormId) return
    setSendingSingle(true)
    try {
      const { error } = await supabase.from('invitations').insert({
        email: singleEmail.trim().toLowerCase(),
        form_id: selectedFormId,
        token: crypto.randomUUID(),
        invited_by: currentUserId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (error) throw error
      setSingleEmail('')
      void fetchInvitations()
    } catch (err) {
      console.error('Failed to send invitation:', err)
    } finally {
      setSendingSingle(false)
    }
  }

  // ── Send bulk invites ────────────────────────────────────

  const sendBulkInvites = async () => {
    if (bulkEmails.length === 0 || !selectedFormId) return
    setSendingBulk(true)
    try {
      const rows = bulkEmails.map((email) => ({
        email,
        form_id: selectedFormId,
        token: crypto.randomUUID(),
        invited_by: currentUserId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))

      const { error } = await supabase.from('invitations').insert(rows)
      if (error) throw error
      setBulkEmails([])
      void fetchInvitations()
    } catch (err) {
      console.error('Failed to send bulk invitations:', err)
    } finally {
      setSendingBulk(false)
    }
  }

  // ── Resend invite ────────────────────────────────────────

  const resendInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'pending' as const,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', id)
      if (error) throw error
      void fetchInvitations()
    } catch (err) {
      console.error('Failed to resend invitation:', err)
    }
  }

  // ── Cancel invite ────────────────────────────────────────

  const cancelInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' as const })
        .eq('id', id)
      if (error) throw error
      void fetchInvitations()
    } catch (err) {
      console.error('Failed to cancel invitation:', err)
    }
  }

  // ── Form selector ───────────────────────────────────────

  const FormSelector = () => (
    <div className="space-y-2">
      <Label htmlFor="inv-form">Form</Label>
      <select
        id="inv-form"
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
  )

  // ── Render ───────────────────────────────────────────────

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single Invite</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Invite</TabsTrigger>
          <TabsTrigger value="list">All Invitations</TabsTrigger>
        </TabsList>

        {/* Tab 1: Single invite */}
        <TabsContent value="single">
          <div className="space-y-4 pt-4">
            <FormSelector />

            <div className="space-y-2">
              <Label htmlFor="inv-email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="user@example.com"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void sendSingleInvite()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={sendSingleInvite}
                  disabled={sendingSingle || !singleEmail.trim()}
                >
                  {sendingSingle ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Bulk invite */}
        <TabsContent value="bulk">
          <div className="space-y-4 pt-4">
            <FormSelector />

            <BulkCsvUpload onEmailsParsed={setBulkEmails} />

            {bulkEmails.length > 0 && (
              <Button
                type="button"
                onClick={sendBulkInvites}
                disabled={sendingBulk}
                className="w-full"
              >
                {sendingBulk ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                Send {bulkEmails.length} Invitation{bulkEmails.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Invitation list */}
        <TabsContent value="list">
          <div className="pt-4">
            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No invitations sent yet.
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => {
                      const sCfg = INVITATION_STATUS[inv.status]
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.email}</TableCell>
                          <TableCell>
                            <Badge variant={sCfg.variant}>{sCfg.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(inv.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(inv.expires_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {inv.status === 'pending' && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => resendInvite(inv.id)}
                                    title="Resend"
                                  >
                                    <RotateCcw className="size-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => cancelInvite(inv.id)}
                                    title="Cancel"
                                  >
                                    <XCircle className="size-3.5 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {(inv.status === 'expired' || inv.status === 'cancelled') && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => resendInvite(inv.id)}
                                  title="Resend"
                                >
                                  <RotateCcw className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
