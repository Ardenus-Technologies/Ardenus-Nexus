"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  TaskFilters,
  TaskList,
  TaskDetailModal,
  CreateTaskModal,
  defaultTaskFilters,
  type TaskFilterState,
} from "@/components/tasks";
import { Button } from "@/components/ui";
import type { Task } from "@/types";

interface User {
  id: string;
  name: string;
}

export default function TasksPage() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<TaskFilterState>(defaultTaskFilters);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch {
      setError("Failed to load tasks");
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

  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([fetchTasks(), fetchUsers()]).then(() => {
        setIsLoading(false);
      });
    }
  }, [status, fetchTasks, fetchUsers]);

  const filteredTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    return tasks
      .filter((task) => {
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (
            !task.title.toLowerCase().includes(q) &&
            !(task.description?.toLowerCase().includes(q))
          ) {
            return false;
          }
        }
        if (filters.status && task.status !== filters.status) return false;
        if (filters.assigneeId) {
          if (filters.assigneeId === "unassigned") {
            if (task.assignees.length > 0) return false;
          } else if (!task.assignees.some((a) => a.id === filters.assigneeId)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  }, [tasks, filters]);

  const handleOptIn = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, { method: "POST" });
      if (res.ok) {
        await fetchTasks();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to opt in");
      }
    } catch {
      setError("Failed to opt in");
    }
  }, [fetchTasks]);

  const handleReorder = useCallback(async (taskIds: string[]) => {
    // Optimistic update
    setTasks((prev) => {
      const taskMap = new Map(prev.map((t) => [t.id, t]));
      return taskIds.map((id) => taskMap.get(id)).filter((t): t is Task => !!t);
    });

    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (!res.ok) {
        // Revert on failure
        await fetchTasks();
        setError("Failed to reorder tasks");
      }
    } catch {
      await fetchTasks();
      setError("Failed to reorder tasks");
    }
  }, [fetchTasks]);

  const handleCreateTask = useCallback(async (data: {
    title: string;
    description: string;
    priority: string;
    assigneeIds: string[];
    dueDate: string;
    timeEstimate: string;
  }) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        assigneeIds: data.assigneeIds.length > 0 ? data.assigneeIds : undefined,
        dueDate: data.dueDate || undefined,
        timeEstimate: data.timeEstimate ? Number(data.timeEstimate) : undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    await fetchTasks();
  }, [fetchTasks]);

  if (status === "loading" || isLoading) {
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

  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  return (
    <main id="main-content" className="min-h-screen container-margins section-py-lg">
      <div className="max-w-[1200px] mx-auto">
        {/* Page header */}
        <motion.div
          className="mb-12 flex items-end justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="text-eyebrow mb-2">Tasks</p>
            <h1 className="text-display-3 font-heading">Task Board</h1>
          </div>
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateFormOpen(true)}
            >
              Create Task
            </Button>
          )}
        </motion.div>

        {/* Error banner */}
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            users={users}
          />
        </motion.div>

        {/* Task count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-4 flex items-center justify-between"
        >
          <span className="text-sm text-white/50">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            {filteredTasks.length !== tasks.length && ` of ${tasks.length} total`}
          </span>
        </motion.div>

        {/* Task list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TaskList
            tasks={filteredTasks}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onTaskClick={setSelectedTaskId}
            onOptIn={handleOptIn}
            onReorder={handleReorder}
          />
        </motion.div>

        {/* Task detail modal */}
        {selectedTaskId && (
          <TaskDetailModal
            taskId={selectedTaskId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onClose={() => setSelectedTaskId(null)}
            onTaskUpdated={fetchTasks}
          />
        )}

        {/* Create task modal */}
        {isCreateFormOpen && (
          <CreateTaskModal
            users={users}
            onClose={() => setIsCreateFormOpen(false)}
            onSubmit={handleCreateTask}
          />
        )}

        {/* Footer */}
        <motion.footer
          className="mt-16 pt-8 border-t border-white/10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white/50 text-sm">Ardenus Nexus - Task Board</p>
        </motion.footer>
      </div>
    </main>
  );
}
