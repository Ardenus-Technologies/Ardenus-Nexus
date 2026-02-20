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
  onOptOut: (taskId: string) => void;
  onSubtaskToggle: (subtaskId: string, newStatus: string) => void;
}

function SortableTaskItem({ task, currentUserId, isAdmin, onTaskClick, onOptIn, onOptOut, onSubtaskToggle }: SortableTaskItemProps) {
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
        onOptOut={onOptOut}
        onSubtaskToggle={onSubtaskToggle}
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
  onOptOut: (taskId: string) => void;
  onSubtaskToggle: (subtaskId: string, newStatus: string) => void;
  onReorder: (taskIds: string[]) => void;
}

export function TaskList({ tasks, currentUserId, isAdmin, onTaskClick, onOptIn, onOptOut, onSubtaskToggle, onReorder }: TaskListProps) {
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

  const priorityBar = (
    <div className="flex flex-col items-center gap-1 pt-1 pb-1 mr-3 flex-shrink-0 select-none">
      <span className="text-[10px] font-medium tracking-wider uppercase text-orange-400/80">High</span>
      <div className="w-1 flex-1 rounded-full bg-gradient-to-b from-orange-500 via-yellow-500/60 to-blue-500/30" />
      <span className="text-[10px] font-medium tracking-wider uppercase text-blue-400/50">Low</span>
    </div>
  );

  if (!isAdmin) {
    // Non-admin: static list, no drag-and-drop
    return (
      <div className="flex">
        {priorityBar}
        <div className="space-y-3 flex-1 min-w-0">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onClick={() => onTaskClick(task.id)}
              onOptIn={onOptIn}
              onOptOut={onOptOut}
              onSubtaskToggle={onSubtaskToggle}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex">
          {priorityBar}
          <div className="space-y-3 flex-1 min-w-0">
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onTaskClick={onTaskClick}
                onOptIn={onOptIn}
                onOptOut={onOptOut}
                onSubtaskToggle={onSubtaskToggle}
              />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}
