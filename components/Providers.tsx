"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { MultiPaneProvider } from "@/components/MultiPaneContext";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <MotionConfig reducedMotion="user">
        <MultiPaneProvider>{children}</MultiPaneProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
