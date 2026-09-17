import { useId, useState } from "react";
import { CircleCheck, CircleQuestionMark, CircleX, Info } from "lucide-react";

import { InfoTip } from "@/components/InfoTip";
import {
    ITEM_STATE,
    SECTION_LOOK,
    type FeatureTable as Table,
    type FeatureTableGroup,
    type ItemState,
    type SectionPalette,
    type TableItem,
} from "@/lib/feature-copy";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";

/**
 * One priority's equipment: a summary bar, then a card per section — what you
 * raised (gold), other counted items the car lists (green) and doesn't (red),
 * and the standard equipment (blue).
 *
 * The words and colours come from `featureTableOf`; the in-page panel's twin
 * is `featureTable` in `lens-panel/sections.ts`.
 */
export function FeatureTable({ table }: { table: Table | null }) {
    if (!table) return null;

    return (
        <div data-feature-table="" className="flex flex-col gap-2">
            <TallyHeader table={table} />

            {table.groups.map((group) => (
                <Section key={group.id} group={group} />
            ))}
        </div>
    );
}

const STATES: ItemState[] = ["listed", "unlisted", "unknown"];

function TallyHeader({ table }: { table: Table }) {
    const total = table.tally.listed + table.tally.unlisted + table.tally.unknown;

    return (
        <div data-tally="" className="px-0.5">
            <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full bg-finn-cotton">
                {STATES.filter((state) => table.tally[state]).map((state) => (
                    <span
                        key={state}
                        className={`block h-full ${ITEM_STATE[state].bar}`}
                        style={{ width: `${(100 * table.tally[state]) / total}%` }}
                    />
                ))}
            </div>

            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold">
                {table.summaryParts.map((part) => (
                    <span key={part.state} className={`inline-flex items-center gap-1 ${ITEM_STATE[part.state].ink}`}>
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ITEM_STATE[part.state].bar}`} />
                        {part.text}
                    </span>
                ))}
            </p>
        </div>
    );
}

function Section({ group }: { group: FeatureTableGroup }) {
    const [infoOpen, setInfoOpen] = useState(false);
    const infoId = useId();
    const look = SECTION_LOOK[group.palette];

    return (
        <section
            data-group={group.id}
            data-palette={group.palette}
            className={`rounded-xl px-3.5 py-3 ${look.card}`}
        >
            <div className="flex items-center justify-between gap-3">
                <h4 className={`flex items-center gap-1 text-[12px] font-black ${look.title}`}>
                    <span>{group.title}</span>

                    {group.info && (
                        <button
                            type="button"
                            aria-label="Where does standard equipment come from?"
                            aria-expanded={infoOpen}
                            aria-controls={infoId}
                            onClick={() => setInfoOpen((open) => !open)}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
                        >
                            <Info aria-hidden="true" className="h-4 w-4" />
                        </button>
                    )}
                </h4>

                <span className={`shrink-0 text-[11px] font-bold ${look.tally}`}>
                    {group.tallyLabel}
                </span>
            </div>

            {group.info && infoOpen && (
                <div
                    id={infoId}
                    className="mt-2 rounded-lg bg-white px-3 py-2 text-[11px] leading-4 text-finn-iron"
                >
                    <p>{group.info.body}</p>

                    {group.info.references.length > 0 && (
                        <ol className="mt-1.5 space-y-0.5">
                            {group.info.references.map((reference, index) => (
                                <li key={reference.url} className="flex gap-1">
                                    <span>{index + 1}.</span>
                                    <a
                                        href={reference.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-bold text-finn-accent-blue underline-offset-2 hover:underline"
                                    >
                                        {reference.label}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}

            <ul className="mt-2 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                    <li key={item.fact.key}>
                        <StateChip
                            item={item}
                            palette={group.palette}
                            withLevel={group.id === "raised"}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}

const STATE_ICON = {
    listed: CircleCheck,
    unlisted: CircleX,
    unknown: CircleQuestionMark,
} as const;

/** One item: a white chip in its section's ring, its state as an icon, its raise, and what it is. */
export function StateChip({
    item,
    palette,
    withLevel,
}: {
    item: TableItem;
    palette: SectionPalette;
    withLevel: boolean;
}) {
    const state = ITEM_STATE[item.state];
    const Icon = STATE_ICON[item.state];
    const level = withLevel && item.fact.importance ? FEATURE_IMPORTANCE[item.fact.importance] : null;

    return (
        <span
            data-state={item.state}
            className={`inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-2 pr-2.5 text-[11px] font-bold shadow-sm ring-1 ${SECTION_LOOK[palette].chip} ${state.labelInk}`}
        >
            <Icon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${state.iconInk}`} />
            <span>{item.fact.label}</span>

            {level && (
                <span
                    title={`You said this should count ${level.inSentence}`}
                    className="rounded-full bg-amber-100 px-1.5 text-[9px] font-black uppercase tracking-wide text-amber-900"
                >
                    {level.label}
                </span>
            )}

            {item.fact.explanation && (
                <InfoTip subject={item.fact.label}>{item.fact.explanation}</InfoTip>
            )}

            <span className="sr-only">{state.label}</span>
        </span>
    );
}
