"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Select } from "@/components/ui";
import type { Category, Tag } from "@/types";

interface AddEntryModalProps {
  categories: Category[];
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: {
    categoryId: string;
    tagId: string | null;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number;
  }) => Promise<void>;
}

export function AddEntryModal({ categories, tags, isOpen, onClose, onSave }: AddEntryModalProps) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setCategoryId(categories[0]?.id ?? "");
      setTagId("");
      setDate(new Date().toLocaleDateString("en-CA")); // YYYY-MM-DD
      setStartTime("");
      setEndTime("");
      setError("");
    }
  }, [isOpen, categories]);

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

    const startDate = new Date(`${date}T${startTime}:00`);
    const endDate = new Date(`${date}T${endTime}:00`);

    if (endDate <= startDate) {
      setError("End time must be after start time");
      return;
    }

    const durationSec = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

    setIsLoading(true);
    try {
      await onSave({
        categoryId,
        tagId: tagId || null,
        description: description.trim(),
        startTime: startDate,
        endTime: endDate,
        duration: durationSec,
      });
      handleClose();
    } catch {
      setError("Failed to add entry");
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
      {isOpen && (
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
              aria-labelledby="add-entry-title"
              className="w-full max-w-md bg-black border border-white/10 rounded-lg p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 id="add-entry-title" className="text-heading-3 font-heading">Add Entry</h2>
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

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label
                    htmlFor="add-description"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Description
                  </label>
                  <Input
                    ref={firstInputRef}
                    id="add-description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What were you working on?"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-category"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Category
                  </label>
                  <Select
                    id="add-category"
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
                    htmlFor="add-tag"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Tag
                  </label>
                  <Select
                    id="add-tag"
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
                    htmlFor="add-date"
                    className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                  >
                    Date
                  </label>
                  <Input
                    id="add-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="add-start-time"
                      className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                    >
                      Start Time
                    </label>
                    <Input
                      id="add-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="add-end-time"
                      className="block text-sm text-white/70 mb-2 uppercase tracking-wider"
                    >
                      End Time
                    </label>
                    <Input
                      id="add-end-time"
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

                <div className="flex flex-col xs:flex-row gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="flex-1"
                  >
                    Add Entry
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
