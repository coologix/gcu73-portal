import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/lib/auth'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Loader2 } from 'lucide-react'

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import('@/routes/index'))
const LoginPage = lazy(() => import('@/routes/login'))
const VerifyPage = lazy(() => import('@/routes/verify'))
const InvitePage = lazy(() => import('@/routes/invite'))
const FormPage = lazy(() => import('@/routes/form/[slug]'))
const DashboardPage = lazy(() => import('@/routes/dashboard'))
const AdminDashboardPage = lazy(() => import('@/routes/admin/index'))
const AdminFormsPage = lazy(() => import('@/routes/admin/forms'))
const AdminFormBuilderPage = lazy(() => import('@/routes/admin/form-builder'))
const AdminSubmissionsPage = lazy(() => import('@/routes/admin/submissions'))
const AdminSubmissionDetailPage = lazy(() => import('@/routes/admin/submission-detail'))
const AdminUsersPage = lazy(() => import('@/routes/admin/users'))
const AdminInvitationsPage = lazy(() => import('@/routes/admin/invitations'))
const AdminNotificationsPage = lazy(() => import('@/routes/admin/notifications'))
const AdminExportPage = lazy(() => import('@/routes/admin/export'))

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/invite" element={<InvitePage />} />

            {/* Protected - User */}
            <Route element={<AuthGuard><PortalLayout /></AuthGuard>}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Full-screen form wizard (no layout wrapper) */}
            <Route element={<AuthGuard />}>
              <Route path="/form/:slug" element={<FormPage />} />
            </Route>

            {/* Protected - Admin */}
            <Route element={<AuthGuard><AdminGuard><AdminLayout /></AdminGuard></AuthGuard>}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/forms" element={<AdminFormsPage />} />
              <Route path="/admin/forms/:id" element={<AdminFormBuilderPage />} />
              <Route path="/admin/forms/:formId/submissions" element={<AdminSubmissionsPage />} />
              <Route path="/admin/forms/:formId/submissions/:id" element={<AdminSubmissionDetailPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/invitations" element={<AdminInvitationsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/export" element={<AdminExportPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </AuthProvider>
  )
}

export default App
