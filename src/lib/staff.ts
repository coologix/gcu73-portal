import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export interface SuperAdminIdentitySets {
  userIds: Set<string>
  emails: Set<string>
}

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? ''
}

export function isStaffRole(role: Profile['role']): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function getRoleLabel(role: Profile['role']): string {
  return role === 'super_admin' ? 'super admin' : role
}

export async function fetchSuperAdminIdentitySets(
  enabled: boolean,
): Promise<SuperAdminIdentitySets> {
  if (!enabled) {
    return {
      userIds: new Set<string>(),
      emails: new Set<string>(),
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'super_admin')

  if (error) {
    throw new Error(error.message)
  }

  return {
    userIds: new Set((data ?? []).map((profile) => profile.id)),
    emails: new Set((data ?? []).map((profile) => normalizeEmail(profile.email))),
  }
}
