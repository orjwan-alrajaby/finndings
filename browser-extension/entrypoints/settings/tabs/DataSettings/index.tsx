import { useEffect, useState } from "react";
import { RotateCw, Trash2, TriangleAlert } from "lucide-react";

import {
    ALL_STORED_DATA_GROUPS,
    clearStoredData,
    STORED_DATA_GROUPS,
    summariseStoredData,
    type StoredDataCount,
    type StoredDataGroupId,
} from "@/lib/stored-data";

import { withFinnLinks } from "@/components/FinnLink";
import { Section } from "../../components/primitives";
import { ConfirmDialog } from "../../components/ConfirmDialog";

/**
 * What Lens has stored, and how to delete it.
 *
 * Two things are going on here and only one of them is the delete button.
 * The other is the inventory: this extension reads a shopping site and keeps
 * what you looked at, and until now there was no page anywhere that said so.
 * A reader who wants to know what a browser extension holds on them is
 * asking a fair question, and "open the developer tools" is not an answer.
 *
 * Deleting works by category, the way clearing browsing data does, because
 * the categories are genuinely different decisions: dropping the browsing
 * cache costs nothing at all, dropping your pinned cars loses work you did,
 * and dropping your settings makes the product stop scoring anything until
 * you answer again. One "delete everything" button would flatten that into a
 * choice nobody can make well.
 *
 * Separate from "Restore defaults", which is next to it in the header and is
 * a different act: that one puts the settings back to the values Lens ships
 * with, so the product keeps working. This one removes what is stored, and
 * afterwards Lens knows nothing about the reader.
 */
