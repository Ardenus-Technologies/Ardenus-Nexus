import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, taskCommentQueries } from '@/lib/db';
import type { Task, TaskComment } from '@/types';

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

  const subtasks = taskQueries.findSubtasks.all(id);
  const comments = taskCommentQueries.findByTaskId.all(id);

  const result: Task & { comments: TaskComment[] } = {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assignee_id,
    assigneeName: task.assignee_name,
    createdBy: task.created_by,
    creatorName: task.creator_name,
    dueDate: task.due_date,
    timeEstimate: task.time_estimate,
    parentTaskId: task.parent_task_id,
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
    commentCount: comments.length,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
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
    const { title, description, status, priority, assigneeId, dueDate, timeEstimate } = body;
    if (title !== undefined && !title.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }
    taskQueries.update.run(
      title?.trim() ?? task.title,
      description !== undefined ? (description?.trim() || null) : task.description,
      status ?? task.status,
      priority ?? task.priority,
      assigneeId !== undefined ? (assigneeId || null) : task.assignee_id,
      dueDate !== undefined ? (dueDate || null) : task.due_date,
      timeEstimate !== undefined ? (timeEstimate ? Number(timeEstimate) : null) : task.time_estimate,
      now,
      id
    );
  } else {
    // Regular users: can update status (if assignee) and self-assign/unassign
    const { status, assigneeId } = body;

    if (status !== undefined) {
      if (task.assignee_id !== session.user.id) {
        return NextResponse.json({ error: 'Only the assignee can change status' }, { status: 403 });
      }
      taskQueries.updateStatus.run(status, now, id);
    }

    if (assigneeId !== undefined) {
      if (assigneeId && assigneeId !== session.user.id) {
        return NextResponse.json({ error: 'You can only assign tasks to yourself' }, { status: 403 });
      }
      if (!assigneeId && task.assignee_id !== session.user.id) {
        return NextResponse.json({ error: 'You can only unassign yourself' }, { status: 403 });
      }
      taskQueries.updateAssignee.run(assigneeId || null, now, id);
    }
  }

  const updated = taskQueries.findById.get(id);
  const subtasks = taskQueries.findSubtasks.all(id);

  return NextResponse.json({
    id: updated!.id,
    title: updated!.title,
    description: updated!.description,
    status: updated!.status,
    priority: updated!.priority,
    assigneeId: updated!.assignee_id,
    assigneeName: updated!.assignee_name,
    createdBy: updated!.created_by,
    creatorName: updated!.creator_name,
    dueDate: updated!.due_date,
    timeEstimate: updated!.time_estimate,
    parentTaskId: updated!.parent_task_id,
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
    commentCount: taskCommentQueries.countByTaskId.get(id)?.count ?? 0,
    createdAt: updated!.created_at,
    updatedAt: updated!.updated_at,
  } satisfies Task);
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
