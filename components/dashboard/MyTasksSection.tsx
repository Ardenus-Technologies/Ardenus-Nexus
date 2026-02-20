"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import type { Task, User } from "@/types";

interface MyTasksSectionProps {
  currentUserId: string;
  isAdmin: boolean;
}

interface MyTasksResponse {
  assigned: Task[];
  optedIn: Task[];
}

function TaskMiniCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const doneSubtasks = task.subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = task.subtasks.length;
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="w-full text-left p-3 border border-white/10 rounded-lg bg-transparent hover:border-[#4f4f4f] transition-all duration-300"
    >
      <h4 className="font-medium text-white text-sm truncate">{task.title}</h4>
      <div className="flex items-center gap-3 mt-1 text-xs text-white/50 flex-wrap">
        {task.dueDate && (
          <span className={isOverdue ? "text-red-400" : ""}>
            Due{" "}
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        {totalSubtasks > 0 && (
          <span>
            {doneSubtasks}/{totalSubtasks} subtasks
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {task.commentCount}
          </span>
        )}
        {task.timeEstimate && <span>{task.timeEstimate}h est.</span>}
      </div>
    </motion.button>
  );
}

function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        <svg
          className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
          {title}
        </span>
        <span className="text-xs text-white/30">{count}</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MyTasksSection({ currentUserId, isAdmin }: MyTasksSectionProps) {
  const [data, setData] = useState<MyTasksResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchMyTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/my-tasks");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail — dashboard still works without tasks
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    fetchMyTasks();
    fetchUsers();
  }, [fetchMyTasks, fetchUsers]);

  if (!data) return null;

  const { assigned, optedIn } = data;
  if (assigned.length === 0 && optedIn.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-heading-4 font-heading text-white">My Tasks</h2>

        {assigned.length > 0 && (
          <CollapsibleSection title="Assigned to You" count={assigned.length}>
            <div className="space-y-2">
              {assigned.map((task) => (
                <TaskMiniCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {optedIn.length > 0 && (
          <CollapsibleSection title="Opted In" count={optedIn.length}>
            <div className="space-y-2">
              {optedIn.map((task) => (
                <TaskMiniCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          users={users.map((u) => ({ id: u.id, name: u.name }))}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => {
            fetchMyTasks();
          }}
        />
      )}
    </>
  );
}
