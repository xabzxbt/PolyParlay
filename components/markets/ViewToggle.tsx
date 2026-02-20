"use client";
import { cn } from "@/lib/utils";

type ViewMode = "grouped" | "flat";

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center bg-surface-2 border border-border-default rounded-button p-0.5">
      <button onClick={() => onChange("grouped")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 rounded-[5px] text-[10px] font-semibold transition-all",
          value === "grouped" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-secondary hover:bg-surface-1"
        )}>
        {/* Grid icon */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="0.8" />
          <rect x="6" y="0.5" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="0.8" />
          <rect x="0.5" y="6" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="0.8" />
          <rect x="6" y="6" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="0.8" />
        </svg>
        Events
      </button>
      <button onClick={() => onChange("flat")}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 rounded-[5px] text-[10px] font-semibold transition-all",
          value === "flat" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-secondary hover:bg-surface-1"
        )}>
        {/* List icon */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 2.5H9M1 5H9M1 7.5H9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
        Markets
      </button>
    </div>
  );
}
