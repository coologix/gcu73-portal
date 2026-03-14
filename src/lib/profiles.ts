import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export async function ensureProfileForUser(user: User): Promise<Profile> {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfileError) {
    throw new Error(existingProfileError.message)
  }

  if (existingProfile) {
    return existingProfile
  }

  const { data: createdProfile, error: createProfileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? null,
    })
    .select('*')
    .single()

  if (createProfileError || !createdProfile) {
    throw new Error(createProfileError?.message ?? 'Failed to create profile')
  }

  return createdProfile
}
