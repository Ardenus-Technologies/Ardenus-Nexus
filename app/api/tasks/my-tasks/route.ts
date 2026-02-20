import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDb,
  taskQueries,
  taskAssigneeQueries,
  taskCommentQueries,
} from "@/lib/db";
import type { DbTaskWithUsers } from "@/lib/db";
import type { Task, TaskAssignee } from "@/types";

const db = getDb();

const findAssignedToUser = db.prepare<[string], DbTaskWithUsers>(`
  SELECT t.*, c.name as creator_name
  FROM tasks t
  JOIN users c ON t.created_by = c.id
  JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = ? AND ta.type = 'assigned'
  WHERE t.parent_task_id IS NULL AND t.status = 'todo'
  ORDER BY t.position ASC
`);

const findOptedInByUser = db.prepare<[string], DbTaskWithUsers>(`
  SELECT t.*, c.name as creator_name
  FROM tasks t
  JOIN users c ON t.created_by = c.id
  JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = ? AND ta.type = 'opted_in'
  WHERE t.parent_task_id IS NULL AND t.status = 'todo'
  ORDER BY t.position ASC
`);

function getTaskPeople(taskId: string): { assignees: TaskAssignee[]; optedIn: TaskAssignee[] } {
  const rows = taskAssigneeQueries.findByTaskId.all(taskId);
  const assignees: TaskAssignee[] = [];
  const optedIn: TaskAssignee[] = [];
  for (const a of rows) {
    const entry = { id: a.user_id, name: a.user_name };
    if (a.type === "opted_in") {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const assignedRows = findAssignedToUser.all(userId);
  const assigned = assignedRows.map((t) => {
    const subtasks = taskQueries.findSubtasks.all(t.id);
    return mapTask(t, subtasks);
  });

  const optedInRows = findOptedInByUser.all(userId);
  const optedIn = optedInRows.map((t) => {
    const subtasks = taskQueries.findSubtasks.all(t.id);
    return mapTask(t, subtasks);
  });

  return NextResponse.json({ assigned, optedIn });
}
