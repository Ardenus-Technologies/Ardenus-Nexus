"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SubtaskList } from "./SubtaskList";
import { CommentSection } from "./CommentSection";
import type { Task, TaskComment } from "@/types";

const priorityColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
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

interface TaskDetailModalProps {
  taskId: string;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailModal({
  taskId,
  currentUserId,
  isAdmin,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<(Task & { comments: TaskComment[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        setTask(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchTask();
    onTaskUpdated();
  };

  const handleAssign = async () => {
    await fetch(`/api/tasks/${taskId}/assign`, { method: "POST" });
    await fetchTask();
    onTaskUpdated();
  };

  const handleUnassign = async () => {
    await fetch(`/api/tasks/${taskId}/unassign`, { method: "POST" });
    await fetchTask();
    onTaskUpdated();
  };

  const handleDelete = async () => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    onTaskUpdated();
    onClose();
  };

  const handleSubtaskStatusToggle = async (subtaskId: string, newStatus: string) => {
    await fetch(`/api/tasks/${subtaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchTask();
    onTaskUpdated();
  };

  const handleAddSubtask = async (title: string) => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, parentTaskId: taskId }),
    });
    await fetchTask();
    onTaskUpdated();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await fetch(`/api/tasks/${subtaskId}`, { method: "DELETE" });
    await fetchTask();
    onTaskUpdated();
  };

  const handleAddComment = async (content: string) => {
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    await fetchTask();
    onTaskUpdated();
  };

  const handleDeleteComment = async (commentId: string) => {
    await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" });
    await fetchTask();
  };

  const isAssignee = task?.assigneeId === currentUserId;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-lg"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isLoading || !task ? (
            <div className="flex items-center justify-center py-20">
              <motion.div
                className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs uppercase tracking-wider font-medium ${priorityColors[task.priority]}`}>
                      {task.priority} priority
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusStyles[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                  </div>
                  <h2 className="text-xl font-heading text-white">{task.title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/50 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Description */}
              {task.description && (
                <div className="mb-6">
                  <p className="text-white/70 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-white/40 block mb-1">Assignee</span>
                  <span className="text-white">{task.assigneeName || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-1">Created by</span>
                  <span className="text-white">{task.creatorName}</span>
                </div>
                {task.dueDate && (
                  <div>
                    <span className="text-white/40 block mb-1">Due date</span>
                    <span className={`text-white ${task.status !== "done" && new Date(task.dueDate) < new Date() ? "text-red-400" : ""}`}>
                      {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                )}
                {task.timeEstimate && (
                  <div>
                    <span className="text-white/40 block mb-1">Time estimate</span>
                    <span className="text-white">{task.timeEstimate}h</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-white/10">
                {/* Status change */}
                {(isAdmin || isAssignee) && task.status !== "done" && (
                  <Select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-auto"
                    aria-label="Change status"
                  >
                    <option value="todo" className="bg-black">To Do</option>
                    <option value="in_progress" className="bg-black">In Progress</option>
                    <option value="done" className="bg-black">Done</option>
                  </Select>
                )}

                {/* Assign / Unassign */}
                {!task.assigneeId && task.status !== "done" && (
                  <Button variant="secondary" size="sm" onClick={handleAssign}>
                    Grab Task
                  </Button>
                )}
                {task.assigneeId && (isAssignee || isAdmin) && task.status !== "done" && (
                  <Button variant="ghost" size="sm" onClick={handleUnassign}>
                    Release
                  </Button>
                )}

                {/* Admin: mark done even if done, or delete */}
                {isAdmin && task.status === "done" && (
                  <Button variant="ghost" size="sm" onClick={() => handleStatusChange("todo")}>
                    Reopen
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 ml-auto"
                  >
                    Delete
                  </Button>
                )}
              </div>

              {/* Subtasks */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <SubtaskList
                  subtasks={task.subtasks}
                  isAdmin={isAdmin}
                  parentTaskId={task.id}
                  onToggleStatus={handleSubtaskStatusToggle}
                  onAddSubtask={handleAddSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                />
              </div>

              {/* Comments */}
              <CommentSection
                comments={task.comments}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
