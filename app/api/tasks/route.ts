import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskAssigneeQueries, taskCommentQueries, generateId } from '@/lib/db';
import type { DbTaskWithUsers } from '@/lib/db';
import type { Task, TaskAssignee } from '@/types';

function getTaskPeople(taskId: string): { assignees: TaskAssignee[]; optedIn: TaskAssignee[] } {
  const rows = taskAssigneeQueries.findByTaskId.all(taskId);
  const assignees: TaskAssignee[] = [];
  const optedIn: TaskAssignee[] = [];
  for (const a of rows) {
    const entry = { id: a.user_id, name: a.user_name };
    if (a.type === 'opted_in') {
      optedIn.push(entry);
    } else {
      assignees.push(entry);
    }
  }
  return { assignees, optedIn };
}

function mapTask(t: DbTaskWithUsers, subtasks: DbTaskWithUsers[]): Task {
  const people = getTaskPeople(t.id);
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    department: t.department,
    assignees: people.assignees,
    optedIn: people.optedIn,
    createdBy: t.created_by,
    creatorName: t.creator_name,
    dueDate: t.due_date,
    timeEstimate: t.time_estimate,
    parentTaskId: t.parent_task_id,
    position: t.position,
    subtasks: subtasks.map((s) => {
      const sp = getTaskPeople(s.id);
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        department: s.department,
        assignees: sp.assignees,
        optedIn: sp.optedIn,
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
      };
    }),
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

  const isAdmin = session.user.role === 'admin';
  const tasks = isAdmin
    ? taskQueries.findAll.all()
    : taskQueries.findByDepartment.all(session.user.department);

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, description, assigneeIds, dueDate, timeEstimate, parentTaskId, department } = body as {
    title?: string;
    description?: string;
    assigneeIds?: string[];
    dueDate?: string;
    timeEstimate?: string | number;
    parentTaskId?: string;
    department?: string;
  };

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Determine department: subtasks inherit parent, otherwise use body or session default
  let taskDepartment = session.user.department;
  if (parentTaskId) {
    const parent = taskQueries.findById.get(parentTaskId);
    if (!parent) {
      return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
    }
    if (parent.parent_task_id) {
      return NextResponse.json({ error: 'Subtasks cannot be nested more than one level' }, { status: 400 });
    }
    taskDepartment = parent.department;
  } else if (department === 'sales' || department === 'development') {
    taskDepartment = department;
  }

  try {
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
      null, // assignee_id column unused — we use task_assignees with type
      session.user.id,
      dueDate || null,
      timeEstimate ? Number(timeEstimate) : null,
      parentTaskId || null,
      position,
      taskDepartment
    );

    // Insert initial assignees (admin-assigned) into join table
    const ids: string[] = Array.isArray(assigneeIds) ? assigneeIds : [];
    for (const uid of ids) {
      taskAssigneeQueries.add.run(id, uid, 'assigned');
    }

    const task = taskQueries.findById.get(id);
    if (!task) {
      return NextResponse.json({ error: 'Task created but could not be retrieved' }, { status: 500 });
    }
    return NextResponse.json(mapTask(task, []), { status: 201 });
  } catch (err) {
    console.error('Failed to create task:', err);
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
