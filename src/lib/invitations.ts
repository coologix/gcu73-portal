import { supabase } from '@/lib/supabase'

interface CompleteInvitationOptions {
  formId: string
  token?: string | null
}

interface CompleteInvitationResult {
  completedCount: number
  error: Error | null
}

export async function completeInvitationForCurrentUser({
  formId,
  token,
}: CompleteInvitationOptions): Promise<CompleteInvitationResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const accessToken = session?.access_token
    if (!accessToken) {
      return {
        completedCount: 0,
        error: new Error('Missing authenticated session'),
      }
    }

    const { data, error } = await supabase.functions.invoke('complete-invitation', {
      body: {
        formId,
        token: token ?? null,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (error) {
      return {
        completedCount: 0,
        error: new Error(error.message ?? 'Failed to complete invitation'),
      }
    }

    return {
      completedCount:
        typeof data?.completedCount === 'number' ? data.completedCount : 0,
      error: null,
    }
  } catch (err) {
    return {
      completedCount: 0,
      error:
        err instanceof Error
          ? err
          : new Error('Failed to complete invitation'),
    }
  }
}
