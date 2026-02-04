"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatDuration } from "@/lib/utils";
import type { Category, TimeEntry } from "@/types";

interface SummaryProps {
  entries: TimeEntry[];
  categories: Category[];
}

export function Summary({ entries, categories }: SummaryProps) {
  // Calculate time per category
  const categoryTotals = categories.map((category) => {
    const categoryEntries = entries.filter((e) => e.categoryId === category.id);
    const totalSeconds = categoryEntries.reduce((sum, e) => sum + e.duration, 0);
    return {
      ...category,
      totalSeconds,
      entryCount: categoryEntries.length,
    };
  });

  // Sort by total time (descending)
  categoryTotals.sort((a, b) => b.totalSeconds - a.totalSeconds);

  const totalTime = categoryTotals.reduce((sum, c) => sum + c.totalSeconds, 0);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Card hover={false}>
      <CardHeader>
        <h2 className="text-heading-3 font-heading">Summary</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryTotals.map((category, index) => {
          const percentage =
            totalTime > 0
              ? Math.round((category.totalSeconds / totalTime) * 100)
              : 0;

          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-heading tabular-nums">
                    {formatDuration(category.totalSeconds)}
                  </span>
                  <span className="text-white/40 text-xs ml-2">
                    ({percentage}%)
                  </span>
                </div>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: category.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <span className="text-eyebrow">Total Time</span>
          <span className="text-xl font-heading tabular-nums">
            {formatDuration(totalTime)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
