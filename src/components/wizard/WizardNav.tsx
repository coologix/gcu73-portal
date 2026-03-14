import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WizardNavProps {
  isFirstStep: boolean
  isLastStep: boolean
  isSubmitting: boolean
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
}

export function WizardNav({
  isFirstStep,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: WizardNavProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-50',
        'bg-background/80 backdrop-blur-lg border-t border-border/50',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
    >
      <div className="flex items-center justify-between max-w-lg mx-auto px-6 py-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          disabled={isFirstStep}
          className={cn(
            'min-h-12 min-w-12 gap-2',
            isFirstStep && 'invisible',
          )}
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        {/* Desktop keyboard hint */}
        <span className="hidden md:block text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Enter ↵</kbd> to continue
        </span>

        {/* Next / Submit button */}
        {isLastStep ? (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="min-h-12 min-w-[120px] gap-2 bg-gcu-red hover:bg-gcu-red-hover text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              <>
                <Check className="size-5" />
                Submit
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="min-h-12 min-w-[100px] gap-2"
          >
            OK
            <ChevronRight className="size-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
