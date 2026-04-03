"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AgentSidebar } from "./AgentSidebar";

interface AgentLayoutProps {
  children: React.ReactNode;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden md:fixed md:inset-y-0 md:flex">
        <AgentSidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <button
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </button>
        <span className="font-bold">Agent Dashboard</span>
      </header>

      <main className="w-full md:pl-64">
        <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 sm:px-4 md:px-8 md:pt-6">
          {children}
        </div>
      </main>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-background pb-4 pt-5">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="sr-only">Close sidebar</span>
                <span className="text-2xl text-white">&times;</span>
              </button>
            </div>
            <div className="flex shrink-0 items-center px-4">
              <span className="text-xl font-bold">Bingo Agent</span>
            </div>
            <div className="mt-5 h-full overflow-y-auto">
              <AgentSidebar
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
