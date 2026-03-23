"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Menu } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex">
        <AdminSidebar />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </button>
        <span className="font-bold">Admin Dashboard</span>
      </header>

      {/* Main Content */}
      <main className="md:pl-64">
        <div className="container max-w-7xl mx-auto p-4 md:p-8 pt-6">
          {children}
        </div>
      </main>

      {/* Mobile Drawer (Simple implementation for now) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-background pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="sr-only">Close sidebar</span>
                <span className="text-white text-2xl">&times;</span>
              </button>
            </div>
            <div className="flex shrink-0 items-center px-4">
              <span className="font-bold text-xl">Bingo Admin</span>
            </div>
            <div className="mt-5 h-full overflow-y-auto">
              <AdminSidebar
                className="w-full border-0"
                onNavigate={() => setIsMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
