"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { Task } from "@/types";

const statusLabels: Record<string, string> = {
  todo: "To Do",
  done: "Completed",
};

const statusStyles: Record<string, string> = {
  todo: "bg-white/10 text-white/70",
  done: "bg-green-500/20 text-green-300",
};

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  onClick: () => void;
  onOptIn: (taskId: string) => void;
  onOptOut: (taskId: string) => void;
  onSubtaskToggle: (subtaskId: string, newStatus: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function TaskCard({ task, currentUserId, onClick, onOptIn, onOptOut, onSubtaskToggle, dragHandleProps }: TaskCardProps) {
  const doneSubtasks = task.subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = task.subtasks.length;

  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate) < new Date();

  const isOptedIn = task.optedIn.some((a) => a.id === currentUserId);
  const showOptIn = !isOptedIn && task.status !== "done";
  const showOptOut = isOptedIn && task.status !== "done";

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

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium truncate ${task.status === "done" ? "line-through text-white/50" : "text-white"}`}>
              {task.title}
            </h3>
            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${statusStyles[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            <span className={`px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${
              task.department === "sales"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-blue-500/20 text-blue-400"
            }`}>
              {task.department === "sales" ? "Sales" : "Dev"}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-sm text-white/50 flex-wrap">
            {task.assignees.length > 0 ? (
              <span className="truncate">
                <span className="text-white/40">Assigned:</span>{" "}
                {task.assignees.slice(0, 3).map((a) => a.name).join(", ")}
                {task.assignees.length > 3 && ` +${task.assignees.length - 3} more`}
              </span>
            ) : (
              <span className="text-white/30 italic">Unassigned</span>
            )}

            {task.optedIn.length > 0 && (
              <span className="truncate text-white/40">
                Opted In:{" "}
                <span className="text-white/50">
                  {task.optedIn.slice(0, 3).map((a) => a.name).join(", ")}
                  {task.optedIn.length > 3 && ` +${task.optedIn.length - 3} more`}
                </span>
              </span>
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

          {/* Inline subtasks */}
          {totalSubtasks > 0 && (
            <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubtaskToggle(subtask.id, subtask.status === "done" ? "todo" : "done");
                    }}
                    className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      subtask.status === "done"
                        ? "bg-green-500/30 border-green-500/50 hover:bg-green-500/40"
                        : "border-white/20 hover:border-white/40"
                    }`}
                    aria-label={`Mark "${subtask.title}" as ${subtask.status === "done" ? "todo" : "done"}`}
                  >
                    {subtask.status === "done" && (
                      <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`truncate ${subtask.status === "done" ? "line-through text-white/30" : "text-white/60"}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opt In / Opt Out button */}
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
        {showOptOut && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOptOut(task.id);
            }}
            className="flex-shrink-0 text-xs border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500"
          >
            Opt Out
          </Button>
        )}
      </div>
    </motion.div>
  );
}
