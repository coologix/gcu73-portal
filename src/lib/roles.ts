import type { Profile } from '@/types/database'

export function hasAdminAccess(role: Profile['role'] | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function formatRoleLabel(role: Profile['role'] | null | undefined): string {
  if (!role) return 'user'
  return role.replace('_', ' ')
}
