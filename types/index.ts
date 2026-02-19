export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TimeEntry {
  id: string;
  userId?: string;
  categoryId: string;
  tagId?: string | null;
  description: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // in seconds
}

export interface TimerState {
  isRunning: boolean;
  currentCategoryId: string | null;
  currentDescription: string;
  startTime: Date | null;
  elapsedSeconds: number;
}

export interface Room {
  id: string;
  name: string;
  meetLink: string | null;
  requireClockIn: boolean;
  participants: RoomParticipant[];
}

export interface RoomParticipant {
  userId: string;
  userName: string;
  joinedAt: string;
}

export interface TaskAssignee {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignees: TaskAssignee[];
  createdBy: string;
  creatorName: string;
  dueDate: string | null;
  timeEstimate: number | null;
  parentTaskId: string | null;
  position: number;
  subtasks: Task[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export const DEFAULT_CATEGORIES: Category[] = [];
