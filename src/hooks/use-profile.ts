import { useAuth } from '@/lib/auth'
import type { Profile } from '@/types/database'

interface UseProfileReturn {
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
}

/**
 * Convenience hook that exposes the current user's profile and admin status.
 * Must be rendered inside an `<AuthProvider>`.
 */
export function useProfile(): UseProfileReturn {
  const { profile, isAdmin, loading } = useAuth()
  return { profile, isAdmin, loading }
}
