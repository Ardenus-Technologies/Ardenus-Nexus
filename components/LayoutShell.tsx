"use client";

import { useMultiPane } from "@/components/MultiPaneContext";
import { MultiPaneLayout } from "@/components/multi-pane";

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const { isMultiPane } = useMultiPane();

  if (isMultiPane) {
    return <MultiPaneLayout />;
  }

  return <>{children}</>;
}
