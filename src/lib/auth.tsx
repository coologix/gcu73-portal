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
import type { Profile } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
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
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({
            id: sessionUser.id,
            email: sessionUser.email ?? '',
            full_name: sessionUser.user_metadata?.full_name ?? null,
          })
          .select()
          .single()
        p = newProfile
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

  const isAdmin = profile?.role === 'admin'

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isAdmin, loading, signInWithOtp, verifyOtp, signOut }),
    [user, profile, isAdmin, loading, signInWithOtp, verifyOtp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within <AuthProvider>')
  return context
}
