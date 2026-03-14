import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { InvitationManager } from '@/components/admin/InvitationManager'
import type { Form, Invitation } from '@/types/database'

const statusVariantMap: Record<
  Invitation['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  completed: 'default',
  expired: 'secondary',
  cancelled: 'destructive',
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [invRes, formsRes] = await Promise.all([
          supabase
            .from('invitations')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('forms')
            .select('*')
            .eq('is_active', true)
            .order('title', { ascending: true }),
        ])

        if (invRes.error) throw new Error(invRes.error.message)
        if (formsRes.error) throw new Error(formsRes.error.message)

        setInvitations(invRes.data ?? [])
        setForms(formsRes.data ?? [])
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load invitations',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [])

  const filtered = invitations.filter((inv) => {
    if (!search) return true
    return inv.email.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track member invitations
          </p>
        </div>
      </div>

      {/* Invitation Manager - Send new invitations */}
      {!isLoading && user && forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send Invitations</CardTitle>
            <CardDescription>
              Invite members individually or in bulk via CSV upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationManager
              forms={forms}
              currentUserId={user.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Stats row */}
      {!isLoading && (
        <div className="flex flex-wrap gap-3">
          {(['pending', 'completed', 'expired', 'cancelled'] as const).map(
            (status) => {
              const count = invitations.filter(
                (inv) => inv.status === status,
              ).length
              return (
                <div
                  key={status}
                  className="rounded-lg border px-3 py-2 text-center"
                >
                  <p className="text-lg font-semibold">{count}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {status}
                  </p>
                </div>
              )
            },
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">No invitations found</p>
              <p className="text-xs text-muted-foreground">
                {search
                  ? 'Try adjusting your search.'
                  : 'No invitations have been sent yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Sent</TableHead>
                    <TableHead className="hidden sm:table-cell">Expires</TableHead>
                    <TableHead className="hidden sm:table-cell">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[inv.status]}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(inv.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(inv.expires_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {inv.completed_at
                          ? new Date(inv.completed_at).toLocaleDateString(
                              'en-GB',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              },
                            )
                          : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} invitation{filtered.length !== 1 ? 's' : ''}
          {search ? ' matching your search' : ' total'}
        </p>
      )}
    </div>
  )
}
