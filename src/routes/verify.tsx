import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ShieldCheck, Shield } from 'lucide-react'
import { SchoolLogo } from '@/components/shared/SchoolLogo'
import { useAuth } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 1

export default function VerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { verifyOtp, signInWithOtp, user, isAdmin, loading: authLoading } = useAuth()

  const routeState = location.state as { email?: string; redirectTo?: string } | null
  const email = searchParams.get('email') ?? routeState?.email ?? ''
  const redirectTo =
    searchParams.get('redirectTo') ??
    routeState?.redirectTo ??
    (isAdmin ? '/admin' : '/dashboard')

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo, { replace: true })
    }
  }, [authLoading, isAdmin, navigate, redirectTo, user])

  useEffect(() => {
    if (!authLoading && !user && !email) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, email, navigate, user])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const updated = [...otp]
    updated[index] = value.slice(-1)
    setOtp(updated)
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const updated = [...otp]
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i]
    }
    setOtp(updated)
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  const handleVerify = useCallback(async () => {
    const token = otp.join('')
    if (token.length !== OTP_LENGTH) {
      toast.error('Please enter the full 6-digit code')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await verifyOtp(email, token)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Verified successfully!')
      navigate(redirectTo, { replace: true })
    } catch {
      toast.error('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [otp, email, verifyOtp, navigate, redirectTo])

  useEffect(() => {
    if (otp.every((d) => d !== '') && otp.join('').length === OTP_LENGTH) {
      void handleVerify()
    }
  }, [otp, handleVerify])

  async function handleResend() {
    if (cooldown > 0) return
    try {
      const { error } = await signInWithOtp(email)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('New OTP sent!')
      setCooldown(RESEND_COOLDOWN)
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend OTP.')
    }
  }

  if (!email) return null

  return (
    <div className="flex min-h-screen flex-col">
      {/* Brand accent bar */}
      <div className="h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div className="flex flex-1">
        {/* ── Left: Brand Panel (hidden on mobile) ──────── */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-gcu-maroon-dark">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          <div className="relative flex flex-col justify-center px-12 xl:px-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <SchoolLogo className="size-16 rounded-2xl drop-shadow-lg" />
              <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
                Government College
                <br />
                Umuahia
              </h1>
              <p className="mt-2 text-sm font-medium text-gcu-gold-light/70">
                Class of &apos;73 &middot; Group Life Insurance Portal
              </p>
              <div className="mt-8 flex items-center gap-3 text-xs text-white/40">
                <div className="flex items-center gap-1.5">
                  <Shield className="size-3.5" />
                  <span>256-bit encrypted</span>
                </div>
                <span>&middot;</span>
                <span>Your data is protected</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Right: OTP Form ────────────────────────────── */}
        <div className="flex flex-1 flex-col bg-gcu-cream">
          {/* Mobile-only branded header */}
          <div className="relative overflow-hidden bg-gcu-maroon-dark px-6 pb-8 pt-10 text-center lg:hidden">
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <div className="relative">
              <SchoolLogo className="mx-auto size-14 rounded-2xl drop-shadow-lg" />
              <h1 className="mt-3 text-lg font-bold tracking-tight text-white">
                Government College Umuahia
              </h1>
              <p className="mt-1 text-xs font-medium text-gcu-gold-light/70">
                Class of &apos;73 &middot; Group Life Insurance Portal
              </p>
            </div>
          </div>

          {/* Form — vertically centered */}
          <div className="flex flex-1 items-center justify-center px-6 py-8">
            <motion.div
              className="w-full max-w-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gcu-cream-dark">
                  <ShieldCheck className="size-6 text-gcu-maroon" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">
                  Check your email
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a 6-digit code to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2.5">
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className="size-12 text-center text-xl font-bold"
                    disabled={isLoading}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <Button
                onClick={handleVerify}
                className="mt-6 h-11 w-full bg-gcu-maroon text-base font-semibold hover:bg-gcu-maroon-light"
                disabled={isLoading || otp.join('').length !== OTP_LENGTH}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </Button>

              {/* Resend */}
              <div className="mt-5 text-center">
                {cooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in{' '}
                    <span className="font-semibold text-gcu-maroon">{cooldown}s</span>
                  </p>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-gcu-brown"
                    onClick={handleResend}
                  >
                    Didn&apos;t receive a code? Resend
                  </Button>
                )}
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className={cn(
                    buttonVariants({ variant: 'link', size: 'sm' }),
                    'text-muted-foreground',
                  )}
                >
                  <ArrowLeft className="mr-1 size-3" />
                  Back to login
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
