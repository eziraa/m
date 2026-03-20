"use client";

import { ReactNode } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface AdminSectionLayoutProps {
  children: ReactNode;
}

export default function AdminSectionLayout({
  children,
}: AdminSectionLayoutProps) {
  return <AdminLayout>{children}</AdminLayout>;
}
