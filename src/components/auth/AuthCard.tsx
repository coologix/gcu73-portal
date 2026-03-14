import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gcu-cream font-sans">
      {/* Brand accent bar */}
      <div className="h-1 bg-gradient-to-r from-gcu-maroon via-gcu-red to-gcu-gold" />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card
          className={cn(
            "w-full max-w-md border-gcu-cream-dark shadow-xl shadow-gcu-maroon/5",
            className,
          )}
        >
          <CardContent className="pt-8 pb-6">
            {/* Branding — all centered, single font */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-gcu-maroon">
                <GraduationCap className="size-6 text-white" />
              </div>
              <h1 className="mt-4 text-lg font-bold tracking-tight text-gcu-maroon-dark">
                Government College Umuahia
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Class of &apos;73 &middot; Group Life Insurance Portal
              </p>
            </div>

            {/* Form content */}
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
