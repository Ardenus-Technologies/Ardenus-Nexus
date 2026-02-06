"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { formatTime } from "@/lib/utils";
import type { Category, Tag, TimeEntry } from "@/types";

interface TimerProps {
  categories: Category[];
  tags: Tag[];
  onTimeEntryComplete: (entry: Omit<TimeEntry, "id">) => void;
}

export function Timer({ categories, tags, onTimeEntryComplete }: TimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || ""
  );
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const hasRestoredRef = useRef(false);

  // Restore active timer from database on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreActiveTimer = async () => {
      try {
        const res = await fetch('/api/team/active/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.start_time) {
            const savedStartTime = new Date(data.start_time);
            const elapsed = Math.floor((Date.now() - savedStartTime.getTime()) / 1000);

            setStartTime(savedStartTime);
            setElapsedSeconds(elapsed);
            setSelectedCategoryId(data.category_id);
            setSelectedTagId(data.tag_id || '');
            setDescription(data.description || '');
            setIsRunning(true);
          }
        }
      } catch (error) {
        console.error('Failed to restore active timer:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreActiveTimer();
  }, []);

  // Sync selectedCategoryId when categories load/change
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId && !isRestoring) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId, isRestoring]);

  // Timer interval - calculate from startTime to avoid drift
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Sync active timer to database
  const syncActiveTimer = useCallback(async (action: 'start' | 'stop', categoryId?: string, tagId?: string, desc?: string, start?: Date) => {
    try {
      if (action === 'start' && start) {
        await fetch('/api/team/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId,
            tagId: tagId || null,
            description: desc || '',
            startTime: start.toISOString(),
          }),
        });
      } else if (action === 'stop') {
        await fetch('/api/team/active', { method: 'DELETE' });
      }
    } catch (error) {
      console.error('Failed to sync active timer:', error);
    }
  }, []);

  const handleStart = useCallback(() => {
    if (!selectedCategoryId) return;
    const now = new Date();
    setIsRunning(true);
    setStartTime(now);
    syncActiveTimer('start', selectedCategoryId, selectedTagId, description, now);
  }, [selectedCategoryId, selectedTagId, description, syncActiveTimer]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    // Keep active timer in DB while paused - user is still "working"
  }, []);

  const handleResume = useCallback(() => {
    // Adjust startTime to account for paused duration so drift calculation stays correct
    setStartTime(new Date(Date.now() - elapsedSeconds * 1000));
    setIsRunning(true);
  }, [elapsedSeconds]);

  const handleStop = useCallback(() => {
    if (elapsedSeconds > 0 && startTime) {
      const entry: Omit<TimeEntry, "id"> = {
        categoryId: selectedCategoryId,
        tagId: selectedTagId || null,
        description: description || "No description",
        startTime,
        endTime: new Date(),
        duration: elapsedSeconds,
      };
      onTimeEntryComplete(entry);
    }

    // Remove from active timers
    syncActiveTimer('stop');

    setIsRunning(false);
    setElapsedSeconds(0);
    setStartTime(null);
    setDescription("");
    setSelectedTagId("");
  }, [
    elapsedSeconds,
    startTime,
    selectedCategoryId,
    selectedTagId,
    description,
    onTimeEntryComplete,
    syncActiveTimer,
  ]);

  const handleReset = useCallback(() => {
    // Remove from active timers without saving
    syncActiveTimer('stop');

    setIsRunning(false);
    setElapsedSeconds(0);
    setStartTime(null);
  }, [syncActiveTimer]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-6 sm:space-y-8">
        {/* Timer Display */}
        <div className="text-center">
          <motion.div
            className="timer-display text-display-1"
            initial={{ scale: 1 }}
            animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
          >
            {formatTime(elapsedSeconds)}
          </motion.div>
          <div aria-live="polite" aria-atomic="true">
            <AnimatePresence>
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-2 flex items-center justify-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                  <span className="text-eyebrow">Recording</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category & Description */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="timer-category" className="text-eyebrow block mb-2">Category</label>
            <Select
              id="timer-category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={isRunning || elapsedSeconds > 0}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-black">
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="timer-tag" className="text-eyebrow block mb-2">Tag (Optional)</label>
            <Select
              id="timer-tag"
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              disabled={isRunning || elapsedSeconds > 0}
            >
              <option value="" className="bg-black">No tag</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id} className="bg-black">
                  {tag.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="timer-description" className="text-eyebrow block mb-2">Description</label>
            <Input
              id="timer-description"
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isRunning || elapsedSeconds > 0}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
          {!isRunning && elapsedSeconds === 0 && (
            <Button onClick={handleStart} variant="primary" size="lg">
              Start
            </Button>
          )}

          {isRunning && (
            <>
              <Button onClick={handlePause} variant="secondary" size="lg">
                Pause
              </Button>
              <Button onClick={handleStop} variant="primary" size="lg">
                Stop & Save
              </Button>
            </>
          )}

          {!isRunning && elapsedSeconds > 0 && (
            <>
              <Button onClick={handleResume} variant="primary" size="lg">
                Resume
              </Button>
              <Button onClick={handleStop} variant="secondary" size="lg">
                Save
              </Button>
              <Button onClick={handleReset} variant="ghost" size="lg">
                Discard
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
