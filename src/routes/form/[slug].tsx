import { useParams, useNavigate } from 'react-router'
import { FormWizard } from '@/components/wizard/FormWizard'

export default function FormPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">No form specified.</p>
      </div>
    )
  }

  return (
    <FormWizard
      formSlug={slug}
      onClose={() => navigate('/dashboard')}
    />
  )
}
