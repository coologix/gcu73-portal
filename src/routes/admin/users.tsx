import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Users as UsersIcon, Search, Trash2, Plus, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { getRoleLabel } from '@/lib/staff'
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

type StaffInviteRole = Extract<Profile['role'], 'admin' | 'super_admin'>

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

interface ProfileSectionProps {
  title: string
  description: string
  profiles: Profile[]
  emptyState: string
  currentUserId?: string
  roleChangeTargetId: string | null
  canPromoteToSuperAdmin: boolean
  onRoleChange: (profile: Profile, nextRole: Profile['role']) => void
  onDelete: (profile: Profile) => void
}

function ProfileSection({
  title,
  description,
  profiles,
  emptyState,
  currentUserId,
  roleChangeTargetId,
  canPromoteToSuperAdmin,
  onRoleChange,
  onDelete,
}: ProfileSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gcu-maroon-dark">
            {title}
          </h2>
          <p className="text-sm text-gcu-brown">{description}</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-gcu-brown/70">
          {profiles.length} account{profiles.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {profiles.length === 0 ? (
            <div className="py-12 text-center text-sm text-gcu-brown">
              {emptyState}
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
                  {profiles.map((profile) => {
                    const isSelf = profile.id === currentUserId
                    const isWorking = roleChangeTargetId === profile.id

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
                          <Badge variant={profile.role === 'super_admin' ? 'outline' : 'default'}>
                            {getRoleLabel(profile.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gcu-brown">
                          {formatJoinedDate(profile.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {!isSelf && profile.role === 'super_admin' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                                disabled={isWorking}
                                onClick={() => onRoleChange(profile, 'admin')}
                              >
                                {isWorking ? <Loader2 className="size-4 animate-spin" /> : 'Demote'}
                              </Button>
                            )}

                            {!isSelf && profile.role === 'admin' && canPromoteToSuperAdmin && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-gcu-gold/40 text-gcu-maroon hover:bg-gcu-cream-dark"
                                disabled={isWorking}
                                onClick={() => onRoleChange(profile, 'super_admin')}
                              >
                                {isWorking ? <Loader2 className="size-4 animate-spin" /> : 'Promote'}
                              </Button>
                            )}

                            {!isSelf && profile.role === 'admin' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                                disabled={isWorking}
                                onClick={() => onRoleChange(profile, 'user')}
                              >
                                {isWorking ? <Loader2 className="size-4 animate-spin" /> : 'Demote'}
                              </Button>
                            )}

                            {!isSelf && profile.role === 'user' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
                                disabled={isWorking}
                                onClick={() => onRoleChange(profile, 'admin')}
                              >
                                {isWorking ? <Loader2 className="size-4 animate-spin" /> : 'Make admin'}
                              </Button>
                            )}

                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onDelete(profile)}
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
  )
}

export default function UsersPage() {
  const { user: currentUser, isSuperAdmin } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffRole, setNewStaffRole] = useState<StaffInviteRole>('admin')
  const [isCreatingStaff, setIsCreatingStaff] = useState(false)
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
          role?: StaffInviteRole
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
      throw new Error(error.message)
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    return data
  }

  async function handleCreateStaffAccount() {
    const email = newStaffEmail.trim().toLowerCase()
    const fullName = newStaffName.trim()

    if (!email) {
      toast.error(`Enter an email address for the ${getRoleLabel(newStaffRole)} account`)
      return
    }

    setIsCreatingStaff(true)
    try {
      const data = await invokeManageAdminAccount({
        action: 'invite_admin',
        email,
        fullName: fullName || null,
        role: newStaffRole,
      })

      toast.success(
        data?.message ?? `${getRoleLabel(newStaffRole)} access created for ${email}`,
      )
      setNewStaffEmail('')
      setNewStaffName('')
      setNewStaffRole('admin')
      void fetchProfiles()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create staff account',
      )
    } finally {
      setIsCreatingStaff(false)
    }
  }

  async function handleRoleChange(profile: Profile, nextRole: Profile['role']) {
    if (profile.id === currentUser?.id && nextRole !== profile.role) {
      toast.error('You cannot change your own staff role from this screen')
      return
    }

    setRoleChangeTargetId(profile.id)
    try {
      const data = await invokeManageAdminAccount({
        action: 'set_role',
        userId: profile.id,
        role: nextRole,
      })

      setProfiles((prev) =>
        prev.map((item) =>
          item.id === profile.id ? { ...item, role: nextRole } : item,
        ),
      )
      toast.success(
        data?.message ??
          `${profile.email} is now ${getRoleLabel(nextRole)}`,
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
      const { data: subs } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', deleteTarget.id)

      if (subs && subs.length > 0) {
        const subIds = subs.map((submission) => submission.id)
        await supabase
          .from('submission_values')
          .delete()
          .in('submission_id', subIds)

        await supabase
          .from('submissions')
          .delete()
          .eq('user_id', deleteTarget.id)
      }

      await supabase
        .from('notifications')
        .delete()
        .or(`recipient_id.eq.${deleteTarget.id},sender_id.eq.${deleteTarget.id}`)

      await supabase
        .from('form_starts')
        .delete()
        .eq('user_id', deleteTarget.id)

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteTarget.id)

      if (profileError) throw new Error(profileError.message)

      setProfiles((prev) => prev.filter((profile) => profile.id !== deleteTarget.id))
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

  const filtered = profiles.filter((profile) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      profile.email.toLowerCase().includes(q) ||
      (profile.full_name?.toLowerCase().includes(q) ?? false)
    )
  })

  const superAdminProfiles = filtered.filter((profile) => profile.role === 'super_admin')
  const adminProfiles = filtered.filter((profile) => profile.role === 'admin')
  const memberProfiles = filtered.filter((profile) => profile.role === 'user')

  const totalVisibleProfiles =
    superAdminProfiles.length + adminProfiles.length + memberProfiles.length

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
          Manage administrator accounts and review non-admin signup details.
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
              {isSuperAdmin ? 'Create Staff Account' : 'Create Admin Account'}
            </h2>
            <p className="text-sm text-gcu-brown">
              {isSuperAdmin
                ? 'Invite a new admin or super admin, or upgrade an existing account.'
                : 'Invite a new admin by email, or upgrade an existing account if that email is already registered.'}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr),minmax(0,0.9fr),auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full Name</Label>
              <Input
                id="staff-name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Patrick Jude Mbano"
                className="border-gcu-cream-dark"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">Email Address</Label>
              <Input
                id="staff-email"
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="admin@example.com"
                className="border-gcu-cream-dark"
              />
            </div>

            {isSuperAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="staff-role">Role</Label>
                <select
                  id="staff-role"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as StaffInviteRole)}
                  className="h-10 w-full rounded-lg border border-gcu-cream-dark bg-white px-3 text-sm outline-none focus-visible:border-gcu-maroon/30 focus-visible:ring-3 focus-visible:ring-gcu-maroon/20"
                >
                  <option value="admin">admin</option>
                  <option value="super_admin">super admin</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex h-10 items-center rounded-lg border border-gcu-cream-dark bg-gcu-cream/40 px-3 text-sm font-medium text-gcu-maroon-dark">
                  admin
                </div>
              </div>
            )}

            <Button
              type="button"
              className="bg-gcu-maroon hover:bg-gcu-maroon-light"
              disabled={isCreatingStaff}
              onClick={() => void handleCreateStaffAccount()}
            >
              {isCreatingStaff ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 size-4" />
                  Add {isSuperAdmin && newStaffRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-3 ${isSuperAdmin ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {isSuperAdmin && (
          <Card className="border-gcu-cream-dark">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gcu-brown/70">
                  Super Admins
                </p>
                <p className="mt-1 text-2xl font-semibold text-gcu-maroon-dark">
                  {superAdminProfiles.length}
                </p>
              </div>
              <Badge variant="outline" className="border-gcu-gold/50 text-gcu-maroon-dark">
                <Shield className="mr-1 size-3.5" />
                Hidden staff
              </Badge>
            </CardContent>
          </Card>
        )}

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
      ) : totalVisibleProfiles === 0 ? (
        <Card>
          <CardContent className="rounded-lg bg-gcu-cream-dark/30 py-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gcu-cream-dark">
              <UsersIcon className="size-7 text-gcu-brown" />
            </div>
            <p className="mt-4 text-sm font-medium text-gcu-maroon-dark">No users found</p>
            <p className="mt-1 text-xs text-gcu-brown">
              {search
                ? 'Try adjusting your search.'
                : 'No users are visible in this account scope yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {isSuperAdmin && (
            <ProfileSection
              title="Super Admins"
              description="Hidden staff accounts with full visibility across the admin workspace."
              profiles={superAdminProfiles}
              emptyState="No super admins match this search."
              currentUserId={currentUser?.id}
              roleChangeTargetId={roleChangeTargetId}
              canPromoteToSuperAdmin={false}
              onRoleChange={handleRoleChange}
              onDelete={(profile) => setDeleteTarget(profile)}
            />
          )}

          <ProfileSection
            title="Administrators"
            description="Internal accounts with access to manage forms, submissions, and users."
            profiles={adminProfiles}
            emptyState="No administrators match this search."
            currentUserId={currentUser?.id}
            roleChangeTargetId={roleChangeTargetId}
            canPromoteToSuperAdmin={isSuperAdmin}
            onRoleChange={handleRoleChange}
            onDelete={(profile) => setDeleteTarget(profile)}
          />

          <ProfileSection
            title="Non-Admin Signups"
            description="Signup and profile details supplied by portal members without staff access."
            profiles={memberProfiles}
            emptyState="No non-admin signups match this search."
            currentUserId={currentUser?.id}
            roleChangeTargetId={roleChangeTargetId}
            canPromoteToSuperAdmin={false}
            onRoleChange={handleRoleChange}
            onDelete={(profile) => setDeleteTarget(profile)}
          />
        </div>
      )}

      {!isLoading && (
        <p className="text-xs text-gcu-brown">
          {isSuperAdmin && `${superAdminProfiles.length} super admin account${superAdminProfiles.length !== 1 ? 's' : ''}, `}
          {adminProfiles.length} admin account{adminProfiles.length !== 1 ? 's' : ''} and{' '}
          {memberProfiles.length} non-admin signup{memberProfiles.length !== 1 ? 's' : ''}
          {search ? ' matching your search' : ' in total'}
        </p>
      )}

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
