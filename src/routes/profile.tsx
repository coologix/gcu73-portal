import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function getInitials(fullName: string | null, email: string | undefined): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return email?.slice(0, 2).toUpperCase() ?? 'U'
}

export default function ProfilePage() {
  const { profile, updateProfile, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
  }, [profile])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { error } = await updateProfile({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Profile updated')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gcu-maroon-dark">
          Profile
        </h1>
        <p className="text-sm text-gcu-brown">
          Manage the personal details attached to your portal account.
        </p>
      </div>

      <Card className="border-gcu-cream-dark">
        <CardHeader>
          <CardTitle className="text-base">Account Overview</CardTitle>
          <CardDescription>
            Your email is fixed to your login. Name and avatar can be updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-18 border border-gcu-cream-dark">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? profile.email} />
            )}
            <AvatarFallback className="bg-gcu-cream-dark text-gcu-maroon-dark">
              {profile.avatar_url ? <UserRound className="size-5" /> : getInitials(profile.full_name, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gcu-maroon-dark">
                {profile.full_name ?? 'Unnamed user'}
              </p>
              <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                {profile.role}
              </Badge>
            </div>
            <p className="text-sm text-gcu-brown">{profile.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gcu-cream-dark">
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="bg-muted/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Avatar URL</Label>
              <Input
                id="profile-avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-gcu-maroon hover:bg-gcu-maroon-light"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-4" />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
