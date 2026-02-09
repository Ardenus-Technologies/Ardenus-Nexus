"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const ACTIVITY_CHECK_MS = 90 * 60 * 1000; // 90 minutes
const POLL_MS = 60_000; // 60 seconds
const REPEAT_NOTIFY_MS = 15 * 60 * 1000; // 15 minutes
const LS_KEY = "nexus_lastConfirmedAt";

function sendOSNotification(): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const n = new Notification("Nexus - Activity Check", {
    body: "Your timer is still running. Are you still working?",
    icon: "/assets/ArdenusIcon3.png",
    tag: "activity-check",
    requireInteraction: true,
  });

  n.onclick = () => {
    window.focus();
    n.close();
  };
}

export function useActivityCheck(isRunning: boolean, startTime: Date | null) {
  const [showCheckModal, setShowCheckModal] = useState(false);
  const lastConfirmedAtRef = useRef<number>(0);
  const lastNotifiedAtRef = useRef<number>(0);
  // Track pause-to-resume transitions. Starts as null (unknown/mount state)
  // to distinguish from an explicit pause (false).
  const wasRunningRef = useRef<boolean | null>(null);

  // Read persisted value on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      lastConfirmedAtRef.current = Number(stored);
    }
  }, []);

  const confirmActivity = useCallback(() => {
    const now = Date.now();
    lastConfirmedAtRef.current = now;
    lastNotifiedAtRef.current = 0;
    localStorage.setItem(LS_KEY, String(now));
    setShowCheckModal(false);
  }, []);

  const resetActivityCheck = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    lastConfirmedAtRef.current = 0;
    lastNotifiedAtRef.current = 0;
    wasRunningRef.current = null;
    setShowCheckModal(false);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isRunning || !startTime) {
      // Only mark as explicitly paused if it was previously running.
      // This distinguishes "paused" (false) from "initial mount" (null).
      if (wasRunningRef.current === true) {
        wasRunningRef.current = false;
      }
      return;
    }

    const now = Date.now();

    // On resume after an explicit pause, reset the confirmation timestamp
    // so paused wall-clock time is not counted toward the 90-minute window.
    // wasRunningRef === false means we saw a running->paused transition.
    // wasRunningRef === null means first mount (page load/restore) -- do NOT reset.
    if (wasRunningRef.current === false && lastConfirmedAtRef.current !== 0) {
      lastConfirmedAtRef.current = now;
      localStorage.setItem(LS_KEY, String(now));
    }

    wasRunningRef.current = true;

    // Initialize lastConfirmedAt for a fresh start
    if (lastConfirmedAtRef.current === 0) {
      lastConfirmedAtRef.current = now;
      localStorage.setItem(LS_KEY, String(now));
    }

    const check = () => {
      const checkNow = Date.now();
      const elapsed = checkNow - lastConfirmedAtRef.current;

      if (elapsed >= ACTIVITY_CHECK_MS) {
        setShowCheckModal(true);

        // Send OS notification, repeat every 15 min
        const sinceLastNotify = checkNow - lastNotifiedAtRef.current;
        if (lastNotifiedAtRef.current === 0 || sinceLastNotify >= REPEAT_NOTIFY_MS) {
          lastNotifiedAtRef.current = checkNow;
          sendOSNotification();
        }
      }
    };

    // Run immediately (handles restore after long absence)
    check();

    const interval = setInterval(check, POLL_MS);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  return {
    showCheckModal,
    confirmActivity,
    requestNotificationPermission,
    resetActivityCheck,
  };
}
