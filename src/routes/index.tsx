import { Link, Navigate } from 'react-router'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  Shield,
  ArrowRight,
  Mail,
  ClipboardList,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { SchoolLogo } from '@/components/shared/SchoolLogo'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

const steps = [
  {
    icon: Mail,
    step: '01',
    title: 'Sign In With Email',
    description:
      'Enter your email to receive a secure one-time code, or use an invitation link if one was shared with you.',
  },
  {
    icon: ClipboardList,
    step: '02',
    title: 'Fill In Your Details',
    description:
      'Complete the form one question at a time. It is simple and straightforward.',
  },
  {
    icon: ShieldCheck,
    step: '03',
    title: 'Submit Securely',
    description:
      'Your personal data is encrypted and protected. Submit with confidence.',
  },
]

const notableAlumni = [
  'Chinua Achebe',
  'Elechi Amadi',
  'Ken Saro-Wiwa',
  'Gabriel Okara',
  'Christopher Okigbo',
  'Chukwuemeka Ike',
]

export default function HomePage() {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Thin brand accent bar ──────────────────────── */}
      <div className="h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gcu-cream" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236B1D1D' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <motion.div
          className="relative mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:py-20 md:py-28"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* School crest */}
          <motion.div variants={fadeUp} custom={0}>
            <SchoolLogo className="size-24 rounded-2xl drop-shadow-md sm:size-28" />
          </motion.div>

          {/* Badge */}
          <motion.div variants={fadeUp} custom={0.5} className="mt-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-gcu-maroon/15 bg-white px-4 py-1.5 text-xs font-medium tracking-wide text-gcu-maroon uppercase shadow-sm">
              Government College Umuahia &middot; Est. 1929
            </span>
          </motion.div>

          {/* Main heading with serif */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mt-8 font-serif text-4xl font-bold leading-[1.15] tracking-tight text-gcu-maroon-dark sm:text-5xl md:text-6xl"
          >
            Class of &apos;73
            <br />
            <span className="text-gcu-red">Insurance Portal</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-gcu-brown sm:text-lg"
          >
            Sign in to access the active insurance forms and submit your personal
            details securely for enrollment in the Group Life Insurance programme.
          </motion.p>

          {/* Patrick Mbano credit */}
          <motion.p
            variants={fadeUp}
            custom={2.5}
            className="mt-4 text-sm text-gcu-brown-light"
          >
            An initiative by{' '}
            <span className="font-semibold text-gcu-maroon">GCU Class of Jan 1973</span>
          </motion.p>

          {/* Action buttons */}
          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-gcu-maroon text-white hover:bg-gcu-maroon-light px-8 py-6 text-base font-semibold shadow-lg shadow-gcu-maroon/20 transition-all hover:shadow-xl hover:shadow-gcu-maroon/25 sm:w-auto w-full',
              )}
            >
              Start Your Submission
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-white text-gcu-maroon border-2 border-gcu-maroon/20 hover:border-gcu-maroon/40 hover:bg-gcu-cream px-8 py-6 text-base font-medium sm:w-auto w-full transition-all',
              )}
            >
              Sign In to My Account
              <ChevronRight className="ml-1 size-4" />
            </Link>
          </motion.div>

          {/* Requirements note */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="mx-auto mt-10 inline-flex items-center gap-2 rounded-lg border border-gcu-gold/20 bg-white px-4 py-2.5 shadow-sm"
          >
            <Shield className="size-4 text-gcu-gold" />
            <span className="text-sm text-gcu-brown">
              You will need: NIN, BVN, Email &amp; Passport Photo
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            className="flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gcu-brown-light">Scroll</span>
            <svg width="20" height="28" viewBox="0 0 20 28" fill="none" className="text-gcu-brown-light">
              <rect x="1" y="1" width="18" height="26" rx="9" stroke="currentColor" strokeWidth="1.5" />
              <motion.circle
                cx="10"
                cy="8"
                r="2.5"
                fill="currentColor"
                animate={{ cy: [8, 18, 8] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works ─────────────────────────────── */}
      <section className="border-y border-gcu-cream-dark bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-widest text-gcu-red">
              Simple Process
            </motion.p>
            <motion.h2 variants={fadeUp} custom={0.5} className="mt-3 text-center font-serif text-3xl font-bold text-gcu-maroon-dark sm:text-4xl">
              How It Works
            </motion.h2>

            <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.title}
                    variants={fadeUp}
                    custom={i + 1}
                    className="text-center"
                  >
                    <div className="relative mx-auto mb-6 flex size-16 items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-gcu-pink opacity-60" />
                      <Icon className="relative size-7 text-gcu-maroon" />
                    </div>
                    <p className="mb-2 font-serif text-xs font-bold uppercase tracking-[0.2em] text-gcu-gold">
                      Step {step.step}
                    </p>
                    <h3 className="text-lg font-semibold text-gcu-maroon-dark">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gcu-brown-light">
                      {step.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────── */}
      <section className="bg-gcu-cream py-20 sm:py-24">
        <motion.div
          className="mx-auto max-w-3xl px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} custom={0}>
            <p className="text-sm font-semibold uppercase tracking-widest text-gcu-red">
              About This Initiative
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gcu-maroon-dark sm:text-4xl">
              Protecting Our Own
            </h2>
            <p className="mt-6 text-base leading-relaxed text-gcu-brown">
              The GCU Class of January 1973 has established a Group Life
              Insurance programme to support and protect the welfare of its
              members. This secure portal allows class members to submit
              their personal information for enrollment.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gcu-brown">
              This initiative is organized by{' '}
              <span className="font-semibold text-gcu-maroon">
                GCU Class of Jan 1973
              </span>
              , to ensure the welfare and protection of fellow classmates.
            </p>
          </motion.div>

          {/* Heritage box */}
          <motion.div
            variants={fadeUp}
            custom={1}
            className="mt-10 rounded-xl border border-gcu-cream-dark bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-start gap-4">
              <SchoolLogo className="size-12 shrink-0 rounded-xl" />
              <div>
                <h3 className="font-serif text-lg font-bold text-gcu-maroon-dark">
                  &ldquo;Eton of the East&rdquo;
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gcu-brown-light">
                  Founded January 29, 1929 by Rev. Robert Fisher, Government
                  College Umuahia has produced some of Africa&apos;s greatest
                  literary voices.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 pl-14">
              {notableAlumni.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-gcu-cream px-3 py-1 text-xs font-medium text-gcu-maroon"
                >
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="bg-gcu-maroon-dark py-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <SchoolLogo className="mx-auto mb-4 size-20 rounded-2xl drop-shadow-lg" />
          <p className="font-serif text-lg font-semibold text-white/90">
            Government College Umuahia
          </p>
          <p className="mt-1 text-sm text-white/50">
            Founded January 29, 1929 by Rev. Robert Fisher
          </p>
          <p className="mt-3 text-xs font-medium italic text-gcu-gold-light/60">
            &ldquo;In Unum Luceant&rdquo; — May We Shine As One
          </p>
        </div>
      </footer>
    </div>
  )
}
