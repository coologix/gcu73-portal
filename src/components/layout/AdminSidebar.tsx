import { useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Mail,
  Bell,
  Download,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Forms", href: "/admin/forms", icon: FileText },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Invitations", href: "/admin/invitations", icon: Mail },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Export", href: "/admin/export", icon: Download },
] as const;

interface AdminSidebarProps {
  /** Whether the sidebar is collapsed (icon-only mode). */
  collapsed?: boolean;
  /** Called when the user toggles the collapsed state. */
  onToggle?: () => void;
  /** Called when a nav item is clicked (useful to close mobile sheet). */
  onNavigate?: () => void;
  className?: string;
}

export function AdminSidebar({
  collapsed = false,
  onToggle,
  onNavigate,
  className,
}: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href: string) => {
    if (href === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        "flex h-full flex-col gap-1 border-r border-gcu-cream-dark bg-background p-2",
        collapsed ? "w-[56px]" : "w-56",
        className,
      )}
    >
      <div className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Button
              key={href}
              variant={active ? "secondary" : "ghost"}
              size={collapsed ? "icon" : "default"}
              className={cn(
                "justify-start gap-2 transition-colors",
                collapsed && "justify-center",
                active
                  ? "font-semibold bg-gcu-cream-dark text-gcu-maroon hover:bg-gcu-cream-dark hover:text-gcu-maroon"
                  : "text-gcu-brown hover:bg-gcu-cream/80 hover:text-gcu-maroon-dark",
              )}
              onClick={() => {
                navigate(href);
                onNavigate?.();
              }}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-gcu-maroon")} />
              {!collapsed && <span>{label}</span>}
            </Button>
          );
        })}
      </div>

      {/* Desktop collapse toggle */}
      {onToggle && (
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "justify-start gap-2 text-gcu-brown hover:text-gcu-maroon-dark",
            collapsed && "justify-center",
          )}
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      )}
    </nav>
  );
}
