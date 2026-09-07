import type { ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
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

/**
 * On or off, as a switch.
 *
 * Radix's, rather than a button carrying `role="switch"` by hand. The
 * hand-rolled one got the role and `aria-checked` right and still had to be
 * told not to fire while disabled inside its own click handler; Radix takes
 * the disabled state seriously, handles Space and Enter, and keeps the thumb
 * a child element whose position is driven by `data-state` rather than by a
 * class computed alongside the one on the track.
 */
export function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label?: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
      /* A switch is two states and no words. The label names the act for a
         screen reader; the title is the same sentence for everyone else. */
      title={label}
      className={[
        "relative h-5 w-10 flex-shrink-0 rounded-full p-1 transition-colors",
        "data-[state=checked]:bg-finn-accent-blue",
        "data-[state=unchecked]:border data-[state=unchecked]:border-finn-iron/15",
        "data-[state=unchecked]:bg-finn-iron/40",
        "disabled:cursor-not-allowed disabled:opacity-40",
      ].join(" ")}
    >
      <Switch.Thumb
        className={[
          "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow",
          "transition-[left] duration-200 ease-in-out",
          "data-[state=checked]:left-6 data-[state=unchecked]:left-1",
        ].join(" ")}
      />
    </Switch.Root>
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
      <Star aria-hidden="true" className="h-3 w-3 fill-current" /> Default
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
      <Star aria-hidden="true" className="h-3 w-3" /> Set as default
    </button>
  );
}
