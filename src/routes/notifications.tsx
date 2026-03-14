import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bell, CheckCheck, Clock, Loader2, MailWarning } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Notification } from '@/types/database'

const typeLabels: Record<Notification['type'], string> = {
  update_request: 'Update Request',
  info: 'Information',
  reminder: 'Reminder',
  system: 'System',
}

function emitNotificationsUpdated() {
  window.dispatchEvent(new Event('gcu73:notifications-updated'))
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      setNotifications(data ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load notifications',
      )
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

  async function markAsRead(notificationId: string) {
    setUpdatingIds((current) => [...current, notificationId])
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      if (error) throw new Error(error.message)

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification,
        ),
      )
      emitNotificationsUpdated()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update notification',
      )
    } finally {
      setUpdatingIds((current) => current.filter((id) => id !== notificationId))
    }
  }

  async function markAllAsRead() {
    if (!user || unreadCount === 0) return

    setMarkingAllRead(true)
    try {
      const readAt = new Date().toISOString()
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: readAt,
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (error) throw new Error(error.message)

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at ?? readAt,
        })),
      )
      emitNotificationsUpdated()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to mark notifications as read',
      )
    } finally {
      setMarkingAllRead(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">
            Notifications
          </h1>
          <p className="text-sm text-gcu-brown">
            Stay on top of updates related to your submissions.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={unreadCount === 0 || markingAllRead}
          onClick={() => void markAllAsRead()}
        >
          {markingAllRead ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-1.5 size-4" />
          )}
          Mark all as read
        </Button>
      </div>

      <Card className="border-gcu-cream-dark">
        <CardHeader>
          <CardTitle className="text-base">Inbox</CardTitle>
          <CardDescription>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[12rem] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg bg-gcu-cream-dark/40 py-16 text-center">
              <Bell className="mx-auto size-10 text-gcu-brown" />
              <p className="mt-4 text-sm font-medium text-gcu-maroon-dark">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-gcu-brown">
                You will see update requests and reminders here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const isUpdating = updatingIds.includes(notification.id)

                return (
                  <div
                    key={notification.id}
                    className="rounded-lg border border-gcu-cream-dark p-4 transition-colors hover:bg-gcu-cream/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gcu-maroon-dark">
                            {notification.title}
                          </p>
                          <Badge
                            variant={notification.is_read ? 'secondary' : 'default'}
                          >
                            {typeLabels[notification.type]}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-gcu-brown">
                          {notification.message}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {new Date(notification.created_at).toLocaleDateString(
                              'en-GB',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </span>
                          {notification.is_read && notification.read_at && (
                            <span>
                              Read{' '}
                              {new Date(notification.read_at).toLocaleDateString(
                                'en-GB',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {!notification.is_read && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => void markAsRead(notification.id)}
                        >
                          {isUpdating ? (
                            <Loader2 className="mr-1.5 size-4 animate-spin" />
                          ) : (
                            <MailWarning className="mr-1.5 size-4" />
                          )}
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
