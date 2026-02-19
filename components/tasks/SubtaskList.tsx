"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Task } from "@/types";

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

interface SubtaskListProps {
  subtasks: Task[];
  isAdmin: boolean;
  parentTaskId: string;
  onToggleStatus: (subtaskId: string, currentStatus: string) => Promise<void>;
  onAddSubtask: (title: string) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
}

export function SubtaskList({
  subtasks,
  isAdmin,
  onToggleStatus,
  onAddSubtask,
  onDeleteSubtask,
}: SubtaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddSubtask(newTitle.trim());
      setNewTitle("");
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStatus = (current: string): string => {
    if (current === "todo") return "in_progress";
    if (current === "in_progress") return "done";
    return "todo";
  };

  const doneCount = subtasks.filter((s) => s.status === "done").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm uppercase tracking-wider text-white/70">
          Subtasks ({doneCount}/{subtasks.length})
        </h4>
        {isAdmin && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            + Add subtask
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {subtasks.map((subtask) => (
            <motion.div
              key={subtask.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <button
                onClick={() => onToggleStatus(subtask.id, nextStatus(subtask.status))}
                className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  subtask.status === "done"
                    ? "bg-green-500/30 border-green-500/50"
                    : subtask.status === "in_progress"
                      ? "bg-yellow-500/20 border-yellow-500/40"
                      : "border-white/20 hover:border-white/40"
                }`}
                aria-label={`Toggle subtask status to ${nextStatus(subtask.status)}`}
              >
                {subtask.status === "done" && (
                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {subtask.status === "in_progress" && (
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                )}
              </button>

              <span className={`flex-1 text-sm truncate ${subtask.status === "done" ? "line-through text-white/40" : "text-white/80"}`}>
                {subtask.title}
              </span>

              <span className={`px-1.5 py-0.5 text-xs rounded ${statusStyles[subtask.status]} opacity-0 group-hover:opacity-100 transition-opacity`}>
                {statusLabels[subtask.status]}
              </span>

              {isAdmin && (
                <button
                  onClick={() => onDeleteSubtask(subtask.id)}
                  className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete subtask"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <Input
              type="text"
              placeholder="Subtask title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
              }}
              className="flex-1"
              autoFocus
            />
            <Button variant="secondary" size="sm" onClick={handleAdd} disabled={!newTitle.trim() || isSubmitting}>
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewTitle(""); }}>
              Cancel
            </Button>
          </motion.div>
        )}

        {subtasks.length === 0 && !isAdding && (
          <p className="text-white/30 text-sm text-center py-2">No subtasks</p>
        )}
      </div>
    </div>
  );
}
