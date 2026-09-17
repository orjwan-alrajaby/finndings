import { useState, type ReactNode } from "react";
import { ArrowRight, CircleSlash, Info, Wallet } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { isEmptyChange } from "@/lib/lens-ai/proposal";

import type { Proposal } from "./hooks";

/**
 * "Here's what I understood": a proposed change, laid out as Lens's own
 * settings before any of them are applied.
 *
 * Every row is drawn from the two sets of answers — the rank, the share of
 * the result, where it was before — so what the reader approves is exactly
 * what the engine will be given. The model contributes only the short
 * reasons, and those are marked as quotes of what the reader said.
 *
 * Two things are kept visible rather than tidied away, because they are what
 * makes the interpretation trustworthy: what Lens *couldn't* represent, and
 * anything the model suggested that Lens refused.
 */
export function ProposalReview({
    proposal,
    eyebrow,
    title,
    summary,
    budgetFigure,
    onBudgetFigure,
    children,
}: {
    proposal: Proposal;
    eyebrow: string;
    title: string;
    summary?: string | null;
    /** For the case where the reader talked about cost without a figure. */
    budgetFigure?: number | null;
    onBudgetFigure?: (figure: number | null) => void;
    /** The actions: apply, run, cancel. */
    children: ReactNode;
}) {
    const { change, description } = proposal;
    const empty = isEmptyChange(change) && budgetFigure == null;

    return (
        <div className="rounded-[22px] bg-finn-snow p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                {eyebrow}
            </p>

            <h3 className="mt-1 text-lg font-black text-finn-black">{title}</h3>

            {summary && (
                <p className="mt-1.5 text-sm leading-6 text-finn-iron">{summary}</p>
            )}

            {description.profileLabel && (
                <p className="mt-4 text-xs font-bold text-finn-black">
                    Starting from the {description.profileLabel} profile.
                </p>
            )}

            {description.order && (
                <div className="mt-4">
                    <Label>Your priority order</Label>

                    <ol className="mt-2 space-y-1.5">
                        {description.order.map((row) => (
                            <li
                                key={row.id}
                                className="flex items-start gap-3 rounded-2xl bg-white px-3 py-2.5"
                            >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-finn-pale-blue text-[10px] font-black text-finn-accent-blue">
                                    {row.rank}
                                </span>

                                <PriorityIcon name={row.icon} className="mt-1 h-4 w-4 shrink-0" />

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <span className="text-sm font-black text-finn-black">
                                            {row.label}
                                        </span>

                                        <span className="text-[11px] font-bold text-finn-iron">
                                            {row.weightPercent}% of the result
                                        </span>

                                        <Movement
                                            rank={row.rank}
                                            previousRank={row.previousRank}
                                            kept={row.kept}
                                        />
                                    </div>

                                    {row.reason && (
                                        <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                                            Because {row.reason}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>

                    {description.dropped.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-finn-iron">
                            No longer ranked:{" "}
                            {description.dropped
                                .map((item) => `${item.label} (was #${item.previousRank})`)
                                .join(", ")}
                            .
                        </p>
                    )}
                </div>
            )}

            {description.raises.length > 0 && (
                <div className="mt-4">
                    <Label>What counts for more inside them</Label>

                    <ul className="mt-2 space-y-1.5">
                        {description.raises.map((raise) => (
                            <li
                                key={raise.feature}
                                className="rounded-2xl bg-white px-3 py-2.5"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black text-finn-black">
                                        {raise.label}
                                    </span>

                                    <span
                                        className={[
                                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                                            raise.to
                                                ? FEATURE_IMPORTANCE[raise.to].chipClass
                                                : "bg-finn-cotton text-finn-iron",
                                        ].join(" ")}
                                    >
                                        {raise.to
                                            ? FEATURE_IMPORTANCE[raise.to].badgeLabel
                                            : "Back to standard"}
                                    </span>

                                    <span className="text-[11px] font-bold text-finn-iron">
                                        under {raise.categoryLabel}
                                        {raise.from &&
                                            ` · was ${FEATURE_IMPORTANCE[raise.from].label}`}
                                    </span>
                                </div>

                                {raise.reason && (
                                    <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                                        Because {raise.reason}
                                    </p>
                                )}

                                {raise.inactive && (
                                    <p className="mt-0.5 text-xs leading-5 text-finn-warning-deep">
                                        {raise.categoryLabel} isn't one of your
                                        priorities, so this won't count until
                                        it is.
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {description.assumptions.length > 0 && (
                <div className="mt-4">
                    <Label>Your assumptions</Label>

                    <dl className="mt-2 space-y-1.5">
                        {description.assumptions.map((row) => (
                            <div
                                key={row.label}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2.5"
                            >
                                <dt className="text-xs font-bold text-finn-iron">
                                    {row.label}
                                </dt>

                                <dd className="flex items-center gap-1.5 text-sm font-black text-finn-black">
                                    <span className="font-bold text-finn-iron">{row.from}</span>
                                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-finn-iron" />
                                    {row.to}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}

            {change.budgetWithoutFigure && onBudgetFigure && (
                <BudgetFigure
                    said={change.budgetWithoutFigure}
                    figure={budgetFigure ?? null}
                    onChange={onBudgetFigure}
                />
            )}

            {change.notRepresentable.length > 0 && (
                <div className="mt-4">
                    <Label>What Lens can't take into account</Label>

                    <ul className="mt-2 space-y-1.5">
                        {change.notRepresentable.map((item) => (
                            <li
                                key={item.said}
                                className="flex gap-2.5 rounded-2xl border border-finn-cotton bg-white/60 px-3 py-2.5"
                            >
                                <CircleSlash aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-iron" />

                                <p className="text-xs leading-5 text-finn-iron">
                                    <span className="font-black text-finn-black">
                                        "{item.said}"
                                    </span>{" "}
                                    — {item.explanation}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {change.ignored.length > 0 && <Ignored items={change.ignored} startOpen={empty} />}

            {empty && (
                <p className="mt-4 rounded-2xl bg-white px-3 py-2.5 text-sm leading-6 text-finn-iron">
                    Nothing here maps onto a Lens setting, so there's nothing to
                    change.
                </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}

function Label({ children }: { children: ReactNode }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
            {children}
        </p>
    );
}

function Movement({
    rank,
    previousRank,
    kept,
}: {
    rank: number;
    previousRank: number | null;
    kept: boolean;
}) {
    const [text, tone] =
        previousRank == null
            ? ["New", "bg-finn-pale-blue text-finn-accent-blue"]
            : previousRank > rank
              ? [`Up from #${previousRank}`, "bg-finn-influence-emerald-pale text-finn-influence-emerald"]
              : previousRank < rank
                ? [`Down from #${previousRank}`, "bg-finn-influence-orange-pale text-finn-influence-orange"]
                : kept
                  ? ["Kept from your order", "bg-finn-cotton text-finn-iron"]
                  : ["Unchanged", "bg-finn-cotton text-finn-iron"];

    return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tone}`}>
            {text}
        </span>
    );
}

/**
 * Cost, mentioned without a figure. Lens's budget is a hard limit, so rather
 * than invent one the review asks — and works fine if the reader leaves it.
 */
function BudgetFigure({
    said,
    figure,
    onChange,
}: {
    said: string;
    figure: number | null;
    onChange: (figure: number | null) => void;
}) {
    return (
        <div className="mt-4 rounded-2xl bg-finn-warning/10 px-3 py-3">
            <div className="flex gap-2.5">
                <Wallet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-warning-deep" />

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-finn-black">Budget</p>

                    <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                        You said {said.replace(/^you said /i, "").replace(/\.$/, "")}. Lens's budget is a
                        firm monthly limit that decides which cars can win, so
                        it needs a figure — add one, or leave it and no car is
                        ruled out on price.
                    </p>

                    <label className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-finn-cotton focus-within:ring-finn-accent-blue">
                        <span className="text-xs font-bold text-finn-iron">€</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            placeholder="e.g. 650"
                            value={figure ?? ""}
                            onChange={(event) => {
                                const value = Number(event.target.value);
                                onChange(event.target.value && value > 0 ? value : null);
                            }}
                            className="w-20 bg-transparent text-sm font-black text-finn-black outline-none"
                            aria-label="Monthly budget in euros"
                        />
                        <span className="text-xs font-bold text-finn-iron">per month</span>
                    </label>
                </div>
            </div>
        </div>
    );
}

/**
 * Folded away when the rest of the change stands on its own; open when it is
 * the whole story — a what-if Lens refused entirely owes the reader why.
 */
function Ignored({ items, startOpen }: { items: string[]; startOpen: boolean }) {
    const [open, setOpen] = useState(startOpen);

    return (
        <div className="mt-3">
            <button
                type="button"
                onClick={() => setOpen((was) => !was)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-finn-iron transition hover:text-finn-black"
            >
                <Info aria-hidden="true" className="h-3.5 w-3.5" />
                Lens set aside {items.length} suggestion{items.length === 1 ? "" : "s"} it
                couldn't use
            </button>

            {open && (
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-5 text-finn-iron">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
