import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskCommentQueries, generateId } from '@/lib/db';
import type { TaskComment } from '@/types';

export async function GET(
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

  const comments = taskCommentQueries.findByTaskId.all(id);

  const result: TaskComment[] = comments.map((c) => ({
    id: c.id,
    taskId: c.task_id,
    userId: c.user_id,
    userName: c.user_name,
    content: c.content,
    createdAt: c.created_at,
  }));

  return NextResponse.json(result);
}

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

  const body = await request.json();
  const { content } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const commentId = generateId();
  taskCommentQueries.create.run(commentId, id, session.user.id, content.trim());

  return NextResponse.json(
    {
      id: commentId,
      taskId: id,
      userId: session.user.id,
      userName: session.user.name,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    } satisfies TaskComment,
    { status: 201 }
  );
}
