import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface MediaUploadProps {
  fieldId: string
  value: string
  onChange: (url: string) => void
  error?: boolean
}

export function MediaUpload({ fieldId, value, onChange, error }: MediaUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string>(value || '')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setUploadProgress(0)

      try {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const userId = user?.id ?? 'anonymous'
        const fileName = `${userId}/${fieldId}/${Date.now()}.${ext}`

        // Simulate progress since Supabase doesn't provide upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90))
        }, 200)

        const { data, error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        clearInterval(progressInterval)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(data.path)

        setUploadProgress(100)
        setPreviewUrl(urlData.publicUrl)
        onChange(urlData.publicUrl)
      } catch (err) {
        console.error('Upload failed:', err)
        setUploadProgress(0)
      } finally {
        setUploading(false)
      }
    },
    [fieldId, onChange, user?.id],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        void uploadFile(file)
      }
      // Reset the input so the same file can be re-selected
      e.target.value = ''
    },
    [uploadFile],
  )

  const clearUpload = useCallback(() => {
    setPreviewUrl('')
    onChange('')
    setUploadProgress(0)
  }, [onChange])

  return (
    <div className="w-full space-y-4">
      {/* Preview */}
      {previewUrl && (
        <div
          className={cn(
            'mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-gcu-cream-dark bg-gradient-to-b from-white to-gcu-cream/40 shadow-sm',
            error && 'animate-shake',
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-gcu-cream-dark px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gcu-maroon-dark">
                Photo preview
              </p>
              <p className="mt-1 text-xs text-gcu-brown">
                Check the framing before you continue.
              </p>
            </div>
            <button
              type="button"
              onClick={clearUpload}
              className={cn(
                'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-gcu-cream-dark bg-white text-gcu-maroon shadow-sm transition-colors',
                'hover:bg-gcu-cream hover:text-gcu-maroon-dark',
              )}
              aria-label="Remove upload"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-[1.25rem] border border-gcu-cream-dark bg-white shadow-inner">
              <div className="aspect-[3/4] w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(246,239,232,0.8)_55%,_rgba(236,225,215,0.9))] p-3">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="h-full w-full rounded-2xl object-contain"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-12 gap-2 border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
              >
                <Camera className="size-4" />
                Take again
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-12 gap-2 border-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark"
              >
                <Upload className="size-4" />
                Choose different photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Uploading...
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!previewUrl && !uploading && (
        <div className={cn('flex flex-col gap-3 sm:flex-row', error && 'animate-shake')}>
          {/* Camera capture (front camera) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="min-h-14 flex-1 gap-3 border-gcu-cream-dark text-base text-gcu-maroon hover:bg-gcu-cream-dark"
          >
            <Camera className="size-5" />
            Take Photo
          </Button>

          {/* File picker */}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-14 flex-1 gap-3 border-gcu-cream-dark text-base text-gcu-maroon hover:bg-gcu-cream-dark"
          >
            <Upload className="size-5" />
            Choose File
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
