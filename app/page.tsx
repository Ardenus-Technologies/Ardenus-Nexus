"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Timer, TimeEntryList, CategoryManager, Summary } from "@/components/time-tracker";
import { DEFAULT_CATEGORIES, type Category, type Tag, type TimeEntry } from "@/types";
import {
  TimeEntryFilters,
  FilterState,
  filterEntries,
  defaultFilters,
} from "@/components/time-tracker/TimeEntryFilters";

export default function Home() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState<Tag[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // Fetch categories from API
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

  // Fetch tags from API
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch {
      // Tags are optional, don't set error
    }
  }, []);

  // Fetch entries from API
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries");
      if (res.ok) {
        const data = await res.json();
        // Convert date strings to Date objects
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

  // Load data on mount
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

  const handleEditEntry = async (id: string, updates: { categoryId: string; tagId: string | null; description: string }) => {
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
    // Don't delete if there are entries using this category
    const hasEntries = entries.some((e) => e.categoryId === id);
    if (hasEntries) {
      setError("Cannot delete category with existing time entries");
      return;
    }
    // Don't delete if it's the last category
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

  // Filter entries based on current filters (convert Date to string for filtering)
  const filteredEntries = useMemo(() => {
    const entriesForFilter = entries.map((e) => ({
      ...e,
      startTime: e.startTime instanceof Date ? e.startTime.toISOString() : e.startTime,
    }));
    const filtered = filterEntries(entriesForFilter, filters);
    // Convert back to Date objects
    return filtered.map((e) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: e.endTime ? new Date(e.endTime) : null,
    })) as TimeEntry[];
  }, [entries, filters]);

  if (status === "loading" || (status === "authenticated" && !isLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <main id="main-content" className="min-h-screen container-margins section-py-lg">
      <div className="max-w-[1400px] mx-auto">
        {/* Error message */}
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
          className="mb-6"
        >
          <h1 className="text-display-2 font-heading">Nexus</h1>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-[1fr_minmax(0,350px)] gap-fluid-lg">
          {/* Left Column - Timer and Entries */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Timer
                categories={categories}
                tags={tags}
                onTimeEntryComplete={handleTimeEntryComplete}
              />
            </motion.div>

            {/* Filters for personal entries */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <TimeEntryFilters
                filters={filters}
                onFiltersChange={setFilters}
                categories={categories}
                showUserFilter={false}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TimeEntryList
                entries={filteredEntries}
                categories={categories}
                tags={tags}
                onDeleteEntry={handleDeleteEntry}
                onEditEntry={handleEditEntry}
                totalCount={entries.length}
              />
            </motion.div>
          </div>

          {/* Right Column - Categories and Summary */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CategoryManager
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                isAdmin={session?.user?.role === 'admin'}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Summary entries={entries} categories={categories} />
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          className="mt-16 pt-8 border-t border-white/10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-white/50 text-sm">
            Ardenus Time Tracker
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
