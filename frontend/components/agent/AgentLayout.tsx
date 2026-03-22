"use client";

import { AgentSidebar } from "./AgentSidebar";

interface AgentLayoutProps {
  children: React.ReactNode;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="min-h-screen  w-full flex flex-col">
      {/* Desktop Sidebar */}
      <AgentSidebar />

      {/* Main Content */}
      <div className="md:pl-64">
        <div className=" md:container max-w-95  sm:max-w-7xl mx-auto p-4 md:p-8 pt-6 pb-8 md:pb-8">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
    </div>
  );
}
