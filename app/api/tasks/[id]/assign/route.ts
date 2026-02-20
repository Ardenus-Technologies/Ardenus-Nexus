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

  // Non-admins can only opt into tasks from their department
  if (session.user.role !== 'admin' && task.department !== session.user.department) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Anyone can opt in — upsert changes type to 'opted_in' even if already assigned
  taskAssigneeQueries.optIn.run(id, session.user.id);

  return NextResponse.json({ success: true });
}
