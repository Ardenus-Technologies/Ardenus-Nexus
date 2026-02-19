"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/types";

interface SortableTaskItemProps {
  task: Task;
  currentUserId: string;
  isAdmin: boolean;
  onTaskClick: (taskId: string) => void;
  onOptIn: (taskId: string) => void;
}

function SortableTaskItem({ task, currentUserId, isAdmin, onTaskClick, onOptIn }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        currentUserId={currentUserId}
        onClick={() => onTaskClick(task.id)}
        onOptIn={onOptIn}
        dragHandleProps={isAdmin ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  currentUserId: string;
  isAdmin: boolean;
  onTaskClick: (taskId: string) => void;
  onOptIn: (taskId: string) => void;
  onReorder: (taskIds: string[]) => void;
}

export function TaskList({ tasks, currentUserId, isAdmin, onTaskClick, onOptIn, onReorder }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder(reordered.map((t) => t.id));
  }, [tasks, onReorder]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/50">No tasks found</p>
      </div>
    );
  }

  if (!isAdmin) {
    // Non-admin: static list, no drag-and-drop
    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentUserId={currentUserId}
            onClick={() => onTaskClick(task.id)}
            onOptIn={onOptIn}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onTaskClick={onTaskClick}
              onOptIn={onOptIn}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
