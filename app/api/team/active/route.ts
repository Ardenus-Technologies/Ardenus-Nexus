import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { activeTimerQueries, generateId } from '@/lib/db';

// GET - Get all active timers (who's clocked in)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeTimers = activeTimerQueries.findAllWithUsers.all();

  // Calculate elapsed time for each active timer
  const timersWithElapsed = activeTimers.map((timer) => {
    const startTime = new Date(timer.start_time);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    return {
      id: timer.id,
      userId: timer.user_id,
      userName: timer.user_name,
      userEmail: timer.user_email,
      categoryId: timer.category_id,
      categoryName: timer.category_name,
      categoryColor: timer.category_color,
      description: timer.description || '',
      startTime: timer.start_time,
      elapsedSeconds,
    };
  });

  return NextResponse.json(timersWithElapsed);
}

// POST - Start a timer (clock in)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { categoryId, description, startTime } = body;

  if (!categoryId || !startTime) {
    return NextResponse.json(
      { error: 'categoryId and startTime are required' },
      { status: 400 }
    );
  }

  const id = generateId();
  activeTimerQueries.create.run(
    id,
    session.user.id,
    categoryId,
    description || null,
    startTime
  );

  return NextResponse.json({ success: true, id }, { status: 201 });
}

// DELETE - Stop a timer (clock out)
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  activeTimerQueries.deleteByUserId.run(session.user.id);

  return NextResponse.json({ success: true });
}

// PATCH - Update active timer (category/description change)
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { categoryId, description } = body;

  if (!categoryId) {
    return NextResponse.json(
      { error: 'categoryId is required' },
      { status: 400 }
    );
  }

  activeTimerQueries.update.run(categoryId, description || null, session.user.id);

  return NextResponse.json({ success: true });
}
