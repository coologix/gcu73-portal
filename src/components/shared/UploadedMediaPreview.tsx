import { Loader2 } from 'lucide-react'
import { useInlineImagePreview } from '@/hooks/use-inline-image-preview'
import {
  isHeicLikeUrl,
  isInlinePreviewableImageUrl,
} from '@/lib/media-files'

interface UploadedMediaPreviewProps {
  url: string
  label: string
  fileName?: string | null
}

export function UploadedMediaPreview({
  url,
  label,
  fileName,
}: UploadedMediaPreviewProps) {
  const {
    previewUrl,
    isLoading,
    error,
    isHeic,
  } = useInlineImagePreview(url)
  const isImage = isInlinePreviewableImageUrl(url) || isHeicLikeUrl(url)

  if (!isImage) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-gcu-cream-dark bg-gcu-cream-dark/20 p-4">
        <p className="text-sm font-medium text-gcu-maroon-dark">
          {fileName ?? 'Uploaded file'}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-sm font-medium text-gcu-red underline-offset-4 hover:underline"
        >
          Open uploaded file
        </a>
      </div>
    )
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-gcu-cream-dark bg-gcu-cream-dark/20">
      <div className="flex min-h-72 items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,239,233,0.65))] p-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            loading="lazy"
            className="block max-h-[28rem] w-full max-w-md object-contain"
          />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="size-5 animate-spin text-gcu-maroon" />
            <p className="mt-3 text-sm font-medium text-gcu-maroon-dark">
              Preparing image preview...
            </p>
            <p className="mt-1 max-w-xs text-xs text-gcu-brown">
              HEIC photos are being converted to a browser-safe preview.
            </p>
          </div>
        ) : (
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-gcu-maroon-dark">
              Inline preview unavailable
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gcu-brown">
              {isHeic
                ? error ?? 'This HEIC image could not be rendered inline in this browser.'
                : 'This uploaded image could not be rendered inline here.'}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-gcu-cream-dark px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gcu-brown">
          {previewUrl ? 'Inline preview' : 'Open original file'}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gcu-red underline-offset-4 hover:underline"
        >
          {previewUrl ? 'Open original image' : 'Open uploaded file'}
        </a>
      </div>
    </div>
  )
}
