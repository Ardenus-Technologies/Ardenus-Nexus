"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate, formatTimeOfDay } from "@/lib/utils";
import { EditEntryModal } from "./EditEntryModal";
import type { Category, Tag, TimeEntry } from "@/types";

const PAGE_SIZE = 20;

interface TimeEntryListProps {
  entries: TimeEntry[];
  categories: Category[];
  tags?: Tag[];
  onDeleteEntry: (id: string) => void;
  onEditEntry?: (id: string, updates: { categoryId: string; tagId: string | null; description: string; startTime: string; endTime: string; duration: number }) => Promise<void>;
  totalCount?: number;
}

export function TimeEntryList({
  entries,
  categories,
  tags = [],
  onDeleteEntry,
  onEditEntry,
  totalCount,
}: TimeEntryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when entries change (e.g. filters applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [entries.length]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return entries.slice(start, start + PAGE_SIZE);
  }, [entries, currentPage]);

  const getCategoryName = (categoryId: string): string => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  const getCategoryColor = (categoryId: string): string => {
    return categories.find((c) => c.id === categoryId)?.color || "#ffffff";
  };

  const getTagName = (tagId: string | null | undefined): string | null => {
    if (!tagId) return null;
    return tags.find((t) => t.id === tagId)?.name || null;
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteEntry(id);
    setDeletingId(null);
  };

  // Group paginated entries by date
  const groupedEntries = paginatedEntries.reduce(
    (groups, entry) => {
      const date = formatDate(new Date(entry.startTime));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    },
    {} as Record<string, TimeEntry[]>
  );

  const weekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday as start of week
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const weeklyDuration = useMemo(
    () =>
      entries
        .filter((e) => new Date(e.startTime) >= weekStart)
        .reduce((sum, e) => sum + e.duration, 0),
    [entries, weekStart]
  );

  if (entries.length === 0) {
    const hasFilters = totalCount !== undefined && totalCount > 0;
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-white/60 text-lg">
            {hasFilters ? "No entries match your filters" : "No time entries yet"}
          </p>
          <p className="text-white/50 text-sm mt-2">
            {hasFilters
              ? "Try adjusting your search or filter criteria"
              : "Start the timer to track your work"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isFiltered = totalCount !== undefined && totalCount !== entries.length;

  return (
    <Card hover={false}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          {isFiltered && (
            <p className="text-white/60 text-sm">
              Showing {entries.length} of {totalCount}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-eyebrow">This Week</p>
          <p className="text-xl font-heading">{formatDuration(weeklyDuration)}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {Object.entries(groupedEntries).map(([date, dateEntries]) => (
          <div key={date}>
            <div className="px-4 py-2 sm:px-6 sm:py-3 bg-white/5 border-b border-white/10">
              <span className="text-eyebrow">{date}</span>
              <span className="text-white/60 ml-4 text-sm">
                {formatDuration(
                  dateEntries.reduce((sum, e) => sum + e.duration, 0)
                )}
              </span>
            </div>
            <AnimatePresence mode="popLayout">
              {dateEntries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors"
                >
                  {deletingId === entry.id ? (
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <p className="text-white/70 text-sm">Delete this entry?</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleConfirmDelete(entry.id)}
                          variant="primary"
                          size="sm"
                          className="bg-red-600 border-red-600 hover:bg-transparent hover:text-red-400"
                        >
                          Delete
                        </Button>
                        <Button
                          onClick={() => setDeletingId(null)}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Category indicator */}
                      <div
                        className="w-1 h-8 sm:h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryColor(entry.categoryId) }}
                      />

                      {/* Entry details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white truncate">{entry.description}</p>
                          {getTagName(entry.tagId) && (
                            <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-white/70 flex-shrink-0">
                              {getTagName(entry.tagId)}
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm">
                          {getCategoryName(entry.categoryId)} •{" "}
                          {formatTimeOfDay(new Date(entry.startTime))}
                          {entry.endTime &&
                            ` - ${formatTimeOfDay(new Date(entry.endTime))}`}
                        </p>
                      </div>

                      {/* Duration + Actions */}
                      <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
                        <div className="text-right">
                          <p className="font-heading tabular-nums">
                            {formatDuration(entry.duration)}
                          </p>
                        </div>

                        {/* Edit button */}
                        {onEditEntry && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEntry(entry)}
                            aria-label={`Edit time entry: ${entry.description}`}
                            className="opacity-60 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Button>
                        )}

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(entry.id)}
                          aria-label={`Delete time entry: ${entry.description}`}
                          className="opacity-60 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </CardContent>

      {totalPages > 1 && (
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-white/50 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {onEditEntry && (
        <EditEntryModal
          entry={editingEntry}
          categories={categories}
          tags={tags}
          isOpen={editingEntry !== null}
          onClose={() => setEditingEntry(null)}
          onSave={async (id, updates) => {
            await onEditEntry(id, updates);
            setEditingEntry(null);
          }}
        />
      )}
    </Card>
  );
}
