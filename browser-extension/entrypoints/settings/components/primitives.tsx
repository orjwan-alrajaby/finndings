import type { ReactNode } from "react";
import { Star } from "lucide-react";

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
      /* A switch is two states and no words. The label names the act for a
         screen reader; the title is the same sentence for everyone else. */
      title={label}
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

/**
 * White on the default profile's pale blue, rather than the other way round.
 *
 * The badge used to be a 10% blue on a near-white card. That card is now pale
 * blue itself — which is how a reader finds the default without reading — and
 * a 10% blue badge on it would be two washes of the same colour with nothing
 * between them. White is the only ground that still reads as a badge there.
 */
export function DefaultBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-finn-accent-blue">
      <Star className="h-3 w-3 fill-current" /> Default
    </span>
  );
}

export function SetDefaultButton({ onClick, label }: {
  onClick: () => void;
  /** The profile this acts on, since six identical buttons say nothing alone. */
  label?: string;
}) {
  const said = label ? `Make ${label} the default profile` : "Set as default";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={said}
      title={said}
      className="inline-flex items-center gap-1 rounded-full bg-finn-iron/15 px-2.5 py-1 text-[10px] font-bold text-finn-iron hover:bg-finn-pale-blue hover:text-finn-accent-blue"
    >
      <Star className="h-3 w-3" /> Set as default
    </button>
  );
}
