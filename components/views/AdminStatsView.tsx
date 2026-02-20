"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Card, CardContent, Select } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

const StatsChart = dynamic(() => import("@/components/admin/StatsChart"), {
  ssr: false,
});

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalSeconds: number;
  entryCount: number;
}

interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  totalSeconds: number;
  entryCount: number;
  categories: CategoryStats[];
}

interface AdminStatsViewProps {
  compact?: boolean;
}

export function AdminStatsView({ compact = false }: AdminStatsViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats[]>([]);
  const [period, setPeriod] = useState("week");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session && session.user?.role !== "admin") {
      if (compact) return; // In compact mode, show inline message instead of redirecting
      router.push("/");
    }
  }, [session, router, compact]);

  const fetchStats = useCallback(async (p: string) => {
    try {
      const res = await fetch(`/api/admin/stats?period=${p}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      setError("Failed to load statistics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchStats(period);
  }, [period, fetchStats]);

  // In compact mode, show access denied inline instead of redirecting
  if (compact && session && session.user?.role !== "admin") {
    return (
      <div className="h-full flex items-center justify-center text-white/50">
        <p>Admin access required</p>
      </div>
    );
  }

  const teamTotalSeconds = stats.reduce((sum, u) => sum + u.totalSeconds, 0);
  const teamTotalEntries = stats.reduce((sum, u) => sum + u.entryCount, 0);
  const activeUsers = stats.filter((u) => u.totalSeconds > 0).length;

  if (isLoading) {
    return (
      <div className={compact ? "h-full flex items-center justify-center" : "min-h-screen flex items-center justify-center"}>
        <div role="status">
          <motion.div
            className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <main className={compact ? "h-full overflow-y-auto p-4" : "min-h-screen container-margins section-py-lg"}>
      <div className={compact ? "" : "max-w-[1200px] mx-auto"}>
        <motion.div
          className={compact ? "mb-6 flex flex-col gap-4" : "mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4"}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="text-eyebrow mb-2">Admin</p>
            <h1 className={compact ? "text-heading-3 font-heading" : "text-display-3 font-heading"}>Team Statistics</h1>
          </div>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-40"
            aria-label="Time period"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </Select>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="alert"
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card hover={false}>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-heading tabular-nums">{formatDuration(teamTotalSeconds)}</p>
                  <p className="text-white/50 text-sm mt-1">Total Hours</p>
                </div>
                <div>
                  <p className="text-2xl font-heading tabular-nums">{teamTotalEntries}</p>
                  <p className="text-white/50 text-sm mt-1">Total Entries</p>
                </div>
                <div>
                  <p className="text-2xl font-heading tabular-nums">{activeUsers}</p>
                  <p className="text-white/50 text-sm mt-1">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <StatsChart
            users={stats.map((u) => ({ userId: u.userId, userName: u.userName }))}
            period={period}
          />
        </motion.div>

        <div className="space-y-2">
          {stats.map((user, i) => {
            const userTotal = user.totalSeconds;
            return (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
              >
                <Card hover={false}>
                  <CardContent className="!py-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="min-w-[200px] flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.userName}</p>
                          {user.userRole === "admin" && (
                            <span className="text-xs uppercase tracking-wider text-yellow-400">admin</span>
                          )}
                        </div>
                        <p className="text-white/50 text-sm">{user.userEmail}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-lg font-heading tabular-nums">{formatDuration(user.totalSeconds)}</p>
                        <p className="text-white/50 text-xs">
                          {user.entryCount} {user.entryCount === 1 ? "entry" : "entries"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {user.categories.length > 0 ? (
                          user.categories.map((cat) => {
                            const percentage = userTotal > 0 ? Math.round((cat.totalSeconds / userTotal) * 100) : 0;
                            return (
                              <div key={cat.categoryId} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
                                <span className="text-sm text-white/70">{cat.categoryName}</span>
                                <span className="text-sm font-heading tabular-nums">{formatDuration(cat.totalSeconds)}</span>
                                <span className="text-white/40 text-xs">({percentage}%)</span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-white/40 text-sm">No entries</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {stats.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-white/50">No users found</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
