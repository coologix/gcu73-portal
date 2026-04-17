import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Bell,
  Send,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Notification } from '@/types/database'

type NotificationType = Notification['type']

const typeLabels: Record<NotificationType, string> = {
  update_request: 'Update Request',
  info: 'Information',
  reminder: 'Reminder',
  system: 'System',
}

export default function NotificationsPage() {
  const { user } = useAuth()

  // Composer state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [notificationType, setNotificationType] =
    useState<NotificationType>('info')
  const [isSending, setIsSending] = useState(false)

  // Sent notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw new Error(error.message)
        setNotifications(data ?? [])
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Failed to load notifications',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void fetchNotifications()
  }, [])

  // ── Send notification ──────────────────────────────────────

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!title.trim() || !message.trim() || !recipientEmail.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    // Look up recipient profile
    setIsSending(true)
    try {
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail.trim().toLowerCase())
        .single()

      if (profileError || !recipientProfile) {
        toast.error('Recipient not found. Please check the email address.')
        return
      }

      const { error } = await supabase.from('notifications').insert({
        recipient_id: recipientProfile.id,
        sender_id: user!.id,
        type: notificationType,
        title: title.trim(),
        message: message.trim(),
      })

      if (error) throw new Error(error.message)

      toast.success('Notification sent!')

      // Reset form
      setTitle('')
      setMessage('')
      setRecipientEmail('')

      // Refresh list
      const { data: updated } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(updated ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send notification',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Send notifications to users and view history
        </p>
      </div>

      {/* Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send Notification</CardTitle>
          <CardDescription>
            Compose and send a notification to a user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient Email</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="user@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-type">Type</Label>
                <select
                  id="notification-type"
                  value={notificationType}
                  onChange={(e) =>
                    setNotificationType(e.target.value as NotificationType)
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {(
                    Object.entries(typeLabels) as [NotificationType, string][]
                  ).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-title">Title</Label>
              <Input
                id="notification-title"
                placeholder="Notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="bg-slate-900 hover:bg-slate-800"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 size-3.5" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Sent notifications list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Sent Notifications</h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3 w-72" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              Sent notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card key={n.id} size="sm">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {n.title}
                        </p>
                        <Badge variant="secondary" className="shrink-0">
                          {typeLabels[n.type]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {n.is_read ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    ) : (
                      <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
