import { supabase } from '@/lib/supabase'

interface SendSingleInvitationArgs {
  email: string
  formId: string
  formTitle: string
  currentUserId: string
}

type SendSingleInvitationResult =
  | {
      status: 'duplicate'
      email: string
    }
  | {
      status: 'sent'
      email: string
      emailSent: boolean
      inviteLink: string
    }

export async function sendSingleInvitation({
  email,
  formId,
  formTitle,
  currentUserId,
}: SendSingleInvitationArgs): Promise<SendSingleInvitationResult> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !formId) {
    throw new Error('Email and form are required')
  }

  const { data: existing, error: existingError } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('form_id', formId)
    .eq('status', 'pending')
    .limit(1)

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing && existing.length > 0) {
    return {
      status: 'duplicate',
      email: normalizedEmail,
    }
  }

  const token = crypto.randomUUID()
  const { error: insertError } = await supabase.from('invitations').insert({
    email: normalizedEmail,
    form_id: formId,
    token,
    invited_by: currentUserId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (insertError) {
    throw new Error(insertError.message)
  }

  const { error: fnError } = await supabase.functions.invoke('send-invitation-email', {
    body: { email: normalizedEmail, token, formTitle },
  })

  return {
    status: 'sent',
    email: normalizedEmail,
    emailSent: !fnError,
    inviteLink: `${window.location.origin}/invite?token=${token}`,
  }
}
