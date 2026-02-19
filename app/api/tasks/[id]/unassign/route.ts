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

  if (!task.assignee_id) {
    return NextResponse.json({ error: 'Task is not assigned' }, { status: 400 });
  }

  // Only the assignee or an admin can unassign
  if (task.assignee_id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only the assignee or an admin can unassign' }, { status: 403 });
  }

  const now = new Date().toISOString();
  taskQueries.updateAssignee.run(null, now, id);

  // Reset status to todo if it was in_progress
  if (task.status === 'in_progress') {
    taskQueries.updateStatus.run('todo', now, id);
  }

  return NextResponse.json({ success: true });
}
