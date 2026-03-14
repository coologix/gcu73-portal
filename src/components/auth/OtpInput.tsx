import { useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

interface OtpInputProps {
  /** Called with the full 6-digit code whenever any digit changes. */
  onChange: (code: string) => void;
  /** The current value (up to 6 chars). */
  value?: string;
  /** Disable all inputs. */
  disabled?: boolean;
  className?: string;
}

export function OtpInput({
  onChange,
  value = "",
  disabled = false,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").slice(0, OTP_LENGTH);
  while (digits.length < OTP_LENGTH) digits.push("");

  const setRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    [],
  );

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const emitChange = (nextDigits: string[]) => {
    onChange(nextDigits.join(""));
  };

  const handleInput = (index: number, char: string) => {
    if (!/^\d$/.test(char)) return;

    const next = [...digits];
    next[index] = char;
    emitChange(next);

    if (index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];

      if (digits[index]) {
        // Clear the current digit
        next[index] = "";
        emitChange(next);
      } else if (index > 0) {
        // Move to previous and clear it
        next[index - 1] = "";
        emitChange(next);
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    emitChange(next);

    // Focus the next empty input or the last one
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    focusInput(focusIdx);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={setRef(index)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={digit}
          className="h-12 w-12 min-h-[48px] min-w-[48px] text-center text-2xl font-semibold"
          onChange={(e) => {
            const char = e.target.value.slice(-1);
            handleInput(index, char);
          }}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
