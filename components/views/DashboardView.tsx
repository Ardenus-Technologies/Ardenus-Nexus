"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, TimeEntryList, CategoryManager, Summary } from "@/components/time-tracker";
import { MyTasksSection } from "@/components/dashboard";
import { DEFAULT_CATEGORIES, type Category, type Tag, type TimeEntry } from "@/types";
import {
  TimeEntryFilters,
  FilterState,
  filterEntries,
  defaultFilters,
} from "@/components/time-tracker/TimeEntryFilters";

interface DashboardViewProps {
  compact?: boolean;
}

export function DashboardView({ compact = false }: DashboardViewProps) {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState<Tag[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showTimeEntries, setShowTimeEntries] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        setError("Failed to load categories");
      }
    } catch {
      setError("Failed to load categories");
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch {
      // Tags are optional
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries");
      if (res.ok) {
        const data = await res.json();
        const entriesWithDates = data.map((e: TimeEntry & { startTime: string; endTime: string | null }) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: e.endTime ? new Date(e.endTime) : null,
        }));
        setEntries(entriesWithDates);
      } else {
        setError("Failed to load time entries");
      }
    } catch {
      setError("Failed to load time entries");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([fetchCategories(), fetchTags(), fetchEntries()]).then(() => {
        setIsLoaded(true);
      });
    }
  }, [status, fetchCategories, fetchTags, fetchEntries]);

  const handleTimeEntryComplete = async (entry: Omit<TimeEntry, "id">) => {
    setError(null);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: entry.categoryId,
          tagId: entry.tagId || null,
          description: entry.description,
          startTime: entry.startTime.toISOString(),
          endTime: entry.endTime?.toISOString() || null,
          duration: entry.duration,
        }),
      });

      if (res.ok) {
        const newEntry = await res.json();
        setEntries((prev) => [
          {
            ...newEntry,
            startTime: new Date(newEntry.startTime),
            endTime: newEntry.endTime ? new Date(newEntry.endTime) : null,
          },
          ...prev,
        ]);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save time entry");
      }
    } catch {
      setError("Failed to save time entry");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete entry");
      }
    } catch {
      setError("Failed to delete entry");
    }
  };

  const handleEditEntry = async (id: string, updates: { categoryId: string; tagId: string | null; description: string; startTime: string; endTime: string; duration: number }) => {
    setError(null);
    const res = await fetch(`/api/time-entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                categoryId: updated.categoryId,
                tagId: updated.tagId,
                description: updated.description,
                startTime: new Date(updated.startTime),
                endTime: updated.endTime ? new Date(updated.endTime) : null,
                duration: updated.duration,
              }
            : e
        )
      );
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update entry");
      throw new Error(data.error || "Failed to update entry");
    }
  };

  const handleAddCategory = async (category: Category) => {
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, color: category.color }),
      });

      if (res.ok) {
        const newCategory = await res.json();
        setCategories((prev) => [...prev, newCategory]);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create category");
      }
    } catch {
      setError("Failed to create category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setError(null);
    const hasEntries = entries.some((e) => e.categoryId === id);
    if (hasEntries) {
      setError("Cannot delete category with existing time entries");
      return;
    }
    if (categories.length <= 1) {
      setError("Must have at least one category");
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete category");
      }
    } catch {
      setError("Failed to delete category");
    }
  };

  const filteredEntries = useMemo(() => {
    const entriesForFilter = entries.map((e) => ({
      ...e,
      startTime: e.startTime instanceof Date ? e.startTime.toISOString() : e.startTime,
    }));
    const filtered = filterEntries(entriesForFilter, filters);
    return filtered.map((e) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: e.endTime ? new Date(e.endTime) : null,
    })) as TimeEntry[];
  }, [entries, filters]);

  if (status === "loading" || (status === "authenticated" && !isLoaded)) {
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
      <div className={compact ? "" : "max-w-[1400px] mx-auto"}>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="ml-4 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={compact ? "mb-4" : "mb-6"}
        >
          <h1 className={compact ? "text-heading-3 font-heading" : "text-display-2 font-heading"}>Nexus</h1>
        </motion.div>

        <div className={compact ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,350px)] gap-fluid-lg"}>
          <div className="space-y-8 min-w-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Timer categories={categories} tags={tags} onTimeEntryComplete={handleTimeEntryComplete} />
            </motion.div>

            {session?.user && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                <MyTasksSection currentUserId={session.user.id} isAdmin={session.user.role === "admin"} />
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <button
                onClick={() => setShowTimeEntries((v) => !v)}
                className="flex items-center gap-2 w-full text-left mb-3 group"
              >
                <svg
                  className={`w-4 h-4 text-white/40 transition-transform duration-200 ${showTimeEntries ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  Time Entries
                </span>
                <span className="text-xs text-white/30">{entries.length}</span>
              </button>
              <AnimatePresence>
                {showTimeEntries && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-8"
                  >
                    <TimeEntryFilters filters={filters} onFiltersChange={setFilters} categories={categories} showUserFilter={false} />
                    <TimeEntryList
                      entries={filteredEntries}
                      categories={categories}
                      tags={tags}
                      onDeleteEntry={handleDeleteEntry}
                      onEditEntry={handleEditEntry}
                      totalCount={entries.length}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="space-y-8 min-w-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <CategoryManager
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                isAdmin={session?.user?.role === "admin"}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Summary entries={entries} categories={categories} />
            </motion.div>
          </div>
        </div>

        {!compact && (
          <motion.footer
            className="mt-16 pt-8 border-t border-white/10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-white/50 text-sm">Ardenus Nexus</p>
          </motion.footer>
        )}
      </div>
    </main>
  );
}
