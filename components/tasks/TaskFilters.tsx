"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface User {
  id: string;
  name: string;
}

export interface TaskFilterState {
  search: string;
  status: string;
  assigneeId: string;
}

export const defaultTaskFilters: TaskFilterState = {
  search: "",
  status: "todo",
  assigneeId: "",
};

interface TaskFiltersProps {
  filters: TaskFilterState;
  onFiltersChange: (filters: TaskFilterState) => void;
  users: User[];
}

export function TaskFilters({ filters, onFiltersChange, users }: TaskFiltersProps) {
  const updateFilter = (key: keyof TaskFilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="relative">
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
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-10"
          aria-label="Search tasks"
        />
      </div>

      <Select
        value={filters.status}
        onChange={(e) => updateFilter("status", e.target.value)}
        aria-label="Filter by status"
      >
        <option value="todo" className="bg-black">To Do</option>
        <option value="in_progress" className="bg-black">In Progress</option>
        <option value="done" className="bg-black">Done</option>
      </Select>

      <Select
        value={filters.assigneeId}
        onChange={(e) => updateFilter("assigneeId", e.target.value)}
        aria-label="Filter by assignee"
      >
        <option value="">All Assignees</option>
        <option value="unassigned" className="bg-black">Unassigned</option>
        {users.map((user) => (
          <option key={user.id} value={user.id} className="bg-black">
            {user.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
