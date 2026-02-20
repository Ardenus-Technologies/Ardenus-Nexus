import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { activeTimerQueries } from '@/lib/db';
import { autoStopIfStale } from '@/lib/timer-autostop';

// GET - Get the current user's active timer
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side enforcement: auto-stop timer if no check-in within 95 min
    const wasAutoStopped = autoStopIfStale(session.user.id);

    if (wasAutoStopped) {
      return NextResponse.json({ autoStopped: true });
    }

    const activeTimer = activeTimerQueries.findByUserId.get(session.user.id);

    if (!activeTimer) {
      return NextResponse.json(null);
    }

    return NextResponse.json(activeTimer);
  } catch (error) {
    console.error('Failed to get active timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
