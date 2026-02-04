"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Card, CardHeader, CardContent } from "@/components/ui";
import { formatTime, formatDuration, formatDate, formatTimeOfDay } from "@/lib/utils";
import {
  TimeEntryFilters,
  FilterState,
  filterEntries,
  defaultFilters,
} from "@/components/time-tracker/TimeEntryFilters";

interface ActiveTimer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  description: string;
  startTime: string;
  elapsedSeconds: number;
}

interface TeamEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  description: string;
  startTime: string;
  endTime: string | null;
  duration: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  name: string;
}

export default function TeamPage() {
  const { status } = useSession();
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [entries, setEntries] = useState<TeamEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const fetchActiveTimers = useCallback(async () => {
    try {
      const res = await fetch("/api/team/active");
      if (res.ok) {
        const data = await res.json();
        setActiveTimers(data);
      }
    } catch (error) {
      console.error("Failed to fetch active timers:", error);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/team/entries");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([
        fetchActiveTimers(),
        fetchEntries(),
        fetchCategories(),
        fetchUsers(),
      ]).then(() => {
        setIsLoading(false);
      });

      // Refresh active timers every 30 seconds
      const interval = setInterval(fetchActiveTimers, 30000);
      return () => clearInterval(interval);
    }
  }, [status, fetchActiveTimers, fetchEntries, fetchCategories, fetchUsers]);

  // Update elapsed time locally every second for active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((timer) => ({
          ...timer,
          elapsedSeconds: timer.elapsedSeconds + 1,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    return filterEntries(entries, filters);
  }, [entries, filters]);

  // Group filtered entries by date
  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce(
      (groups, entry) => {
        const date = formatDate(new Date(entry.startTime));
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(entry);
        return groups;
      },
      {} as Record<string, TeamEntry[]>
    );
  }, [filteredEntries]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen container-margins section-py-lg">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.header
          className="mb-12 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="text-eyebrow mb-2">Team</p>
            <h1 className="text-display-3 font-heading">Activity Dashboard</h1>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Back to Tracker
            </Button>
          </Link>
        </motion.header>

        {/* Who's Clocked In */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card hover={false}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
                <h2 className="text-heading-3 font-heading">
                  Currently Clocked In ({activeTimers.length})
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {activeTimers.length === 0 ? (
                <p className="text-white/50 text-center py-8">
                  No one is currently clocked in
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeTimers.map((timer) => (
                    <motion.div
                      key={timer.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 border border-white/10 rounded-lg bg-white/5"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: timer.categoryColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{timer.userName}</p>
                          <p className="text-white/50 text-sm truncate">
                            {timer.categoryName}
                          </p>
                          {timer.description && (
                            <p className="text-white/30 text-sm truncate mt-1">
                              {timer.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-heading tabular-nums text-lg">
                            {formatTime(timer.elapsedSeconds)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <TimeEntryFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            users={users}
            showUserFilter={true}
          />
        </motion.div>

        {/* All Time Entries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover={false}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-heading-3 font-heading">
                  Time Entries ({filteredEntries.length})
                </h2>
                {filteredEntries.length !== entries.length && (
                  <span className="text-white/50 text-sm">
                    of {entries.length} total
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <p className="text-white/50 text-center py-12">
                  {entries.length === 0
                    ? "No time entries yet"
                    : "No entries match your filters"}
                </p>
              ) : (
                Object.entries(groupedEntries).map(([date, dateEntries]) => (
                  <div key={date}>
                    <div className="px-6 py-3 bg-white/5 border-b border-white/10">
                      <span className="text-eyebrow">{date}</span>
                      <span className="text-white/30 ml-4 text-sm">
                        {formatDuration(
                          dateEntries.reduce((sum, e) => sum + e.duration, 0)
                        )}
                      </span>
                    </div>
                    {dateEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="px-6 py-4 border-b border-white/5 last:border-0 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Category indicator */}
                        <div
                          className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.categoryColor }}
                        />

                        {/* User */}
                        <div className="w-32 flex-shrink-0">
                          <p className="text-white font-medium truncate">
                            {entry.userName}
                          </p>
                        </div>

                        {/* Entry details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate">{entry.description}</p>
                          <p className="text-white/40 text-sm">
                            {entry.categoryName} •{" "}
                            {formatTimeOfDay(new Date(entry.startTime))}
                            {entry.endTime &&
                              ` - ${formatTimeOfDay(new Date(entry.endTime))}`}
                          </p>
                        </div>

                        {/* Duration */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-heading tabular-nums">
                            {formatDuration(entry.duration)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="mt-16 pt-8 border-t border-white/10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white/30 text-sm">Ardenus Time Tracker - Team View</p>
        </motion.footer>
      </div>
    </main>
  );
}
