import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { SubmissionWithValues } from '@/lib/export-csv'

interface UseSubmissionsReturn {
  submissions: SubmissionWithValues[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches submissions for a given form.
 *
 * - Admins see all submissions.
 * - Regular users see only their own.
 *
 * Includes nested `submission_values` for each submission.
 */
export function useSubmissions(formId: string | undefined): UseSubmissionsReturn {
  const { user, isAdmin } = useAuth()
  const [submissions, setSubmissions] = useState<SubmissionWithValues[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!formId) return

    setLoading(true)
    setError(null)

    let query = supabase
      .from('submissions')
      .select('*, submission_values(*)')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })

    // Non-admin users only see their own submissions
    if (!isAdmin && user) {
      query = query.eq('user_id', user.id)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setSubmissions([])
    } else {
      setSubmissions((data as SubmissionWithValues[]) ?? [])
    }

    setLoading(false)
  }, [formId, isAdmin, user])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const refetch = useCallback(() => {
    void fetch()
  }, [fetch])

  return { submissions, loading, error, refetch }
}
