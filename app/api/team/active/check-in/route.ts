import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { activeTimerQueries } from '@/lib/db';

// POST - Update last_check_in timestamp (user confirmed they're still working)
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  activeTimerQueries.updateCheckIn.run(
    new Date().toISOString(),
    session.user.id,
  );

  return NextResponse.json({ success: true });
}
