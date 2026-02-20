"use client";

interface PaneCountSelectorProps {
  value: 2 | 3 | 4;
  onChange: (count: 2 | 3 | 4) => void;
}

const counts = [2, 3, 4] as const;

export function PaneCountSelector({ value, onChange }: PaneCountSelectorProps) {
  return (
    <div className="flex gap-1">
      {counts.map((count) => (
        <button
          key={count}
          onClick={() => onChange(count)}
          className={`p-1.5 rounded transition-colors ${
            value === count
              ? "border border-white/60 bg-white/10"
              : "border border-white/10 hover:border-white/30 hover:bg-white/5"
          }`}
          aria-label={`${count} panes`}
          title={`${count} panes`}
        >
          {count === 2 && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
          {count === 3 && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="0.5" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="6" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="11.5" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
          {count === 4 && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
