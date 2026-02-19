"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TaskComment } from "@/types";

interface CommentSectionProps {
  comments: TaskComment[];
  currentUserId: string;
  isAdmin: boolean;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function CommentSection({
  comments,
  currentUserId,
  isAdmin,
  onAddComment,
  onDeleteComment,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h4 className="text-sm uppercase tracking-wider text-white/70 mb-3">
        Comments ({comments.length})
      </h4>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 bg-white/5 rounded-lg border border-white/5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{comment.userName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">
                    {new Date(comment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {(comment.userId === currentUserId || isAdmin) && (
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-white/30 hover:text-red-400 transition-colors"
                      aria-label="Delete comment"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{comment.content}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {comments.length === 0 && (
          <p className="text-white/30 text-sm text-center py-4">No comments yet</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="flex-1"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Post
        </Button>
      </div>
    </div>
  );
}
