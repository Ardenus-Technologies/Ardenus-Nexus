import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskAssigneeQueries, taskCommentQueries } from '@/lib/db';
import type { DbTaskWithUsers } from '@/lib/db';
import type { Task, TaskAssignee, TaskComment } from '@/types';

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

  // Non-admins can only access tasks from their department
  if (session.user.role !== 'admin' && task.department !== session.user.department) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const subtasks = taskQueries.findSubtasks.all(id);
  const comments = taskCommentQueries.findByTaskId.all(id);

  const result: Task & { comments: TaskComment[] } = {
    ...mapTask(task, subtasks),
    comments: comments.map((c) => ({
      id: c.id,
      taskId: c.task_id,
      userId: c.user_id,
      userName: c.user_name,
      content: c.content,
      createdAt: c.created_at,
    })),
  };

  return NextResponse.json(result);
}

export async function PUT(
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
  const now = new Date().toISOString();

  if (session.user.role === 'admin') {
    const { title, description, status, assigneeIds, dueDate, timeEstimate } = body;
    if (title !== undefined && !title.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }
    taskQueries.update.run(
      title?.trim() ?? task.title,
      description !== undefined ? (description?.trim() || null) : task.description,
      status ?? task.status,
      dueDate !== undefined ? (dueDate || null) : task.due_date,
      timeEstimate !== undefined ? (timeEstimate ? Number(timeEstimate) : null) : task.time_estimate,
      now,
      id
    );

    // Admin can replace the full assigned list (type='assigned' rows only)
    if (Array.isArray(assigneeIds)) {
      const current = taskAssigneeQueries.findByTaskId.all(id);
      const currentAssigned = current.filter((a) => a.type === 'assigned');
      const currentIdList = currentAssigned.map((a) => a.user_id);
      const newIdList = assigneeIds as string[];
      const newIdSet = new Set(newIdList);
      const currentIdSet = new Set(currentIdList);
      // Remove assigned users not in the new list
      currentIdList.forEach((uid) => {
        if (!newIdSet.has(uid)) taskAssigneeQueries.remove.run(id, uid);
      });
      // Add new assigned users
      newIdList.forEach((uid) => {
        if (!currentIdSet.has(uid)) taskAssigneeQueries.add.run(id, uid, 'assigned');
      });
    }
  } else {
    // Regular users: can update status if they are assigned or opted in
    const { status } = body;

    if (status !== undefined) {
      const isInTask = (taskAssigneeQueries.isInTask.get(id, session.user.id)?.count ?? 0) > 0;
      if (!isInTask) {
        return NextResponse.json({ error: 'Only an assigned or opted-in user can change status' }, { status: 403 });
      }
      taskQueries.updateStatus.run(status, now, id);
    }
  }

  const updated = taskQueries.findById.get(id)!;
  const subtasks = taskQueries.findSubtasks.all(id);

  return NextResponse.json(mapTask(updated, subtasks));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const task = taskQueries.findById.get(id);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  taskQueries.delete.run(id);
  return NextResponse.json({ success: true });
}
