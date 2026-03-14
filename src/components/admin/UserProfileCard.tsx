import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Submission } from '@/types/database'

// ── Status badge mapping ───────────────────────────────────

const STATUS_CONFIG: Record<
  Submission['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  update_requested: { label: 'Update Requested', variant: 'destructive' },
}

// ── Component ──────────────────────────────────────────────

interface UserProfileCardProps {
  fullName: string | null
  email: string
  avatarUrl?: string | null
  status?: Submission['status']
  onClick?: () => void
  className?: string
}

export function UserProfileCard({
  fullName,
  email,
  avatarUrl,
  status,
  onClick,
  className,
}: UserProfileCardProps) {
  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : email[0].toUpperCase()

  const statusConfig = status ? STATUS_CONFIG[status] : null

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3">
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? email} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {fullName ?? 'Unnamed User'}
          </p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>

        {statusConfig && (
          <Badge variant={statusConfig.variant} className="shrink-0">
            {statusConfig.label}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
