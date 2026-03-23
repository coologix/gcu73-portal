const INLINE_IMAGE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i
const HEIC_EXTENSION_PATTERN = /\.(heic|heif)$/i
const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
])

function getPathname(value: string): string {
  try {
    return new URL(value).pathname
  } catch {
    return value
  }
}

function getJpegName(fileName: string): string {
  return fileName.replace(/\.(heic|heif)$/i, '.jpg')
}

async function convertHeicBlobToJpeg(blob: Blob): Promise<Blob> {
  const module = await import('heic2any')
  const heic2any = module.default
  const converted = await heic2any({
    blob,
    toType: 'image/jpeg',
    quality: 0.92,
  })

  const jpegBlob = Array.isArray(converted) ? converted[0] : converted
  if (!(jpegBlob instanceof Blob)) {
    throw new Error('Unable to convert HEIC image for preview.')
  }

  return jpegBlob
}

export function isHeicLikeFile(file: Pick<File, 'name' | 'type'>): boolean {
  return HEIC_MIME_TYPES.has(file.type.toLowerCase()) || HEIC_EXTENSION_PATTERN.test(file.name)
}

export function isHeicLikeUrl(url: string): boolean {
  return HEIC_EXTENSION_PATTERN.test(getPathname(url))
}

export function isInlinePreviewableImageUrl(url: string): boolean {
  return INLINE_IMAGE_EXTENSION_PATTERN.test(getPathname(url))
}

export async function normalizeUploadedImage(file: File): Promise<{
  file: File
  converted: boolean
}> {
  if (!isHeicLikeFile(file)) {
    return { file, converted: false }
  }

  const jpegBlob = await convertHeicBlobToJpeg(file)
  return {
    file: new File([jpegBlob], getJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    }),
    converted: true,
  }
}

export async function createHeicPreviewUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Unable to load this HEIC image for preview.')
  }

  const jpegBlob = await convertHeicBlobToJpeg(await response.blob())
  return URL.createObjectURL(jpegBlob)
}
