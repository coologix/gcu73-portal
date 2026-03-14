import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { GraduationCap, LayoutDashboard, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PortalHeaderProps {
  /** Slot for extra content on the left (e.g. mobile hamburger). */
  leading?: React.ReactNode;
  className?: string;
}

export function PortalHeader({ leading, className }: PortalHeaderProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 shrink-0 items-center border-b bg-background/95 px-4 shadow-sm shadow-gcu-maroon/5 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-2">
        {leading}
        <Button
          variant="ghost"
          className="gap-2 px-2 text-base font-bold tracking-tight text-gcu-maroon-dark hover:text-gcu-maroon"
          onClick={() => navigate("/dashboard")}
        >
          <GraduationCap className="size-5 text-gcu-maroon" />
          GCU&apos;73 Portal
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-1">
        <NotificationBell
          count={0}
          onClick={() => navigate("/notifications")}
        />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-full hover:bg-muted transition-colors outline-none">
              <Avatar size="sm">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "User"} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {profile?.full_name ?? "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.email ?? ""}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="mr-2 size-4" />
              Dashboard
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
