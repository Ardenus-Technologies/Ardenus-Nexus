"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type ViewId = "dashboard" | "team" | "tasks" | "admin-stats" | "admin-users";

export interface PaneConfig {
  paneCount: 2 | 3 | 4;
  views: ViewId[];
}

interface MultiPaneContextValue {
  isMultiPane: boolean;
  toggleMultiPane: () => void;
  config: PaneConfig;
  setPaneCount: (count: 2 | 3 | 4) => void;
  setPaneView: (index: number, view: ViewId) => void;
}

const defaultConfig: PaneConfig = {
  paneCount: 2,
  views: ["dashboard", "team"],
};

const MultiPaneContext = createContext<MultiPaneContextValue | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function MultiPaneProvider({ children }: { children: ReactNode }) {
  const [isMultiPane, setIsMultiPane] = useState(false);
  const [config, setConfig] = useState<PaneConfig>(defaultConfig);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setIsMultiPane(loadFromStorage("nexus_multi_pane", false));
    setConfig(loadFromStorage("nexus_pane_config", defaultConfig));
    setHydrated(true);
  }, []);

  // Persist to localStorage on change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("nexus_multi_pane", JSON.stringify(isMultiPane));
  }, [isMultiPane, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("nexus_pane_config", JSON.stringify(config));
  }, [config, hydrated]);

  const toggleMultiPane = useCallback(() => {
    setIsMultiPane((prev) => !prev);
  }, []);

  const setPaneCount = useCallback((count: 2 | 3 | 4) => {
    setConfig((prev) => {
      const views: ViewId[] = [...prev.views];
      // Truncate if shrinking
      while (views.length > count) views.pop();
      // Fill new panes with "dashboard" if growing
      while (views.length < count) views.push("dashboard");
      return { paneCount: count, views };
    });
  }, []);

  const setPaneView = useCallback((index: number, view: ViewId) => {
    setConfig((prev) => {
      const views = [...prev.views];
      views[index] = view;
      return { ...prev, views };
    });
  }, []);

  return (
    <MultiPaneContext.Provider value={{ isMultiPane, toggleMultiPane, config, setPaneCount, setPaneView }}>
      {children}
    </MultiPaneContext.Provider>
  );
}

export function useMultiPane(): MultiPaneContextValue {
  const ctx = useContext(MultiPaneContext);
  if (!ctx) throw new Error("useMultiPane must be used within MultiPaneProvider");
  return ctx;
}
