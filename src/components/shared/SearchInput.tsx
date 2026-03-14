import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  /** Called with the debounced search value. */
  onChange: (value: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Debounce delay in ms (default 300). */
  delay?: number;
  /** External controlled value (optional). */
  value?: string;
  className?: string;
}

export function SearchInput({
  onChange,
  placeholder = "Search...",
  delay = 300,
  value: controlledValue,
  className,
}: SearchInputProps) {
  const [internal, setInternal] = useState(controlledValue ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep in sync if parent changes the controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternal(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (next: string) => {
    setInternal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, delay);
  };

  const handleClear = () => {
    setInternal("");
    onChange("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-8 pr-8"
      />
      {internal && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
