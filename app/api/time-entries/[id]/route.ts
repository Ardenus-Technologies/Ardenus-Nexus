import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timeEntryQueries } from '@/lib/db';

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
