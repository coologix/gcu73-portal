interface UploadedMediaPreviewProps {
  url: string
  label: string
  fileName?: string | null
}

const IMAGE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i

function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return IMAGE_EXTENSION_PATTERN.test(pathname)
  } catch {
    return IMAGE_EXTENSION_PATTERN.test(url)
  }
}

export function UploadedMediaPreview({
  url,
  label,
  fileName,
}: UploadedMediaPreviewProps) {
  const isImage = isImageUrl(url)

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
        <img
          src={url}
          alt={label}
          loading="lazy"
          className="block max-h-[28rem] w-full max-w-md object-contain"
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-gcu-cream-dark px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gcu-brown">
          Inline preview
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gcu-red underline-offset-4 hover:underline"
        >
          Open original image
        </a>
      </div>
    </div>
  )
}
