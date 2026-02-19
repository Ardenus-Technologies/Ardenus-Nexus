import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries } from '@/lib/db';

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

  if (task.assignee_id) {
    return NextResponse.json({ error: 'Task is already assigned' }, { status: 400 });
  }

  const now = new Date().toISOString();
  taskQueries.updateAssignee.run(session.user.id, now, id);

  return NextResponse.json({ success: true });
}
