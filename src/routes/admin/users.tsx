import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Users as UsersIcon, Search, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Profile } from '@/types/database'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

function getInitials(name: string | null): string {
  const source = name?.trim()
  if (!source) return '?'
  return source
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getEmailInitials(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

function formatJoinedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object') {
    const maybeResponse = 'context' in error ? error.context : null

    if (maybeResponse instanceof Response) {
      try {
        const payload = await maybeResponse.clone().json() as {
          error?: string
          message?: string
        }
        if (typeof payload.error === 'string' && payload.error) {
          return payload.error
        }
        if (typeof payload.message === 'string' && payload.message) {
          return payload.message
        }
      } catch {
        try {
          const text = await maybeResponse.clone().text()
          if (text) return text
        } catch {
          // Fall back to the error object's message below.
        }
      }
    }

    if ('message' in error && typeof error.message === 'string' && error.message) {
      return error.message
    }
  }

  return 'Request failed'
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)
  const [roleChangeTargetId, setRoleChangeTargetId] = useState<string | null>(null)

  async function fetchProfiles() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      setProfiles(data ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load users',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchProfiles()
  }, [])

  async function invokeManageAdminAccount(
    body:
      | {
          action: 'invite_admin'
          email: string
          fullName?: string | null
        }
      | {
          action: 'set_role'
          userId: string
          role: Profile['role']
        },
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Your session has expired. Please sign in again.')
    }

    const { data, error } = await supabase.functions.invoke('manage-admin-account', {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      throw new Error(await getFunctionErrorMessage(error))
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    return data
  }

  async function handleCreateAdmin() {
    const email = newAdminEmail.trim().toLowerCase()
    const fullName = newAdminName.trim()

    if (!email) {
      toast.error('Enter an email address for the admin account')
      return
    }

    setIsCreatingAdmin(true)
    try {
      const data = await invokeManageAdminAccount({
        action: 'invite_admin',
        email,
        fullName: fullName || null,
      })

      toast.success(
        data?.message ?? `Admin access created for ${email}`,
      )
      setNewAdminEmail('')
      setNewAdminName('')
      void fetchProfiles()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create admin account',
      )
    } finally {
      setIsCreatingAdmin(false)
    }
  }

  async function handleRoleChange(profile: Profile, nextRole: Profile['role']) {
    if (profile.id === currentUser?.id && nextRole !== 'admin') {
      toast.error('You cannot remove your own admin access')
      return
    }

    setRoleChangeTargetId(profile.id)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', profile.id)
        .select('id')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.id) {
        throw new Error('Profile update did not complete')
      }

      setProfiles((prev) =>
        prev.map((item) =>
          item.id === profile.id ? { ...item, role: nextRole } : item,
        ),
      )
      toast.success(
        `${profile.email} is now ${nextRole === 'admin' ? 'an admin' : 'a user'}`,
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update account role',
      )
    } finally {
      setRoleChangeTargetId(null)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      // 1. Delete all submission_values for this user's submissions
      const { data: subs } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', deleteTarget.id)

      if (subs && subs.length > 0) {
        const subIds = subs.map((s) => s.id)
        await supabase
          .from('submission_values')
          .delete()
          .in('submission_id', subIds)

        // 2. Delete all submissions
        await supabase
          .from('submissions')
          .delete()
          .eq('user_id', deleteTarget.id)
      }

      // 3. Delete notifications for this user
      await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', deleteTarget.id)

      // 4. Delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteTarget.id)

      if (profileError) throw new Error(profileError.message)

      // 5. Delete the auth user via admin API (requires service role - done via edge function or manual)
      // For now, just remove from the UI
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success(`${deleteTarget.full_name || deleteTarget.email} and their submissions have been deleted`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete user',
      )
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const filtered = profiles.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.email.toLowerCase().includes(q) ||
      (p.full_name?.toLowerCase().includes(q) ?? false)
    )
  })

  const adminProfiles = filtered.filter((profile) => profile.role === 'admin')
  const memberProfiles = filtered.filter((profile) => profile.role !== 'admin')

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
    >
      {/* Brand accent bar */}
      <div className="-mx-6 -mt-6 mb-2 h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">Users</h1>
        <p className="text-sm text-gcu-brown">
          Manage administrator accounts and review non-admin signup details
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gcu-brown" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-gcu-cream-dark bg-white pl-9 placeholder:text-gcu-brown/50 focus-visible:border-gcu-maroon/30 focus-visible:ring-gcu-maroon/20"
        />
      </div>

      <Card className="border-gcu-cream-dark">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gcu-maroon-dark">
              Create Admin Account
            </h2>
            <p className="text-sm text-gcu-brown">
              Invite a new admin by email, or upgrade an existing account if that
              email is already registered.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr),auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Patrick Jude Mbano"
                className="border-gcu-cream-dark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="border-gcu-cream-dark"
              />
            </div>
            <Button
              type="button"
              className="bg-gcu-maroon hover:bg-gcu-maroon-light"
              disabled={isCreatingAdmin}
              onClick={handleCreateAdmin}
            >
              {isCreatingAdmin ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 size-4" />
                  Add Admin
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-gcu-cream-dark">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gcu-brown/70">
                Admin Accounts
              </p>
              <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
                {adminProfiles.length}
              </p>
            </div>
            <Badge variant="default">Internal access</Badge>
          </CardContent>
        </Card>
        <Card className="border-gcu-cream-dark">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gcu-brown/70">
                Member Signups
              </p>
              <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
                {memberProfiles.length}
              </p>
            </div>
            <Badge variant="secondary">Non-admin</Badge>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="rounded-lg bg-gcu-cream-dark/30 py-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gcu-cream-dark">
              <UsersIcon className="size-7 text-gcu-brown" />
            </div>
            <p className="mt-4 text-sm font-medium text-gcu-maroon-dark">No users found</p>
            <p className="mt-1 text-xs text-gcu-brown">
              {search
                ? 'Try adjusting your search.'
                : 'No users have registered yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gcu-maroon-dark">
                  Administrators
                </h2>
                <p className="text-sm text-gcu-brown">
                  Internal accounts with access to manage forms, submissions, and users.
                </p>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                {adminProfiles.length} account{adminProfiles.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                {adminProfiles.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gcu-brown">
                    No administrators match this search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden sm:table-cell">Email</TableHead>
                          <TableHead>Access</TableHead>
                          <TableHead className="hidden sm:table-cell">Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminProfiles.map((profile) => {
                          const isSelf = profile.id === currentUser?.id
                          return (
                            <TableRow key={profile.id} className="transition-colors hover:bg-gcu-cream/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-8">
                                    <AvatarImage
                                      src={profile.avatar_url ?? undefined}
                                      alt={profile.full_name ?? profile.email}
                                    />
                                    <AvatarFallback className="text-xs bg-gcu-cream-dark text-gcu-maroon">
                                      {profile.full_name
                                        ? getInitials(profile.full_name)
                                        : getEmailInitials(profile.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-gcu-maroon-dark">
                                      {profile.full_name ?? 'No name set'}
                                    </p>
                                    {!profile.full_name && (
                                      <p className="text-xs text-gcu-brown">
                                        Name not set on profile
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-gcu-brown">
                                {profile.email}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">admin</Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-gcu-brown">
                                {formatJoinedDate(profile.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!isSelf && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                                      disabled={roleChangeTargetId === profile.id}
                                      onClick={() => handleRoleChange(profile, 'user')}
                                    >
                                      {roleChangeTargetId === profile.id ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        'Demote'
                                      )}
                                    </Button>
                                  )}
                                  {!isSelf && (
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => setDeleteTarget(profile)}
                                      title={`Delete ${profile.full_name || profile.email}`}
                                    >
                                      <Trash2 className="size-3.5 text-destructive" />
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
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gcu-maroon-dark">
                  Non-Admin Signups
                </h2>
                <p className="text-sm text-gcu-brown">
                  Signup/profile details supplied by portal members without admin access.
                </p>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
                {memberProfiles.length} member{memberProfiles.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                {memberProfiles.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gcu-brown">
                    No non-admin signups match this search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead className="hidden sm:table-cell">Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberProfiles.map((profile) => {
                          const isSelf = profile.id === currentUser?.id
                          return (
                            <TableRow key={profile.id} className="transition-colors hover:bg-gcu-cream/50">
                              <TableCell className="max-w-[280px]">
                                <p className="truncate font-medium text-gcu-maroon-dark">
                                  {profile.email}
                                </p>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-gcu-brown">
                                {formatJoinedDate(profile.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!isSelf && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                                      disabled={roleChangeTargetId === profile.id}
                                      onClick={() => handleRoleChange(profile, 'admin')}
                                    >
                                      {roleChangeTargetId === profile.id ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        'Make admin'
                                      )}
                                    </Button>
                                  )}
                                  {!isSelf && (
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => setDeleteTarget(profile)}
                                      title={`Delete ${profile.full_name || profile.email}`}
                                    >
                                      <Trash2 className="size-3.5 text-destructive" />
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
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {!isLoading && (
        <p className="text-xs text-gcu-brown">
          {adminProfiles.length} admin account{adminProfiles.length !== 1 ? 's' : ''} and{' '}
          {memberProfiles.length} non-admin signup{memberProfiles.length !== 1 ? 's' : ''}
          {search ? ' matching your search' : ' in total'}
        </p>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>{' '}
              and all their form submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User & Submissions'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
