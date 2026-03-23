"use client";

import { AgentSidebar } from "./AgentSidebar";
import { AgentBottomNav } from "./AgentBottomNav";

interface AgentLayoutProps {
  children: React.ReactNode;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex">
        <AgentSidebar />
      </aside>

      {/* Main Content */}
      <div className="w-full md:pl-64">
        <div className="mx-auto w-full max-w-7xl px-3 pb-24 pt-4 sm:px-4 md:px-8 md:pb-8 md:pt-6">
          {children}
        </div>
      </div>

      <AgentBottomNav />
    </div>
  );
}
