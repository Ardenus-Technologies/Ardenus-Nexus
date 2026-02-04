"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate, formatTimeOfDay } from "@/lib/utils";
import type { Category, Tag, TimeEntry } from "@/types";

interface TimeEntryListProps {
  entries: TimeEntry[];
  categories: Category[];
  tags?: Tag[];
  onDeleteEntry: (id: string) => void;
  totalCount?: number; // Total entries before filtering
}

export function TimeEntryList({
  entries,
  categories,
  tags = [],
  onDeleteEntry,
  totalCount,
}: TimeEntryListProps) {
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

  // Group entries by date
  const groupedEntries = entries.reduce(
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

  const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);

  if (entries.length === 0) {
    const hasFilters = totalCount !== undefined && totalCount > 0;
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-white/50 text-lg">
            {hasFilters ? "No entries match your filters" : "No time entries yet"}
          </p>
          <p className="text-white/30 text-sm mt-2">
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
          <h2 className="text-heading-3 font-heading">Time Entries</h2>
          {isFiltered && (
            <p className="text-white/50 text-sm mt-1">
              Showing {entries.length} of {totalCount}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-eyebrow">Total</p>
          <p className="text-xl font-heading">{formatDuration(totalDuration)}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {Object.entries(groupedEntries).map(([date, dateEntries]) => (
          <div key={date}>
            <div className="px-6 py-3 bg-white/5 border-b border-white/10">
              <span className="text-eyebrow">{date}</span>
              <span className="text-white/30 ml-4 text-sm">
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
                  className="px-6 py-4 border-b border-white/5 last:border-0 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors"
                >
                  {/* Category indicator */}
                  <div
                    className="w-1 h-10 rounded-full"
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
                    <p className="text-white/40 text-sm">
                      {getCategoryName(entry.categoryId)} •{" "}
                      {formatTimeOfDay(new Date(entry.startTime))}
                      {entry.endTime &&
                        ` - ${formatTimeOfDay(new Date(entry.endTime))}`}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="text-right">
                    <p className="font-heading tabular-nums">
                      {formatDuration(entry.duration)}
                    </p>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteEntry(entry.id)}
                    aria-label={`Delete time entry: ${entry.description}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
