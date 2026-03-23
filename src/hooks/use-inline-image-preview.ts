import { useEffect, useState } from 'react'
import {
  createHeicPreviewUrl,
  isHeicLikeUrl,
  isInlinePreviewableImageUrl,
} from '@/lib/media-files'

export function useInlineImagePreview(url: string | null | undefined) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    setError(null)

    if (!url) {
      setPreviewUrl(null)
      setIsLoading(false)
      return () => {
        objectUrl = null
      }
    }

    if (isInlinePreviewableImageUrl(url)) {
      setPreviewUrl(url)
      setIsLoading(false)
      return () => {
        objectUrl = null
      }
    }

    if (!isHeicLikeUrl(url)) {
      setPreviewUrl(null)
      setIsLoading(false)
      return () => {
        objectUrl = null
      }
    }

    setPreviewUrl(null)
    setIsLoading(true)

    void (async () => {
      try {
        const nextPreviewUrl = await createHeicPreviewUrl(url)
        if (cancelled) {
          URL.revokeObjectURL(nextPreviewUrl)
          return
        }

        objectUrl = nextPreviewUrl
        setPreviewUrl(nextPreviewUrl)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to preview this HEIC image in the browser.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [url])

  return {
    previewUrl,
    isLoading,
    error,
    isHeic: Boolean(url && isHeicLikeUrl(url)),
  }
}
