import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timeEntryQueries } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const entry = timeEntryQueries.findById.get(id);
  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.user_id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { categoryId, tagId, description } = await request.json();

  if (!categoryId || !description) {
    return NextResponse.json({ error: 'Category and description are required' }, { status: 400 });
  }

  timeEntryQueries.update.run(
    categoryId,
    tagId || null,
    description,
    entry.start_time,
    entry.end_time,
    entry.duration,
    id
  );

  const updated = timeEntryQueries.findById.get(id);
  return NextResponse.json({
    id: updated!.id,
    userId: updated!.user_id,
    categoryId: updated!.category_id,
    tagId: updated!.tag_id,
    description: updated!.description,
    startTime: updated!.start_time,
    endTime: updated!.end_time,
    duration: updated!.duration,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const entry = timeEntryQueries.findById.get(id);
  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  // Ensure user owns this entry (or is admin)
  if (entry.user_id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  timeEntryQueries.delete.run(id);
  return NextResponse.json({ success: true });
}
