"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { Task } from "@/types";

const priorityColors: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const statusStyles: Record<string, string> = {
  todo: "bg-white/10 text-white/70",
  in_progress: "bg-yellow-500/20 text-yellow-300",
  done: "bg-green-500/20 text-green-300",
};

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  onClick: () => void;
  onOptIn: (taskId: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function TaskCard({ task, currentUserId, onClick, onOptIn, dragHandleProps }: TaskCardProps) {
  const doneSubtasks = task.subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = task.subtasks.length;

  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate) < new Date();

  const isOptedIn = task.assignees.some((a) => a.id === currentUserId);
  const showOptIn = !isOptedIn && task.status !== "done";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 border border-white/10 rounded-lg bg-transparent hover:border-[#4f4f4f] transition-all duration-300 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-1 text-white/30 hover:text-white/60 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </button>
        )}

        {/* Priority dot */}
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${priorityColors[task.priority]}`} />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium truncate ${task.status === "done" ? "line-through text-white/50" : "text-white"}`}>
              {task.title}
            </h3>
            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${statusStyles[task.status]}`}>
              {statusLabels[task.status]}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-sm text-white/50 flex-wrap">
            {task.assignees.length > 0 ? (
              <span className="truncate">
                {task.assignees.map((a) => a.name).join(", ")}
              </span>
            ) : (
              <span className="text-white/30 italic">Unassigned</span>
            )}

            {task.dueDate && (
              <span className={isOverdue ? "text-red-400" : ""}>
                Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}

            {totalSubtasks > 0 && (
              <span>
                {doneSubtasks}/{totalSubtasks} subtasks
              </span>
            )}

            {task.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {task.commentCount}
              </span>
            )}

            {task.timeEstimate && (
              <span>{task.timeEstimate}h est.</span>
            )}
          </div>
        </div>

        {/* Opt In button */}
        {showOptIn && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOptIn(task.id);
            }}
            className="flex-shrink-0 text-xs"
          >
            Opt In
          </Button>
        )}
      </div>
    </motion.div>
  );
}
