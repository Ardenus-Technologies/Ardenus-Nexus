"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Select } from "@/components/ui";
import type { Category, Tag, TimeEntry } from "@/types";

interface EditEntryModalProps {
  entry: TimeEntry | null;
  categories: Category[];
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { categoryId: string; tagId: string | null; description: string; startTime: string; endTime: string; duration: number }) => Promise<void>;
}

export function EditEntryModal({ entry, categories, tags, isOpen, onClose, onSave }: EditEntryModalProps) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState<string>("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Populate form when entry changes
  useEffect(() => {
    if (entry) {
      setDescription(entry.description);
      setCategoryId(entry.categoryId);
      setTagId(entry.tagId || "");
      const start = new Date(entry.startTime);
      setDate(start.toLocaleDateString("en-CA")); // YYYY-MM-DD
      setStartTime(start.toTimeString().slice(0, 5)); // HH:MM
      if (entry.endTime) {
        const end = new Date(entry.endTime);
        setEndTime(end.toTimeString().slice(0, 5));
      } else {
        setEndTime("");
      }
      setError("");
    }
  }, [entry]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && !isLoading) {
      onClose();
      return;
    }
    if (e.key !== "Tab" || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose, isLoading]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      document.addEventListener("keydown", handleKeyDown);
      const timer = setTimeout(() => firstInputRef.current?.focus(), 100);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        clearTimeout(timer);
      };
    }
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!date || !startTime || !endTime) {
      setError("Date, start time, and end time are required");
      return;
    }

    const startISO = new Date(`${date}T${startTime}:00`).toISOString();
    const endISO = new Date(`${date}T${endTime}:00`).toISOString();

    if (endISO <= startISO) {
      setError("End time must be after start time");
      return;
    }

    const durationSec = Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000);

    if (!entry) return;

    setIsLoading(true);
    try {
      await onSave(entry.id, {
        categoryId,
        tagId: tagId || null,
        description: description.trim(),
        startTime: startISO,
        endTime: endISO,
        duration: durationSec,
      });
      handleClose();
    } catch {
      setError("Failed to update entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setError("");
    onClose();
    requestAnimationFrame(() => {
      (triggerRef.current as HTMLElement)?.focus?.();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-entry-title"
              className="w-full max-w-md bg-black border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 id="edit-entry-title" className="text-heading-3 font-heading">Edit Entry</h2>
                <button
                  onClick={handleClose}
                  className="text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-description"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Description
                  </label>
                  <Input
                    ref={firstInputRef}
                    id="edit-description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What were you working on?"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-category"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Category
                  </label>
                  <Select
                    id="edit-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="edit-tag"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Tag
                  </label>
                  <Select
                    id="edit-tag"
                    value={tagId}
                    onChange={(e) => setTagId(e.target.value)}
                  >
                    <option value="">No tag</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="edit-date"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Date
                  </label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-start-time"
                      className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                    >
                      Start Time
                    </label>
                    <Input
                      id="edit-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-end-time"
                      className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                    >
                      End Time
                    </label>
                    <Input
                      id="edit-end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
