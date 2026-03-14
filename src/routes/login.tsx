import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft, GraduationCap, Shield, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signInWithOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast.error('Please enter your email address')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await signInWithOtp(trimmed)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('OTP sent! Check your email.')
      navigate('/verify', { state: { email: trimmed } })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Brand accent bar */}
      <div className="h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div className="flex flex-1">
        {/* ── Left: Brand Panel (hidden on mobile) ──────── */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-gcu-maroon-dark">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="relative flex flex-col justify-center px-12 xl:px-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <GraduationCap className="size-7 text-gcu-gold-light" />
              </div>

              <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
                Government College
                <br />
                Umuahia
              </h1>

              <p className="mt-2 text-sm font-medium text-gcu-gold-light/70">
                Class of &apos;73 &middot; Group Life Insurance Portal
              </p>

              <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/60">
                Submit your personal details securely for enrollment in
                the group life insurance programme.
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

        {/* ── Right: Login Form ──────────────────────────── */}
        <div className="flex flex-1 flex-col bg-gcu-cream">
          {/* Mobile-only branded header */}
          <div className="relative overflow-hidden bg-gcu-maroon-dark px-6 pb-8 pt-10 text-center lg:hidden">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <div className="relative">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <GraduationCap className="size-6 text-gcu-gold-light" />
              </div>
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
              className="w-full max-w-sm text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Icon + heading centered */}
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-gcu-cream-dark">
                <Mail className="size-5 text-gcu-maroon" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gcu-maroon-dark">
                Sign in to your account
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email to receive a one-time login code
              </p>

              {/* Form — left-aligned fields */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 text-base"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-gcu-maroon text-base font-semibold hover:bg-gcu-maroon-light"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <Link
                  to="/"
                  className={cn(
                    buttonVariants({ variant: 'link', size: 'sm' }),
                    'text-muted-foreground',
                  )}
                >
                  <ArrowLeft className="mr-1 size-3" />
                  Back to home
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
