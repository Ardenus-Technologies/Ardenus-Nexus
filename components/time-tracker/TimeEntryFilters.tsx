"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  categoryId: string;
  userId: string;
}

interface Category {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface TimeEntryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: Category[];
  users?: User[]; // Optional - only for team view
  showUserFilter?: boolean;
}

export function TimeEntryFilters({
  filters,
  onFiltersChange,
  categories,
  users = [],
  showUserFilter = false,
}: TimeEntryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      startDate: "",
      endDate: "",
      categoryId: "",
      userId: "",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.startDate ||
    filters.endDate ||
    filters.categoryId ||
    filters.userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-4"
    >
      {/* Search bar - always visible */}
      <div className="flex gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            type="text"
            placeholder="Search entries..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
            aria-label="Search entries"
          />
        </div>
        <Button
          variant={isExpanded ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label="Toggle filters"
        >
          <svg
            className="w-5 h-5 sm:mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="ml-2 w-2 h-2 rounded-full bg-white" />
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-white/5 rounded-lg border border-white/10"
          >
            {/* Date Range - Start */}
            <div>
              <label htmlFor="filter-start-date" className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                From Date
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter("startDate", e.target.value)}
              />
            </div>

            {/* Date Range - End */}
            <div>
              <label htmlFor="filter-end-date" className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                To Date
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter("endDate", e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="filter-category" className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                Category
              </label>
              <Select
                id="filter-category"
                value={filters.categoryId}
                onChange={(e) => updateFilter("categoryId", e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-black">
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* User Filter - Only for team view */}
            {showUserFilter && (
              <div>
                <label htmlFor="filter-user" className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                  Team Member
                </label>
                <Select
                  id="filter-user"
                  value={filters.userId}
                  onChange={(e) => updateFilter("userId", e.target.value)}
                >
                  <option value="">All Members</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id} className="bg-black">
                      {user.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper function to filter entries based on filter state
export function filterEntries<
  T extends {
    description?: string | null;
    startTime: string | Date;
    categoryId?: string;
    category_id?: string;
    userId?: string;
    user_id?: string;
  },
>(entries: T[], filters: FilterState): T[] {
  return entries.filter((entry) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const description = entry.description || "";
      if (!description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Date range filter
    const entryDate = new Date(entry.startTime);
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      if (entryDate < start) {
        return false;
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (entryDate > end) {
        return false;
      }
    }

    // Category filter
    if (filters.categoryId) {
      const categoryId = entry.categoryId || entry.category_id;
      if (categoryId !== filters.categoryId) {
        return false;
      }
    }

    // User filter
    if (filters.userId) {
      const userId = entry.userId || entry.user_id;
      if (userId !== filters.userId) {
        return false;
      }
    }

    return true;
  });
}

export const defaultFilters: FilterState = {
  search: "",
  startDate: "",
  endDate: "",
  categoryId: "",
  userId: "",
};
