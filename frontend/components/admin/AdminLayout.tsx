"use client";

import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="md:pl-64">
        <div className="container max-w-7xl mx-auto p-4 md:p-8 pt-6 pb-28 md:pb-8">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
    </div>
  );
}
