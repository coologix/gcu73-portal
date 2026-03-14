import { useState, useMemo } from 'react'
import { Send, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

type RecipientMode = 'all' | 'update_requested' | 'individual'

interface NotificationComposerProps {
  senderId: string
  users: Pick<Profile, 'id' | 'email' | 'full_name'>[]
  formId?: string
  /** When true, also sets the submission status to 'update_requested' */
  isUpdateRequest?: boolean
  className?: string
  onSent?: () => void
}

// ── Component ──────────────────────────────────────────────

export function NotificationComposer({
  senderId,
  users,
  formId,
  isUpdateRequest = false,
  className,
  onSent,
}: NotificationComposerProps) {
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [title, setTitle] = useState(isUpdateRequest ? 'Update Requested' : '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Filter users for individual search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const q = userSearch.toLowerCase()
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false),
    )
  }, [users, userSearch])

  // Determine recipients
  const recipientIds = useMemo((): string[] => {
    switch (recipientMode) {
      case 'all':
        return users.map((u) => u.id)
      case 'update_requested':
        // This is a placeholder -- in practice, the parent passes pre-filtered users
        return users.map((u) => u.id)
      case 'individual':
        return selectedUserId ? [selectedUserId] : []
    }
  }, [recipientMode, users, selectedUserId])

  const canSend = title.trim() && message.trim() && recipientIds.length > 0

  // ── Send handler ─────────────────────────────────────────

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)

    try {
      // Insert notification records
      const rows = recipientIds.map((recipientId) => ({
        recipient_id: recipientId,
        sender_id: senderId,
        type: (isUpdateRequest ? 'update_request' : 'info') as const,
        title: title.trim(),
        message: message.trim(),
        form_id: formId ?? null,
      }))

      const { error } = await supabase.from('notifications').insert(rows)
      if (error) throw error

      // Optionally update submission status for update_request
      if (isUpdateRequest && formId) {
        const { error: updateError } = await supabase
          .from('submissions')
          .update({ status: 'update_requested' as const })
          .eq('form_id', formId)
          .in('user_id', recipientIds)

        if (updateError) {
          console.error('Failed to update submission status:', updateError)
        }
      }

      // Reset form
      setTitle(isUpdateRequest ? 'Update Requested' : '')
      setMessage('')
      setSelectedUserId('')
      onSent?.()
    } catch (err) {
      console.error('Failed to send notifications:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Recipient selector */}
      <div className="space-y-2">
        <Label>Recipients</Label>
        <select
          value={recipientMode}
          onChange={(e) => {
            setRecipientMode(e.target.value as RecipientMode)
            setSelectedUserId('')
          }}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Users</option>
          <option value="update_requested">Users Needing Update</option>
          <option value="individual">Individual User</option>
        </select>
      </div>

      {/* Individual user search */}
      {recipientMode === 'individual' && (
        <div className="space-y-2">
          <Label>Search User</Label>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search className="size-4" />
            </InputGroupAddon>
            <Input
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0"
            />
          </InputGroup>

          <div className="max-h-40 overflow-y-auto rounded-lg border">
            {filteredUsers.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                No users found.
              </p>
            ) : (
              <ul className="divide-y">
                {filteredUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                        selectedUserId === u.id && 'bg-primary/10',
                      )}
                    >
                      <span className="truncate font-medium">
                        {u.full_name ?? 'Unnamed'}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="nc-title">Title</Label>
        <Input
          id="nc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="nc-message">Message</Label>
        <Textarea
          id="nc-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message..."
          rows={4}
        />
      </div>

      {/* Recipient count + Send */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {recipientIds.length} recipient{recipientIds.length !== 1 ? 's' : ''}
        </p>
        <Button type="button" onClick={handleSend} disabled={!canSend || sending}>
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send Notification
        </Button>
      </div>
    </div>
  )
}
