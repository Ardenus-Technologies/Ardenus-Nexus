"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { formatTime } from "@/lib/utils";

interface ActivityCheckModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  elapsedSeconds: number;
}

export function ActivityCheckModal({ isOpen, onConfirm, elapsedSeconds }: ActivityCheckModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape confirms activity (same as clicking the button -- there is no
    // "dismiss" action since the whole point is to confirm presence)
    if (e.key === "Escape") {
      onConfirm();
      return;
    }

    if (e.key !== "Tab" || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

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
  }, [onConfirm]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        // Restore focus to the element that was focused before the modal opened
        requestAnimationFrame(() => {
          (triggerRef.current as HTMLElement)?.focus?.();
        });
      };
    }
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="activity-check-title"
              aria-describedby="activity-check-desc"
              className="w-full max-w-sm bg-black border border-white/10 rounded-lg p-6 text-center"
            >
              <div className="flex justify-center mb-4">
                <motion.span
                  className="inline-block h-3 w-3 rounded-full bg-white"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden="true"
                />
              </div>

              <h2 id="activity-check-title" className="text-heading-3 font-heading mb-2">
                Still Working?
              </h2>

              <p id="activity-check-desc" className="text-white/60 text-sm mb-1">
                Your timer has been running for
              </p>
              <p className="text-heading-3 font-heading mb-6">
                {formatTime(elapsedSeconds)}
              </p>

              <Button
                onClick={onConfirm}
                variant="primary"
                size="lg"
                autoFocus
                className="w-full"
              >
                Yes, Still Working
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
