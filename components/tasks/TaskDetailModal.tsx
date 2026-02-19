"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
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
  users?: { id: string; name: string }[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailModal({
  taskId,
  currentUserId,
  isAdmin,
  users = [],
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<(Task & { comments: TaskComment[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const assigneePickerRef = useRef<HTMLDivElement>(null);

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

  // Focus inputs when entering edit mode
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription) descriptionRef.current?.focus();
  }, [editingDescription]);

  // Close assignee picker on outside click
  useEffect(() => {
    if (!showAssigneePicker) return;
    const handler = (e: MouseEvent) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
        setShowAssigneePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAssigneePicker]);

  // --- Inline field save helpers ---

  const saveField = async (fields: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      await fetchTask();
      onTaskUpdated();
    }
  };

  const commitTitle = async () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === task?.title) return;
    await saveField({ title: trimmed });
  };

  const commitDescription = async () => {
    setEditingDescription(false);
    const trimmed = descriptionDraft.trim();
    if (trimmed === (task?.description ?? "")) return;
    await saveField({ description: trimmed || null });
  };

  // --- Existing handlers ---

  const handleStatusChange = async (newStatus: string) => {
    await saveField({ status: newStatus });
  };

  const handleOptIn = async () => {
    await fetch(`/api/tasks/${taskId}/assign`, { method: "POST" });
    await fetchTask();
    onTaskUpdated();
  };

  const handleLeave = async () => {
    await fetch(`/api/tasks/${taskId}/unassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await fetchTask();
    onTaskUpdated();
  };

  const handleRemoveAssignee = async (userId: string) => {
    await fetch(`/api/tasks/${taskId}/unassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await fetchTask();
    onTaskUpdated();
  };

  const handleAddAssignee = async (userId: string) => {
    // Use the PUT endpoint to add to the assignee list
    if (!task) return;
    const currentIds = task.assignees.map((a) => a.id);
    if (currentIds.includes(userId)) return;
    await saveField({ assigneeIds: [...currentIds, userId] });
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

  const isAssignee = task?.assignees.some((a) => a.id === currentUserId) ?? false;

  // Users not yet assigned (for the picker)
  const unassignedUsers = task
    ? users.filter((u) => !task.assignees.some((a) => a.id === u.id))
    : [];

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

                  {/* Inline-editable title */}
                  {editingTitle ? (
                    <input
                      ref={titleInputRef}
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={commitTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitTitle();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      className="w-full text-xl font-heading text-white bg-transparent border-b border-white/30 outline-none py-1 focus:border-white/60"
                    />
                  ) : (
                    <h2
                      className={`text-xl font-heading text-white ${isAdmin ? "cursor-text hover:border-b hover:border-white/20 transition-colors" : ""}`}
                      onClick={() => {
                        if (!isAdmin) return;
                        setTitleDraft(task.title);
                        setEditingTitle(true);
                      }}
                      title={isAdmin ? "Click to edit" : undefined}
                    >
                      {task.title}
                    </h2>
                  )}
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

              {/* Inline-editable description */}
              <div className="mb-6">
                {editingDescription ? (
                  <textarea
                    ref={descriptionRef}
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onBlur={commitDescription}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingDescription(false);
                      }
                    }}
                    rows={3}
                    placeholder="Add a description..."
                    className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-[#767676] transition-colors duration-300 outline-none focus-visible:border-white/50 focus-visible:ring-2 focus-visible:ring-white/70 resize-none"
                  />
                ) : task.description ? (
                  <p
                    className={`text-white/70 whitespace-pre-wrap ${isAdmin ? "cursor-text rounded px-1 -mx-1 hover:bg-white/5 transition-colors" : ""}`}
                    onClick={() => {
                      if (!isAdmin) return;
                      setDescriptionDraft(task.description ?? "");
                      setEditingDescription(true);
                    }}
                    title={isAdmin ? "Click to edit" : undefined}
                  >
                    {task.description}
                  </p>
                ) : isAdmin ? (
                  <button
                    onClick={() => {
                      setDescriptionDraft("");
                      setEditingDescription(true);
                    }}
                    className="text-white/30 text-sm hover:text-white/50 transition-colors"
                  >
                    + Add description
                  </button>
                ) : null}
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                {/* Assignees with inline add */}
                <div>
                  <span className="text-white/40 block mb-1">Assignees</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {task.assignees.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-white text-xs"
                      >
                        {a.name}
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveAssignee(a.id)}
                            className="text-white/40 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${a.name}`}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </span>
                    ))}
                    {task.assignees.length === 0 && (
                      <span className="text-white/30 italic text-xs">Unassigned</span>
                    )}
                    {/* Add assignee button + dropdown */}
                    {isAdmin && unassignedUsers.length > 0 && (
                      <div className="relative" ref={assigneePickerRef}>
                        <button
                          onClick={() => setShowAssigneePicker((v) => !v)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white/40 hover:text-white/70 border border-dashed border-white/10 hover:border-white/30 rounded-md transition-colors"
                          aria-label="Add assignee"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add
                        </button>
                        {showAssigneePicker && (
                          <div className="absolute left-0 top-full mt-1 z-10 w-44 bg-[#111] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                            {unassignedUsers.map((u) => (
                              <button
                                key={u.id}
                                onClick={async () => {
                                  await handleAddAssignee(u.id);
                                  setShowAssigneePicker(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                              >
                                {u.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                {/* Opt In / Leave */}
                {!isAssignee && task.status !== "done" && (
                  <Button variant="secondary" size="sm" onClick={handleOptIn}>
                    Opt In
                  </Button>
                )}
                {isAssignee && task.status !== "done" && (
                  <Button variant="ghost" size="sm" onClick={handleLeave}>
                    Leave
                  </Button>
                )}

                {/* Mark Complete */}
                {(isAdmin || isAssignee) && task.status !== "done" && (
                  <Button variant="primary" size="sm" onClick={() => handleStatusChange("done")}>
                    Mark Complete
                  </Button>
                )}

                {/* Reopen (admin only) */}
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
