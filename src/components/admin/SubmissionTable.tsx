import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import {
  ArrowUpDown,
  Eye,
  RotateCcw,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Submission } from '@/types/database'

// ── Types ──────────────────────────────────────────────────

interface SubmissionRow {
  id: string
  fullName: string
  email: string
  status: Submission['status']
  submittedAt: string | null
}

type SortKey = 'fullName' | 'email' | 'status' | 'submittedAt'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG: Record<
  Submission['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  update_requested: { label: 'Update Requested', variant: 'destructive' },
}

// ── Component ──────────────────────────────────────────────

interface SubmissionTableProps {
  rows: SubmissionRow[]
  onRowClick?: (id: string) => void
  onRequestUpdate?: (id: string) => void
  className?: string
}

export function SubmissionTable({
  rows,
  onRowClick,
  onRequestUpdate,
  className,
}: SubmissionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
    },
    [sortKey],
  )

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const valA = a[sortKey] ?? ''
      const valB = b[sortKey] ?? ''
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  function SortHeader({ label, columnKey }: { label: string; columnKey: SortKey }) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1"
        onClick={() => toggleSort(columnKey)}
      >
        {label}
        <ArrowUpDown className="size-3 text-muted-foreground" />
      </button>
    )
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader label="Name" columnKey="fullName" />
            </TableHead>
            <TableHead>
              <SortHeader label="Email" columnKey="email" />
            </TableHead>
            <TableHead>
              <SortHeader label="Status" columnKey="status" />
            </TableHead>
            <TableHead>
              <SortHeader label="Submitted At" columnKey="submittedAt" />
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No submissions found.
              </TableCell>
            </TableRow>
          )}
          {sorted.map((row) => {
            const statusCfg = STATUS_CONFIG[row.status]
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onRowClick?.(row.id)}
              >
                <TableCell className="font-medium">{row.fullName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </TableCell>
                <TableCell>
                  {row.submittedAt
                    ? format(new Date(row.submittedAt), 'MMM d, yyyy HH:mm')
                    : '--'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRowClick?.(row.id)
                      }}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRequestUpdate?.(row.id)
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
