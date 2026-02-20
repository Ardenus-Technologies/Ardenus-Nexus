"use client";

import { memo, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useMultiPane, type ViewId } from "@/components/MultiPaneContext";
import { PaneCountSelector } from "./PaneCountSelector";
import {
  DashboardView,
  TeamView,
  TasksView,
  AdminStatsView,
  AdminUsersView,
} from "@/components/views";

const VIEW_LABELS: Record<ViewId, string> = {
  dashboard: "Dashboard",
  team: "Team",
  tasks: "Tasks",
  "admin-stats": "Admin Stats",
  "admin-users": "Admin Users",
};

const ViewRenderer = memo(function ViewRenderer({ viewId }: { viewId: ViewId }) {
  switch (viewId) {
    case "dashboard":
      return <DashboardView compact />;
    case "team":
      return <TeamView compact />;
    case "tasks":
      return <TasksView compact />;
    case "admin-stats":
      return <AdminStatsView compact />;
    case "admin-users":
      return <AdminUsersView compact />;
  }
});

const Pane = memo(function Pane({
  index,
  viewId,
  availableViews,
  onViewChange,
}: {
  index: number;
  viewId: ViewId;
  availableViews: ViewId[];
  onViewChange: (index: number, view: ViewId) => void;
}) {
  return (
    <div className="flex flex-col bg-black min-h-0">
      {/* Pane header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
        <select
          value={viewId}
          onChange={(e) => onViewChange(index, e.target.value as ViewId)}
          className="bg-transparent border border-white/10 rounded px-2 py-1 text-sm text-white/80 outline-none focus:border-white/30 cursor-pointer"
          aria-label={`Pane ${index + 1} view`}
        >
          {availableViews.map((id) => (
            <option key={id} value={id} className="bg-black text-white">
              {VIEW_LABELS[id]}
            </option>
          ))}
        </select>
      </div>
      {/* Pane content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ViewRenderer viewId={viewId} />
      </div>
    </div>
  );
});

export function MultiPaneLayout() {
  const { data: session } = useSession();
  const { config, setPaneCount, setPaneView } = useMultiPane();
  const isAdmin = session?.user?.role === "admin";

  const availableViews = useMemo<ViewId[]>(() => {
    const base: ViewId[] = ["dashboard", "team", "tasks"];
    if (isAdmin) {
      base.push("admin-stats", "admin-users");
    }
    return base;
  }, [isAdmin]);

  const gridClass =
    config.paneCount === 2
      ? "grid-cols-2"
      : config.paneCount === 3
        ? "grid-cols-3"
        : "grid-cols-2 grid-rows-2";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 65px)" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
        <span className="text-xs text-white/50 uppercase tracking-wider">Layout</span>
        <PaneCountSelector value={config.paneCount} onChange={setPaneCount} />
      </div>

      {/* Grid */}
      <div className={`grid ${gridClass} gap-px bg-white/10 flex-1 min-h-0`}>
        {config.views.slice(0, config.paneCount).map((viewId, i) => (
          <Pane
            key={i}
            index={i}
            viewId={viewId}
            availableViews={availableViews}
            onViewChange={setPaneView}
          />
        ))}
      </div>
    </div>
  );
}
