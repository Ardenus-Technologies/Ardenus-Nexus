"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface User {
  id: string;
  name: string;
}

interface CreateTaskModalProps {
  users: User[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    assigneeIds: string[];
  }) => Promise<void>;
}

export function CreateTaskModal({ users, onClose, onSubmit }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({ title, description, assigneeIds });
      onClose();
    } catch {
      setError("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-lg"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-heading text-white">Create Task</h2>
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

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                  Title *
                </label>
                <Input
                  id="task-title"
                  type="text"
                  placeholder="Task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="task-description" className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  id="task-description"
                  placeholder="Optional description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-[#767676] transition-colors duration-300 outline-none focus-visible:border-white/50 focus-visible:ring-2 focus-visible:ring-white/70 resize-none"
                />
              </div>

              <div>
                <span className="block text-sm text-white/70 mb-2 uppercase tracking-wider">
                  Assignees
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-white/10 rounded-lg p-2">
                  {users.length === 0 ? (
                    <span className="text-white/30 text-sm">No users</span>
                  ) : (
                    users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assigneeIds.includes(user.id)}
                          onChange={() => toggleAssignee(user.id)}
                          className="accent-white"
                        />
                        <span className="text-sm text-white truncate">{user.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!title.trim() || isSubmitting}
                isLoading={isSubmitting}
              >
                Create Task
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
