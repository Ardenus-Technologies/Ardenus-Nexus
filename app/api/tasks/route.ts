import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskAssigneeQueries, taskCommentQueries, generateId } from '@/lib/db';
import type { DbTaskWithUsers } from '@/lib/db';
import type { Task, TaskAssignee } from '@/types';

function getAssignees(taskId: string): TaskAssignee[] {
  return taskAssigneeQueries.findByTaskId.all(taskId).map((a) => ({
    id: a.user_id,
    name: a.user_name,
  }));
}

function mapTask(t: DbTaskWithUsers, subtasks: DbTaskWithUsers[]): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignees: getAssignees(t.id),
    createdBy: t.created_by,
    creatorName: t.creator_name,
    dueDate: t.due_date,
    timeEstimate: t.time_estimate,
    parentTaskId: t.parent_task_id,
    position: t.position,
    subtasks: subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      priority: s.priority,
      assignees: getAssignees(s.id),
      createdBy: s.created_by,
      creatorName: s.creator_name,
      dueDate: s.due_date,
      timeEstimate: s.time_estimate,
      parentTaskId: s.parent_task_id,
      position: s.position,
      subtasks: [],
      commentCount: taskCommentQueries.countByTaskId.get(s.id)?.count ?? 0,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    commentCount: taskCommentQueries.countByTaskId.get(t.id)?.count ?? 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = taskQueries.findAll.all();
  const result: Task[] = tasks.map((t) => {
    const subtasks = taskQueries.findSubtasks.all(t.id);
    return mapTask(t, subtasks);
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
  const { title, description, priority, assigneeIds, dueDate, timeEstimate, parentTaskId } = body;

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

  // New top-level tasks go to the end; subtasks don't use position
  let position = 0;
  if (!parentTaskId) {
    const maxRow = taskQueries.maxPosition.get();
    position = (maxRow?.max_pos ?? -1) + 1;
  }

  taskQueries.create.run(
    id,
    title.trim(),
    description?.trim() || null,
    'todo',
    priority || 'medium',
    null, // assignee_id kept null — we use join table now
    session.user.id,
    dueDate || null,
    timeEstimate ? Number(timeEstimate) : null,
    parentTaskId || null,
    position
  );

  // Insert initial assignees into join table
  const ids: string[] = Array.isArray(assigneeIds) ? assigneeIds : [];
  for (const uid of ids) {
    taskAssigneeQueries.add.run(id, uid);
  }

  const task = taskQueries.findById.get(id)!;
  return NextResponse.json(mapTask(task, []), { status: 201 });
}
