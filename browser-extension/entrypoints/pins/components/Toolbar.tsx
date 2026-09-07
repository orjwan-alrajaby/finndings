import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { CircleCheck, Trash2, X } from "lucide-react";

import { SORTS, type SortKey } from "../utils/sorting";

/**
 * Two bars in one slot, because they are two different jobs.
 *
 * Ordinarily the reader is arranging the list; while they are picking cars
 * off, the only things that matter are how many they have picked and the two
 * ways out. Showing both at once is how a toolbar ends up with six controls
 * and no shape.
 */
export function Toolbar({
    total,
    checked,
    selecting,
    sort,
    onSort,
    onStartSelecting,
    onStopSelecting,
    onSelectAll,
    onUnpinChecked,
}: {
    total: number;
    checked: number[];
    selecting: boolean;
    sort: SortKey;
    onSort: (key: SortKey) => void;
    onStartSelecting: () => void;
    onStopSelecting: () => void;
    onSelectAll: () => void;
    onUnpinChecked: () => void;
}) {
    if (selecting) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-finn-black px-4 py-3 text-white shadow-sm">
                <div className="flex items-center gap-3">
                    <p className="text-xs font-black">
                        {checked.length === 0
                            ? "Pick the cars to unpin"
                            : `${checked.length} selected`}
                    </p>

                    <button
                        type="button"
                        onClick={onSelectAll}
                        className="text-[11px] font-bold text-white/70 underline-offset-2 transition hover:text-white hover:underline"
                    >
                        {checked.length === total
                            ? "Clear selection"
                            : "Select all"}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onUnpinChecked}
                        disabled={checked.length === 0}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-finn-error px-3.5 text-[11px] font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
                    >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        Unpin
                        {checked.length > 0 ? ` ${checked.length}` : ""}
                    </button>

                    <button
                        type="button"
                        onClick={onStopSelecting}
                        aria-label="Done selecting"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                        <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-3 py-2.5 shadow-sm">
            {/*
              * Segmented rather than a dropdown. Four options that change
              * what the reader is looking at should be four things they can
              * see, and a native select was the one piece of unstyled
              * furniture on the page.
              *
              * A Radix toggle group rather than four `aria-pressed` buttons:
              * one tab stop for the whole control and arrow keys between the
              * options, which is what a reader expects of something drawn as
              * a segmented row. `value` can never come back empty because
              * the group is not deselectable — an empty sort order is not a
              * state this list has.
              */}
            <ToggleGroup.Root
                type="single"
                value={sort}
                onValueChange={(next) => {
                    if (next) onSort(next as SortKey);
                }}
                aria-label="Sort by"
                className="flex flex-wrap items-center gap-1 rounded-full bg-finn-snow p-1"
            >
                {SORTS.map(([key, label]) => (
                    <ToggleGroup.Item
                        key={key}
                        value={key}
                        className={[
                            "rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                            "text-finn-iron hover:text-finn-black",
                            "data-[state=on]:bg-white data-[state=on]:text-finn-black data-[state=on]:shadow-sm",
                        ].join(" ")}
                    >
                        {label}
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup.Root>

            <button
                type="button"
                onClick={onStartSelecting}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
            >
                <CircleCheck aria-hidden="true" className="h-4 w-4" />
                Select
            </button>
        </div>
    );
}
