"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui";
import { formatTime, formatDuration, formatDate, formatTimeOfDay } from "@/lib/utils";
import {
  TimeEntryFilters,
  FilterState,
  filterEntries,
  defaultFilters,
} from "@/components/time-tracker/TimeEntryFilters";
import { RoomList } from "@/components/RoomList";
import type { Room } from "@/types";

interface ActiveTimer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
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
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
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

interface TeamViewProps {
  compact?: boolean;
}

export function TeamView({ compact = false }: TeamViewProps) {
  const { data: session, status } = useSession();
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [entries, setEntries] = useState<TeamEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchActiveTimers = useCallback(async () => {
    try {
      const res = await fetch("/api/team/active");
      if (res.ok) {
        const data = await res.json();
        setActiveTimers(data);
      }
    } catch {
      setError("Failed to load active timers");
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/team/entries");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      setError("Failed to load team entries");
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      setError("Failed to load categories");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
      }
    } catch {
      setError("Failed to load users");
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch {
      setError("Failed to load rooms");
    }
  }, []);

  const handleJoinRoom = useCallback(async (roomId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await fetchRooms();
        return data.meetLink || null;
      }
      if (res.status === 403) {
        const data = await res.json();
        setError(data.error || "You must be clocked in to join a room");
      }
    } catch {
      setError("Failed to join room");
    }
    return null;
  }, [fetchRooms]);

  const handleLeaveRoom = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, { method: "POST" });
      if (res.ok) {
        await fetchRooms();
      }
    } catch {
      setError("Failed to leave room");
    }
  }, [fetchRooms]);

  const handleCreateRoom = useCallback(async (name: string, meetLink: string, requireClockIn: boolean) => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, meetLink: meetLink || undefined, requireClockIn }),
      });
      if (res.ok) {
        await fetchRooms();
      }
    } catch {
      setError("Failed to create room");
    }
  }, [fetchRooms]);

  const handleEditRoom = useCallback(async (id: string, name: string, meetLink: string, requireClockIn: boolean) => {
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, meetLink: meetLink || undefined, requireClockIn }),
      });
      if (res.ok) {
        await fetchRooms();
      }
    } catch {
      setError("Failed to update room");
    }
  }, [fetchRooms]);

  const handleDeleteRoom = useCallback(async (id: string, confirmation: string) => {
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (res.ok) {
        await fetchRooms();
      }
    } catch {
      setError("Failed to delete room");
    }
  }, [fetchRooms]);

  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([
        fetchActiveTimers(),
        fetchEntries(),
        fetchCategories(),
        fetchUsers(),
        fetchRooms(),
      ]).then(() => {
        setIsLoading(false);
      });

      const interval = setInterval(() => {
        fetchActiveTimers();
        fetchRooms();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, fetchActiveTimers, fetchEntries, fetchCategories, fetchUsers, fetchRooms]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers.length]);

  const getElapsed = (timer: ActiveTimer) => {
    const start = new Date(timer.startTime).getTime();
    return Math.floor((Date.now() - start) / 1000);
  };

  const filteredEntries = useMemo(() => {
    return filterEntries(entries, filters);
  }, [entries, filters]);

  // Reset to page 1 when filters change
  const prevFilteredCount = useRef(filteredEntries.length);
  useEffect(() => {
    if (filteredEntries.length !== prevFilteredCount.current) {
      setCurrentPage(1);
      prevFilteredCount.current = filteredEntries.length;
    }
  }, [filteredEntries.length]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const groupedEntries = useMemo(() => {
    return paginatedEntries.reduce(
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
  }, [paginatedEntries]);

  if (status === "loading" || isLoading) {
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
          className={compact ? "mb-6" : "mb-12"}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-eyebrow mb-2">Team</p>
          <h1 className={compact ? "text-heading-3 font-heading" : "text-display-3 font-heading"}>Activity Dashboard</h1>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="alert"
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center justify-between"
          >
            {error}
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

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
                <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{timer.userName}</p>
                            {timer.tagName && (
                              <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/70 flex-shrink-0">
                                {timer.tagName}
                              </span>
                            )}
                          </div>
                          <p className="text-white/50 text-sm truncate">{timer.categoryName}</p>
                          {timer.description && (
                            <p className="text-white/50 text-sm truncate mt-1">{timer.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-heading tabular-nums text-lg">{formatTime(getElapsed(timer))}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <RoomList
            rooms={rooms}
            currentUserId={session?.user?.id || ""}
            isAdmin={session?.user?.role === "admin"}
            isClockedIn={activeTimers.some(t => t.userId === session?.user?.id)}
            onJoin={handleJoinRoom}
            onLeave={handleLeaveRoom}
            onCreate={handleCreateRoom}
            onEdit={handleEditRoom}
            onDelete={handleDeleteRoom}
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.25 }}
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
                      <span className="text-white/50 ml-4 text-sm">
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
                        <div
                          className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.categoryColor }}
                        />
                        <div className="w-32 flex-shrink-0">
                          <p className="text-white font-medium truncate">{entry.userName}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white truncate">{entry.description}</p>
                            {entry.tagName && (
                              <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/70 flex-shrink-0">
                                {entry.tagName}
                              </span>
                            )}
                          </div>
                          <p className="text-white/60 text-sm">
                            {entry.categoryName} •{" "}
                            {formatTimeOfDay(new Date(entry.startTime))}
                            {entry.endTime &&
                              ` - ${formatTimeOfDay(new Date(entry.endTime))}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-heading tabular-nums">{formatDuration(entry.duration)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-white/50 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded border border-white/10 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded border border-white/10 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {!compact && (
          <motion.footer
            className="mt-16 pt-8 border-t border-white/10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <p className="text-white/50 text-sm">Ardenus Nexus - Team View</p>
          </motion.footer>
        )}
      </div>
    </main>
  );
}
