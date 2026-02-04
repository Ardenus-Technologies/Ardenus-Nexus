import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { teamQueries } from '@/lib/db';

// GET - Get all team time entries
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  let entries;

  if (date) {
    // Filter by specific date
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    entries = teamQueries.findEntriesByDate.all(startOfDay, endOfDay);
  } else {
    // Get all recent entries (limit 100)
    entries = teamQueries.findAllEntries.all();
  }

  // Transform to frontend format
  const transformedEntries = entries.map((entry) => ({
    id: entry.id,
    userId: entry.user_id,
    userName: entry.user_name,
    userEmail: entry.user_email,
    categoryId: entry.category_id,
    categoryName: entry.category_name,
    categoryColor: entry.category_color,
    description: entry.description || '',
    startTime: entry.start_time,
    endTime: entry.end_time,
    duration: entry.duration,
  }));

  return NextResponse.json(transformedEntries);
}
