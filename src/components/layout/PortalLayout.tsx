import { Outlet } from "react-router";
import { PortalHeader } from "@/components/layout/PortalHeader";

export function PortalLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
