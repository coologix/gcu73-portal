import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Send,
  Loader2,
  RotateCcw,
  XCircle,
  Mail,
  Trash2,
  Copy,
  Inbox,
  RefreshCw,
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
import { sendSingleInvitation } from '@/lib/admin-invitations'
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

type InvitationTab = 'list' | 'single' | 'bulk'

function normalizeInvitationTab(value: string | null): InvitationTab {
  return value === 'single' || value === 'bulk' || value === 'list'
    ? value
    : 'list'
}

export function InvitationManager({
  forms,
  currentUserId,
  className,
}: InvitationManagerProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Shared state ─────────────────────────────────────────
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id ?? '')
  const [activeTab, setActiveTab] = useState<InvitationTab>(() =>
    normalizeInvitationTab(searchParams.get('tab')),
  )
  const [listSearch, setListSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Invitation['status']>('all')
  const [listFormFilter, setListFormFilter] = useState('all')

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

  useEffect(() => {
    setActiveTab(normalizeInvitationTab(searchParams.get('tab')))
  }, [searchParams])

  const formTitleMap = useMemo(
    () => new Map(forms.map((form) => [form.id, form.title])),
    [forms],
  )

  const pendingCount = invitations.filter((invitation) => invitation.status === 'pending').length
  const completedCount = invitations.filter((invitation) => invitation.status === 'completed').length
  const needsAttentionCount = invitations.filter((invitation) =>
    invitation.status === 'expired' || invitation.status === 'cancelled',
  ).length

  const filteredInvitations = useMemo(() => {
    return invitations.filter((invitation) => {
      const matchesSearch = !listSearch
        || invitation.email.toLowerCase().includes(listSearch.trim().toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || invitation.status === statusFilter
      const matchesForm =
        listFormFilter === 'all' || invitation.form_id === listFormFilter

      return matchesSearch && matchesStatus && matchesForm
    })
  }, [invitations, listSearch, listFormFilter, statusFilter])

  const hasListFilters =
    listSearch.trim().length > 0 || statusFilter !== 'all' || listFormFilter !== 'all'

  function handleTabChange(nextTab: string) {
    const normalized = normalizeInvitationTab(nextTab)
    setActiveTab(normalized)

    const nextParams = new URLSearchParams(searchParams)
    if (normalized === 'list') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', normalized)
    }
    setSearchParams(nextParams, { replace: true })
  }

  function resetListFilters() {
    setListSearch('')
    setStatusFilter('all')
    setListFormFilter('all')
  }

  // ── Send single invite ───────────────────────────────────

  const sendSingleInvite = async () => {
    const email = singleEmail.trim().toLowerCase()
    if (!email || !selectedFormId) return
    setSendingSingle(true)
    try {
      const formTitle = forms.find(f => f.id === selectedFormId)?.title ?? ''
      const result = await sendSingleInvitation({
        email,
        formId: selectedFormId,
        formTitle,
        currentUserId,
      })

      if (result.status === 'duplicate') {
        toast.warning(`An invitation is already pending for ${result.email}`)
      } else if (!result.emailSent) {
        toast.success(
          `Invitation created for ${result.email}`,
          { description: `Email could not be sent. Share this link: ${result.inviteLink}` },
        )
      } else {
        toast.success(`Invitation email sent to ${result.email}`)
      }

      if (result.status === 'sent') {
        setSingleEmail('')
        void fetchInvitations()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSendingSingle(false)
    }
  }

  // ── Send bulk invites ────────────────────────────────────

  const sendBulkInvites = async () => {
    if (bulkEmails.length === 0 || !selectedFormId) return
    setSendingBulk(true)
    try {
      // Check existing pending invitations
      const { data: existing } = await supabase
        .from('invitations')
        .select('email')
        .eq('form_id', selectedFormId)
        .eq('status', 'pending')

      const existingEmails = new Set(existing?.map(e => e.email) ?? [])
      const newEmails = bulkEmails.filter(e => !existingEmails.has(e))

      if (newEmails.length === 0) {
        toast.warning('All these emails already have pending invitations.')
        setSendingBulk(false)
        return
      }

      const skipped = bulkEmails.length - newEmails.length

      const rows = newEmails.map((email) => ({
        email,
        form_id: selectedFormId,
        token: crypto.randomUUID(),
        invited_by: currentUserId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }))

      const { error } = await supabase.from('invitations').insert(rows)
      if (error) throw error

      toast.success(`${newEmails.length} invitation${newEmails.length !== 1 ? 's' : ''} created${skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''}`)

      setBulkEmails([])
      void fetchInvitations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setSendingBulk(false)
    }
  }

  // ── Resend invite ────────────────────────────────────────

  const resendInvite = async (id: string) => {
    try {
      const inv = invitations.find(i => i.id === id)
      if (!inv) return
      const newToken = crypto.randomUUID()
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'pending' as const,
          token: newToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', id)
      if (error) throw error

      // Send invitation email via edge function
      const formTitle = forms.find(f => f.id === inv.form_id)?.title ?? ''
      const { error: fnError } = await supabase.functions.invoke('send-invitation-email', {
        body: { email: inv.email, token: newToken, formTitle, callerUserId: currentUserId },
      })

      const link = `${window.location.origin}/invite?token=${newToken}`
      void navigator.clipboard.writeText(link)

      if (fnError) {
        toast.success(
          `Invitation renewed for ${inv.email}`,
          { description: 'Email failed — link copied to clipboard' },
        )
      } else {
        toast.success(`Invitation email resent to ${inv.email}`)
      }

      void fetchInvitations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend')
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
      toast.success('Invitation cancelled')
      void fetchInvitations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel')
    }
  }

  // ── Delete invite ──────────────────────────────────────

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id)
      if (error) throw error
      setInvitations((prev) => prev.filter((i) => i.id !== id))
      toast.success('Invitation deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
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
        className="h-10 w-full rounded-lg border border-gcu-cream-dark bg-white px-3 text-sm outline-none focus-visible:border-gcu-maroon/30 focus-visible:ring-3 focus-visible:ring-gcu-maroon/20"
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
      <div className="rounded-xl border border-gcu-cream-dark bg-gcu-cream/30 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gcu-maroon-dark">
              Invitation workspace
            </p>
            <p className="max-w-2xl text-sm text-gcu-brown">
              Start with the full invitation list, then jump into single or bulk send
              when you need to create new invitations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeTab === 'list' ? 'default' : 'outline'}
              className={cn(
                activeTab === 'list'
                  ? 'bg-gcu-maroon hover:bg-gcu-maroon-light'
                  : 'border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark',
              )}
              onClick={() => handleTabChange('list')}
            >
              <Inbox className="mr-1.5 size-4" />
              All invitations
            </Button>
            <Button
              type="button"
              variant={activeTab === 'single' ? 'default' : 'outline'}
              className={cn(
                activeTab === 'single'
                  ? 'bg-gcu-maroon hover:bg-gcu-maroon-light'
                  : 'border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark',
              )}
              onClick={() => handleTabChange('single')}
            >
              <Send className="mr-1.5 size-4" />
              Invite one
            </Button>
            <Button
              type="button"
              variant={activeTab === 'bulk' ? 'default' : 'outline'}
              className={cn(
                activeTab === 'bulk'
                  ? 'bg-gcu-maroon hover:bg-gcu-maroon-light'
                  : 'border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark',
              )}
              onClick={() => handleTabChange('bulk')}
            >
              <Mail className="mr-1.5 size-4" />
              Bulk invite
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-gcu-brown hover:bg-gcu-cream-dark hover:text-gcu-maroon"
              onClick={() => void fetchInvitations()}
            >
              <RefreshCw className="mr-1.5 size-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gcu-cream-dark bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
              Pending
            </p>
            <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
              {pendingCount}
            </p>
            <p className="text-xs text-gcu-brown">Awaiting member action</p>
          </div>
          <div className="rounded-lg border border-gcu-cream-dark bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
              Completed
            </p>
            <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
              {completedCount}
            </p>
            <p className="text-xs text-gcu-brown">Finished through the portal</p>
          </div>
          <div className="rounded-lg border border-gcu-cream-dark bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
              Needs Attention
            </p>
            <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
              {needsAttentionCount}
            </p>
            <p className="text-xs text-gcu-brown">Expired or cancelled invitations</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="list">All Invitations</TabsTrigger>
          <TabsTrigger value="single">Single Invite</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Invite</TabsTrigger>
        </TabsList>

        {/* Tab 1: Single invite */}
        <TabsContent value="single">
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border border-gcu-cream-dark bg-white p-4">
              <p className="text-sm font-medium text-gcu-maroon-dark">
                Send one invitation
              </p>
              <p className="mt-1 text-sm text-gcu-brown">
                Choose a form, enter one email address, and send a secure invitation link.
              </p>
            </div>
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
                  className="min-w-32 bg-gcu-maroon hover:bg-gcu-maroon-light"
                >
                  {sendingSingle ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Send invite
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Bulk invite */}
        <TabsContent value="bulk">
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border border-gcu-cream-dark bg-white p-4">
              <p className="text-sm font-medium text-gcu-maroon-dark">
                Send invitations in bulk
              </p>
              <p className="mt-1 text-sm text-gcu-brown">
                Upload a CSV of email addresses and the system will skip duplicates that
                already have a pending invitation for the selected form.
              </p>
            </div>
            <FormSelector />

            <BulkCsvUpload onEmailsParsed={setBulkEmails} />

            {bulkEmails.length > 0 && (
              <Button
                type="button"
                onClick={sendBulkInvites}
                disabled={sendingBulk}
                className="w-full bg-gcu-maroon hover:bg-gcu-maroon-light"
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
          <div className="space-y-4 pt-4">
            <div className="grid gap-3 rounded-lg border border-gcu-cream-dark bg-white p-4 lg:grid-cols-[minmax(0,1.5fr),minmax(0,0.8fr),minmax(0,1fr),auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="invite-search">Search invitations</Label>
                <Input
                  id="invite-search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Filter by email address"
                  className="border-gcu-cream-dark"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-status-filter">Status</Label>
                <select
                  id="invite-status-filter"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | Invitation['status'])
                  }
                  className="h-10 w-full rounded-lg border border-gcu-cream-dark bg-white px-3 text-sm outline-none focus-visible:border-gcu-maroon/30 focus-visible:ring-3 focus-visible:ring-gcu-maroon/20"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-form-filter">Form</Label>
                <select
                  id="invite-form-filter"
                  value={listFormFilter}
                  onChange={(e) => setListFormFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gcu-cream-dark bg-white px-3 text-sm outline-none focus-visible:border-gcu-maroon/30 focus-visible:ring-3 focus-visible:ring-gcu-maroon/20"
                >
                  <option value="all">All forms</option>
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                  onClick={resetListFilters}
                  disabled={!hasListFilters}
                >
                  Clear filters
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gcu-brown">
                {filteredInvitations.length} invitation
                {filteredInvitations.length !== 1 ? 's' : ''} shown
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                Default view: all invitation history
              </p>
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No invitations sent yet.
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center">
                <p className="text-sm font-medium text-gcu-maroon-dark">
                  No invitations match these filters
                </p>
                <p className="mt-1 text-sm text-gcu-brown">
                  Clear the filters or switch to a send tab to create a new invitation.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Form</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.map((inv) => {
                      const sCfg = INVITATION_STATUS[inv.status]
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.email}</TableCell>
                          <TableCell className="hidden lg:table-cell text-gcu-brown">
                            {formTitleMap.get(inv.form_id) ?? 'Unknown form'}
                          </TableCell>
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
                                    onClick={() => {
                                      const link = `${window.location.origin}/invite?token=${inv.token}`
                                      void navigator.clipboard.writeText(link)
                                      toast.success('Invite link copied to clipboard')
                                    }}
                                    title="Copy invite link"
                                  >
                                    <Copy className="size-3.5" />
                                  </Button>
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => deleteInvite(inv.id)}
                                title="Delete"
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
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
