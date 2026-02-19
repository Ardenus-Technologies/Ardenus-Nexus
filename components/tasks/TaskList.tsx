"use client";

import { AnimatePresence } from "framer-motion";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onGrab: (taskId: string) => void;
}

export function TaskList({ tasks, onTaskClick, onGrab }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/50">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task.id)}
            onGrab={onGrab}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
