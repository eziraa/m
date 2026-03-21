"use client";

import { ReactNode } from "react";
import { AgentLayout } from "@/components/agent/AgentLayout";

interface AgentSectionLayoutProps {
  children: ReactNode;
}

export default function AgentSectionLayout({
  children,
}: AgentSectionLayoutProps) {
  return <AgentLayout>{children}</AgentLayout>;
}
