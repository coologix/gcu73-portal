import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Users as UsersIcon, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/types/database'

// ── Animation helpers ────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
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

    void fetchProfiles()
  }, [])

  const filtered = profiles.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.email.toLowerCase().includes(q) ||
      (p.full_name?.toLowerCase().includes(q) ?? false)
    )
  })

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
          All registered users in the portal
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg bg-gcu-cream-dark/30 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gcu-cream-dark">
                <UsersIcon className="size-7 text-gcu-brown" />
              </div>
              <p className="mt-4 text-sm font-medium text-gcu-maroon-dark">No users found</p>
              <p className="mt-1 text-xs text-gcu-brown">
                {search
                  ? 'Try adjusting your search.'
                  : 'No users have registered yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((profile) => (
                    <TableRow key={profile.id} className="transition-colors hover:bg-gcu-cream/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarImage
                              src={profile.avatar_url ?? undefined}
                              alt={profile.full_name ?? profile.email}
                            />
                            <AvatarFallback className="text-xs bg-gcu-cream-dark text-gcu-maroon">
                              {getInitials(profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gcu-maroon-dark">
                            {profile.full_name ?? 'Unnamed'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-gcu-brown">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            profile.role === 'admin' ? 'default' : 'secondary'
                          }
                        >
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-gcu-brown">
                        {new Date(profile.created_at).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' },
                        )}
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
        <p className="text-xs text-gcu-brown">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          {search ? ' matching your search' : ' total'}
        </p>
      )}
    </motion.div>
  )
}