export function DataSettings({
    onCleared,
}: {
    /**
     * Told which groups went, so the settings page can put its own in-memory
     * state back. Without it the page would still be holding the settings
     * just deleted, and its save bar would offer to write them back.
     */
    onCleared: (groups: StoredDataGroupId[]) => void;
}) {
    const [counts, setCounts] = useState<StoredDataCount[] | null>(null);
    const [selected, setSelected] = useState<StoredDataGroupId[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const [justCleared, setJustCleared] =
        useState<StoredDataGroupId[] | null>(null);

    const refresh = async () => {
        setCounts(await summariseStoredData());
    };

    useEffect(() => {
        void refresh();
    }, []);

    const countFor = (id: StoredDataGroupId) =>
        counts?.find((count) => count.id === id);

    /* Nothing stored is nothing to delete — the box stays off and unusable. */
    const anythingStored = counts?.some((count) => count.present) ?? false;

    const toggle = (id: StoredDataGroupId) => {
        setJustCleared(null);

        setSelected((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    };

    const selectAll = () => {
        setJustCleared(null);

        setSelected(
            ALL_STORED_DATA_GROUPS.filter(
                (id) => countFor(id)?.present ?? false,
            ),
        );
    };

    const confirm = async () => {
        setBusy(true);
        setFailed(false);

        try {
            await clearStoredData(selected);

            /*
             * Other extension pages hold their own copy of the pinned set.
             * A compare tab left open would otherwise go on ranking cars
             * that no longer exist, so it is told rather than left to find
             * out. Failure is ignored: nobody may be listening, and the
             * deletion itself already succeeded.
             */
            if (selected.includes("pinnedCars")) {
                void browser.runtime
                    .sendMessage({ type: "PINNED_CARS_UPDATED" })
                    .catch(() => undefined);
            }

            /*
             * Told before the refresh, so the page's own state is already
             * back to its defaults by the time the new counts land.
             */
            onCleared(selected);

            setJustCleared(selected);
            setSelected([]);
            await refresh();
        } catch (error) {
            console.error("Finn Lens: could not delete your data", error);
            setFailed(true);
        } finally {
            setBusy(false);
            setConfirming(false);
        }
    };

    const chosen = STORED_DATA_GROUPS.filter((group) =>
        selected.includes(group.id),
    );

    return (
        <>
            <Section
                title="What Finn Lens has stored"
                description="Everything here lives in this browser's own extension storage. None of it is sent anywhere, there is no account behind it, and nothing survives uninstalling the extension. You can delete any of it, at any time, without deleting the rest."
            >
                {counts === null ? (
                    <p className="text-xs text-finn-iron">Reading storage…</p>
                ) : (
                    <>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="text-xs font-black text-finn-black">
                                Choose what to delete
                            </p>

                            <button
                                type="button"
                                onClick={selectAll}
                                disabled={!anythingStored}
                                className="text-[11px] font-bold text-finn-accent-blue underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:text-finn-iron/40 disabled:no-underline"
                            >
                                Select everything
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {STORED_DATA_GROUPS.map((group) => {
                                const count = countFor(group.id);
                                const checked = selected.includes(group.id);

                                return (
                                    <label
                                        key={group.id}
                                        className={[
                                            "flex cursor-pointer items-start gap-3 rounded-[22px] p-4 transition",
                                            checked
                                                ? "bg-finn-error/5 shadow-[0_0_0_2px] shadow-finn-error/40"
                                                : count?.present
                                                    ? "bg-finn-snow hover:bg-finn-cotton/60"
                                                    : "bg-finn-snow/60",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!count?.present}
                                            onChange={() =>
                                                toggle(group.id)
                                            }
                                            className="mt-0.5 h-4 w-4 shrink-0 accent-finn-error disabled:cursor-not-allowed"
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-black text-finn-black">
                                                    {group.label}
                                                </span>

                                                <span
                                                    className={[
                                                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                                        count?.present
                                                            ? "bg-white text-finn-iron"
                                                            : "bg-white/60 text-finn-iron/60",
                                                    ].join(" ")}
                                                >
                                                    {count?.summary ?? "—"}
                                                </span>
                                            </span>

                                            <span className="mt-1 block text-[11px] leading-4 text-finn-iron">
                                                {withFinnLinks(
                                                    group.description,
                                                )}
                                            </span>

                                            {checked && (
                                                <span className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-4 text-finn-error">
                                                    <TriangleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
                                                    {withFinnLinks(
                                                        group.consequence,
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        {failed && (
                            <p className="mt-4 rounded-2xl bg-finn-error/10 px-4 py-3 text-xs font-bold text-finn-error">
                                Nothing was deleted — the browser wouldn't let
                                Lens write to its storage. Try again in a
                                moment.
                            </p>
                        )}

                        {justCleared && justCleared.length > 0 && (
                            <p className="mt-4 rounded-2xl bg-finn-pale-blue px-4 py-3 text-xs leading-5 text-finn-highlight-navy">
                                <strong className="font-black">Deleted.</strong>{" "}
                                {clearedSentence(justCleared)} It is gone from
                                this browser and cannot be recovered.
                            </p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-finn-cotton pt-4">
                            <button
                                type="button"
                                disabled={selected.length === 0 || busy}
                                onClick={() => setConfirming(true)}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-finn-error px-5 text-xs font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-finn-cotton disabled:text-finn-iron"
                            >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                                {busy
                                    ? "Deleting…"
                                    : selected.length === 0
                                        ? "Nothing selected"
                                        : `Delete ${selected.length === STORED_DATA_GROUPS.length ? "everything" : selected.length === 1 ? "1 thing" : `${selected.length} things`}`}
                            </button>

                            <button
                                type="button"
                                onClick={() => void refresh()}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-finn-iron transition hover:text-finn-black"
                            >
                                <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />
                                Recheck
                            </button>
                        </div>
                    </>
                )}
            </Section>

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={
                    selected.length === STORED_DATA_GROUPS.length
                        ? "Delete everything Finn Lens has stored?"
                        : "Delete the selected data?"
                }
                confirmLabel="Delete permanently"
                tone="danger"
                onConfirm={() => void confirm()}
                description={
                    <>
                        <p>This removes:</p>

                        <ul className="mt-2 space-y-1.5">
                            {chosen.map((group) => (
                                <li key={group.id}>
                                    <strong className="font-black text-finn-black">
                                        {group.label}
                                    </strong>{" "}
                                    — {group.consequence}
                                </li>
                            ))}
                        </ul>

                        <p className="mt-3">
                            It cannot be undone, and Lens keeps no copy
                            anywhere else.
                        </p>
                    </>
                }
            />
        </>
    );
}

/** "Your settings and pinned cars are gone." — named, so it's checkable. */
function clearedSentence(groups: StoredDataGroupId[]): string {
    const labels = STORED_DATA_GROUPS.filter((group) =>
        groups.includes(group.id),
    ).map((group) => group.label.toLowerCase());

    if (labels.length === 0) return "";

    if (labels.length === 1) return `${sentenceCase(labels[0]!)} is gone.`;

    const last = labels[labels.length - 1];
    const rest = labels.slice(0, -1).join(", ");

    return `${sentenceCase(rest)} and ${last} are gone.`;
}

function sentenceCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
