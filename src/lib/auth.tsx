/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile, ProfileUpdate } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { ensureProfileForUser } from '@/lib/profiles'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isSuperAdmin: boolean
  loading: boolean
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error || !data) return null
      return data
    } catch {
      return null
    }
  }, [])

  const handleSession = useCallback(async (sessionUser: User | null) => {
    setUser(sessionUser)
    if (sessionUser) {
      let p = await fetchProfile(sessionUser.id)

      // Auto-create profile if it doesn't exist (invited users)
      if (!p) {
        try {
          p = await ensureProfileForUser(sessionUser)
        } catch (err) {
          console.error(
            'Failed to ensure profile for authenticated user:',
            err instanceof Error ? err.message : err,
          )
        }
      }

      setProfile(p)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [fetchProfile])

  useEffect(() => {
    // 1. Immediately check for existing session (handles page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized.current) {
        initialized.current = true
        void handleSession(session?.user ?? null)
      }
    }).catch(() => {
      if (!initialized.current) {
        initialized.current = true
        setLoading(false)
      }
    })

    // 2. Listen for auth changes (handles login/logout/token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip INITIAL_SESSION if getSession already handled it
      if (!initialized.current) {
        initialized.current = true
      }
      void handleSession(session?.user ?? null)
    })

    // 3. Safety: never hang forever
    const timeout = setTimeout(() => {
      if (!initialized.current) {
        initialized.current = true
        setLoading(false)
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [handleSession])

  const signInWithOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const nextProfile = await fetchProfile(user.id)
    if (nextProfile) {
      setProfile(nextProfile)
    }
  }, [fetchProfile, user])

  const updateProfile = useCallback(
    async (updates: ProfileUpdate) => {
      if (!user) {
        return { error: new Error('Not signed in') }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single()

      if (error || !data) {
        return { error: new Error(error?.message ?? 'Failed to update profile') }
      }

      setProfile(data)
      return { error: null }
    },
    [user],
  )

  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'admin' || isSuperAdmin

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin,
      isSuperAdmin,
      loading,
      signInWithOtp,
      verifyOtp,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      user,
      profile,
      isAdmin,
      isSuperAdmin,
      loading,
      signInWithOtp,
      verifyOtp,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within <AuthProvider>')
  return context
}
