"use client";

import type { ReactNode } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
