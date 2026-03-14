import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface MediaUploadProps {
  fieldId: string
  value: string
  onChange: (url: string) => void
  error?: boolean
}

export function MediaUpload({ fieldId, value, onChange, error }: MediaUploadProps) {
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
        const fileName = `${fieldId}/${Date.now()}.${ext}`

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

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(data.path)

        const publicUrl = urlData.publicUrl
        setUploadProgress(100)
        setPreviewUrl(publicUrl)
        onChange(publicUrl)
      } catch (err) {
        console.error('Upload failed:', err)
        setUploadProgress(0)
      } finally {
        setUploading(false)
      }
    },
    [fieldId, onChange],
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
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Upload preview"
            className={cn(
              'rounded-xl object-cover',
              'w-48 h-48 sm:w-56 sm:h-56',
              'border-2 border-muted',
            )}
          />
          <button
            type="button"
            onClick={clearUpload}
            className={cn(
              'absolute -top-2 -right-2',
              'size-7 rounded-full bg-destructive text-white',
              'flex items-center justify-center',
              'shadow-md hover:bg-destructive/90 transition-colors',
            )}
            aria-label="Remove upload"
          >
            <X className="size-4" />
          </button>
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
        <div className={cn('flex flex-col sm:flex-row gap-3', error && 'animate-shake')}>
          {/* Camera capture (front camera) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="min-h-14 gap-3 text-base flex-1"
          >
            <Camera className="size-5" />
            Take Photo
          </Button>

          {/* File picker */}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-14 gap-3 text-base flex-1"
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
