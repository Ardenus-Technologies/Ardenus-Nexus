import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskAssigneeQueries } from '@/lib/db';

export async function POST(
  request: Request,
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

  // Admin can remove anyone; regular users can only remove themselves
  const body = await request.json().catch(() => ({}));
  const targetUserId: string = (session.user.role === 'admin' && body.userId) ? body.userId : session.user.id;

  if (session.user.role !== 'admin' && targetUserId !== session.user.id) {
    return NextResponse.json({ error: 'You can only remove yourself' }, { status: 403 });
  }

  taskAssigneeQueries.remove.run(id, targetUserId);

  return NextResponse.json({ success: true });
}
