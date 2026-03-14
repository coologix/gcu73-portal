import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InvitationManager } from '@/components/admin/InvitationManager'
import type { Form } from '@/types/database'

export default function InvitationsPage() {
  const { user } = useAuth()
  const [forms, setForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchForms() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('is_active', true)
          .order('title', { ascending: true })

        if (error) throw new Error(error.message)
        setForms(data ?? [])
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load forms',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void fetchForms()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Brand accent bar */}
      <div className="-mx-6 -mt-6 mb-2 h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">Invitations</h1>
        <p className="text-sm text-gcu-brown">
          Send and manage member invitations
        </p>
      </div>

      {user && forms.length > 0 && (
        <Card className="border-gcu-cream-dark">
          <CardHeader>
            <CardTitle className="text-base text-gcu-maroon-dark">Send Invitations</CardTitle>
            <CardDescription>
              Invite members individually or in bulk via CSV upload.
              The &ldquo;All Invitations&rdquo; tab shows sent invitations with actions to resend, cancel, or delete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationManager
              forms={forms}
              currentUserId={user.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
