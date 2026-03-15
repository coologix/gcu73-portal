import { cn } from "@/lib/utils";

interface SchoolLogoProps {
  className?: string;
}

export function SchoolLogo({ className }: SchoolLogoProps) {
  return (
    <img
      src="/school-logo.png"
      alt="Government College Umuahia crest"
      className={cn("object-contain", className)}
    />
  );
}
