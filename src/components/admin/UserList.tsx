import { useState, useMemo } from 'react'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { UserProfileCard } from '@/components/admin/UserProfileCard'
import { cn } from '@/lib/utils'
import type { Submission } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

interface UserEntry {
  id: string
  fullName: string | null
  email: string
  avatarUrl?: string | null
  status?: Submission['status']
}

type StatusFilter = 'all' | Submission['status']

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'update_requested', label: 'Update Requested' },
]

// ── Component ──────────────────────────────────────────────

interface UserListProps {
  users: UserEntry[]
  onUserClick?: (userId: string) => void
  className?: string
}

export function UserList({ users, onUserClick, className }: UserListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        (u.fullName?.toLowerCase().includes(q) ?? false) ||
        u.email.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' || u.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, search, statusFilter])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="size-4" />
          </InputGroupAddon>
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0"
          />
        </InputGroup>

        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="xs"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* User grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((user) => (
            <UserProfileCard
              key={user.id}
              fullName={user.fullName}
              email={user.email}
              avatarUrl={user.avatarUrl}
              status={user.status}
              onClick={() => onUserClick?.(user.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <Users className="size-10 opacity-40" />
          <p className="text-sm font-medium">No users found</p>
          <p className="text-xs">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
