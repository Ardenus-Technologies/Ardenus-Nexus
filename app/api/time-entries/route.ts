import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timeEntryQueries, generateId } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = timeEntryQueries.findByUserId.all(session.user.id);

  // Transform to frontend format
  const transformedEntries = entries.map((entry) => ({
    id: entry.id,
    userId: entry.user_id,
    categoryId: entry.category_id,
    description: entry.description || '',
    startTime: entry.start_time,
    endTime: entry.end_time,
    duration: entry.duration,
  }));

  return NextResponse.json(transformedEntries);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { categoryId, description, startTime, endTime, duration } = body;

  if (!categoryId || !startTime || duration === undefined) {
    return NextResponse.json(
      { error: 'categoryId, startTime, and duration are required' },
      { status: 400 }
    );
  }

  const id = generateId();
  timeEntryQueries.create.run(
    id,
    session.user.id,
    categoryId,
    description || null,
    startTime,
    endTime || null,
    duration
  );

  const entry = timeEntryQueries.findById.get(id);
  if (!entry) {
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: entry.id,
      userId: entry.user_id,
      categoryId: entry.category_id,
      description: entry.description || '',
      startTime: entry.start_time,
      endTime: entry.end_time,
      duration: entry.duration,
    },
    { status: 201 }
  );
}
