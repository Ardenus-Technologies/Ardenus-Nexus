"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Don't render on login page
  if (pathname === "/login") return null;

  // Don't render until session is available
  if (!session?.user) return null;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <motion.header
      className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm border-b border-white/5 px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-4 w-full"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="cursor-pointer flex-shrink-0"
        onClick={() => router.push("/")}
        role="button"
        tabIndex={0}
        aria-label="Go to home page"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/"); }}
      >
        <p className="text-eyebrow mb-0.5">Ardenus</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink min-w-0">
        <div className="text-right hidden lg:block min-w-0">
          <p className="text-white font-medium truncate">{session.user.name}</p>
          <p className="text-white/60 text-sm truncate">{session.user.email}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/team")}
          aria-label="Team"
        >
          <svg
            className="w-4 h-4 sm:mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="hidden sm:inline">Team</span>
        </Button>

        {session.user.role === "admin" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/stats")}
            >
              <span className="hidden sm:inline">Stats</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/users")}
            >
              <span className="hidden sm:inline">Admin</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </>
        )}

        <Button variant="secondary" size="sm" onClick={handleSignOut} className="whitespace-nowrap">
          <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </motion.header>
  );
}
