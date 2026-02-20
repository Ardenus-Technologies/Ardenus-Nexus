import {
  activeTimerQueries,
  timeEntryQueries,
  roomParticipantQueries,
  generateId,
  type DbActiveTimer,
} from '@/lib/db';

// Must match client-side: 90 min activity check + 5 min grace period
const STALE_THRESHOLD_MS = 95 * 60 * 1000;

/**
 * Auto-stop a single user's timer if it's stale (no check-in within 95 min).
 * Creates a time entry capped at last_check_in + 95 min, deletes the active
 * timer, and leaves require-clock-in rooms.
 */
export function autoStopIfStale(userId: string): boolean {
  const timer = activeTimerQueries.findByUserId.get(userId);
  if (!timer) return false;

  const lastCheckIn = new Date(timer.last_check_in || timer.start_time).getTime();
  if (Date.now() - lastCheckIn < STALE_THRESHOLD_MS) return false;

  saveAndDelete(timer, lastCheckIn);
  return true;
}

/**
 * Auto-stop ALL stale timers across all users. Called on the team-view
 * endpoint so the list never shows ghost timers.
 */
export function autoStopAllStale(): void {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const staleTimers = activeTimerQueries.findStale.all(cutoff);

  for (const timer of staleTimers) {
    const lastCheckIn = new Date(timer.last_check_in || timer.start_time).getTime();
    saveAndDelete(timer, lastCheckIn);
  }
}

function saveAndDelete(timer: DbActiveTimer, lastCheckInMs: number): void {
  const startMs = new Date(timer.start_time).getTime();
  const endMs = lastCheckInMs + STALE_THRESHOLD_MS;
  const duration = Math.floor((endMs - startMs) / 1000);

  timeEntryQueries.create.run(
    generateId(),
    timer.user_id,
    timer.category_id,
    timer.tag_id,
    timer.description,
    timer.start_time,
    new Date(endMs).toISOString(),
    duration,
  );

  roomParticipantQueries.leaveRequireClockIn.run(timer.user_id);
  activeTimerQueries.deleteByUserId.run(timer.user_id);
}
