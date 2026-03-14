import { useState, forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** When true, uses inputMode="numeric" (useful for NIN/BVN fields) */
  numeric?: boolean
  error?: boolean
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, numeric, error, ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          inputMode={numeric ? 'numeric' : undefined}
          autoComplete="off"
          className={cn(
            'w-full bg-transparent border-0 border-b-2 border-muted-foreground/30',
            'text-2xl font-light tracking-wide',
            'py-3 pr-12 outline-none transition-colors',
            'placeholder:text-muted-foreground/40',
            'focus:border-primary',
            error && 'border-destructive focus:border-destructive',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2',
            'p-2 text-muted-foreground/60 hover:text-foreground',
            'transition-colors',
          )}
          tabIndex={-1}
          aria-label={visible ? 'Hide value' : 'Show value'}
        >
          {visible ? (
            <EyeOff className="size-5" />
          ) : (
            <Eye className="size-5" />
          )}
        </button>
      </div>
    )
  },
)

MaskedInput.displayName = 'MaskedInput'
