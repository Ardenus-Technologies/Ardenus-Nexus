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

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Development", color: "#ffffff" },
  { id: "2", name: "Meetings", color: "#a0a0a0" },
  { id: "3", name: "Research", color: "#737373" },
  { id: "4", name: "Admin", color: "#525252" },
];
