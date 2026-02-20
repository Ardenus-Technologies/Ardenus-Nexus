import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskAssigneeQueries } from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = taskQueries.findById.get(id);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Anyone can opt in — INSERT OR IGNORE handles duplicates
  taskAssigneeQueries.add.run(id, session.user.id, 'opted_in');

  return NextResponse.json({ success: true });
}
