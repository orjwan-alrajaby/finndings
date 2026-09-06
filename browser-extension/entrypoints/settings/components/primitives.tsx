import type { ReactNode } from "react";
import { Star, TriangleAlert } from "lucide-react";

// Unchanged from the original settings page — same visual language.
export function Section({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-finn-black">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-finn-iron">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-5 w-10 flex-shrink-0 rounded-full p-1 transition-colors ${checked ? "bg-finn-accent-blue" : "bg-finn-iron/40 border border-finn-iron/15"
        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow transition-[left] duration-200 ease-in-out ${checked ? "left-6" : "left-1"
          }`}
      />
    </button>
  );
}

export function DefaultBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-finn-accent-blue/10 px-2.5 py-1 text-[10px] font-bold text-finn-accent-blue">
      <Star className="h-3 w-3 fill-current" /> Default
    </span>
  );
}

export function SetDefaultButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full bg-finn-iron/15 px-2.5 py-1 text-[10px] font-bold text-finn-iron hover:text-finn-black">
      <Star className="h-3 w-3" /> Set as default
    </button>
  );
}

export function IssuesNotice({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-finn-warning/10 px-3 py-2">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-finn-warning" />
      <ul className="space-y-0.5 text-[11px] leading-4 text-finn-warning font-medium">
        {issues.map((issue, i) => <li key={i}>{issue}</li>)}
      </ul>
    </div>
  );
}


export function CustomBadge() {
  return <span className="rounded-full bg-finn-cotton px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-finn-iron">Custom</span>;
}