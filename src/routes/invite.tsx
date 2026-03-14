import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, CheckCircle, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Invitation, Form } from '@/types/database'

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'otp_sent'

export default function InvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signInWithOtp, user } = useAuth()

  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  // ── Validate the invitation token ──────────────────────────

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }

    async function validateToken() {
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .single()

        if (error || !data) {
          setStatus('invalid')
          return
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setStatus('expired')
          return
        }

        // Check if already completed
        if (data.status === 'completed') {
          toast.info('This invitation has already been used.')
          setStatus('invalid')
          return
        }

        if (data.status === 'cancelled') {
          setStatus('invalid')
          return
        }

        setInvitation(data)

        // Fetch form details
        const { data: formData } = await supabase
          .from('forms')
          .select('*')
          .eq('id', data.form_id)
          .single()

        if (formData) {
          setForm(formData)
        }

        setStatus('valid')

        // If user is already logged in and matches the invitation email, redirect
        if (user?.email?.toLowerCase() === data.email.toLowerCase() && formData) {
          navigate(`/form/${formData.slug}`, { replace: true })
        }
      } catch {
        setStatus('invalid')
      }
    }

    void validateToken()
  }, [token, user, navigate])

  // ── Send OTP ───────────────────────────────────────────────

  async function handleSendOtp() {
    if (!invitation) return

    setIsSendingOtp(true)
    try {
      const { error } = await signInWithOtp(invitation.email)
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('OTP sent to your email!')
      setStatus('otp_sent')

      // Navigate to verify with invitation context
      const params = new URLSearchParams({
        email: invitation.email,
        redirectTo: form ? `/form/${form.slug}` : '/dashboard',
      })
      navigate(`/verify?${params.toString()}`)
    } catch {
      toast.error('Failed to send OTP. Please try again.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  // ── Render states ──────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gcu-cream to-white">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-gcu-brown" />
          <p className="mt-3 text-sm text-muted-foreground">
            Validating your invitation...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'invalid' || status === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gcu-cream to-white p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <CardTitle className="text-xl">
              {status === 'expired' ? 'Invitation Expired' : 'Invalid Invitation'}
            </CardTitle>
            <CardDescription>
              {status === 'expired'
                ? 'This invitation link has expired. Please contact the administrator for a new one.'
                : 'This invitation link is not valid. It may have already been used or the link is incorrect.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              If you believe this is an error, please reach out to the class
              administrator.
            </p>
            <Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>Go to Home</Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid invitation
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gcu-cream to-white p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-gcu-cream-dark">
            <CheckCircle className="size-5 text-gcu-brown" />
          </div>
          <CardTitle className="text-xl">You&apos;re Invited!</CardTitle>
          <CardDescription>
            You have been invited to submit your information
            {form ? ` for "${form.title}"` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation && (
            <div className="mb-4 rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span className="font-medium">{invitation.email}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleSendOtp}
            className="w-full bg-gcu-maroon hover:bg-gcu-maroon-light"
            size="lg"
            disabled={isSendingOtp}
          >
            {isSendingOtp ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              'Continue with OTP'
            )}
          </Button>

          <div className="mt-4 text-center">
            <Link to="/" className={cn(buttonVariants({ variant: "link", size: "sm" }), "text-muted-foreground")}>Go to Home</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
