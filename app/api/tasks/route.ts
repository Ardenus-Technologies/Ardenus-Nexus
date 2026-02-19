import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskCommentQueries, generateId } from '@/lib/db';
import type { Task } from '@/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = taskQueries.findAll.all();

  const result: Task[] = tasks.map((t) => {
    const subtasks = taskQueries.findSubtasks.all(t.id);
    const commentCount = taskCommentQueries.countByTaskId.get(t.id)?.count ?? 0;

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assignee_id,
      assigneeName: t.assignee_name,
      createdBy: t.created_by,
      creatorName: t.creator_name,
      dueDate: t.due_date,
      timeEstimate: t.time_estimate,
      parentTaskId: t.parent_task_id,
      subtasks: subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        assigneeId: s.assignee_id,
        assigneeName: s.assignee_name,
        createdBy: s.created_by,
        creatorName: s.creator_name,
        dueDate: s.due_date,
        timeEstimate: s.time_estimate,
        parentTaskId: s.parent_task_id,
        subtasks: [],
        commentCount: taskCommentQueries.countByTaskId.get(s.id)?.count ?? 0,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
      commentCount,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, priority, assigneeId, dueDate, timeEstimate, parentTaskId } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (parentTaskId) {
    const parent = taskQueries.findById.get(parentTaskId);
    if (!parent) {
      return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
    }
    if (parent.parent_task_id) {
      return NextResponse.json({ error: 'Subtasks cannot be nested more than one level' }, { status: 400 });
    }
  }

  const id = generateId();
  taskQueries.create.run(
    id,
    title.trim(),
    description?.trim() || null,
    'todo',
    priority || 'medium',
    assigneeId || null,
    session.user.id,
    dueDate || null,
    timeEstimate ? Number(timeEstimate) : null,
    parentTaskId || null
  );

  const task = taskQueries.findById.get(id);
  return NextResponse.json(
    {
      id: task!.id,
      title: task!.title,
      description: task!.description,
      status: task!.status,
      priority: task!.priority,
      assigneeId: task!.assignee_id,
      assigneeName: task!.assignee_name,
      createdBy: task!.created_by,
      creatorName: task!.creator_name,
      dueDate: task!.due_date,
      timeEstimate: task!.time_estimate,
      parentTaskId: task!.parent_task_id,
      subtasks: [],
      commentCount: 0,
      createdAt: task!.created_at,
      updatedAt: task!.updated_at,
    } satisfies Task,
    { status: 201 }
  );
}
