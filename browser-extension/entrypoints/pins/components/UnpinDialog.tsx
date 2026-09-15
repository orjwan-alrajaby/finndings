import { FinnLink } from "@/components/FinnLink";
import { ConfirmDialog } from "@/entrypoints/settings/components/ConfirmDialog";

/**
 * The one destructive act on this page, and what it does and doesn't touch.
 *
 * The second paragraph is the point of asking at all: unpinning changes what
 * Lens compares and nothing on finn.com, and a reader who doesn't know that
 * will read this dialog as "delete the car".
 *
 * `ids` being null is what closes it, so the caller has one piece of state
 * for "which cars are we asking about" rather than that plus an open flag.
 */
export function UnpinDialog({
    ids,
    onCancel,
    onConfirm,
}: {
    ids: number[] | null;
    onCancel: () => void;
    onConfirm: (ids: number[]) => void;
}) {
    const many = (ids?.length ?? 0) > 1;

    return (
        <ConfirmDialog
            open={ids !== null}
            onOpenChange={(next) => {
                if (!next) onCancel();
            }}
            eyebrow="Pinned cars"
            title={many ? `Unpin ${ids?.length} cars?` : "Unpin this car?"}
            confirmLabel={many ? `Unpin ${ids?.length}` : "Unpin"}
            tone="danger"
            onConfirm={() => onConfirm(ids ?? [])}
            description={
                <>
                    <p>
                        {many
                            ? "These cars leave your comparison and Lens stops ranking them."
                            : "This car leaves your comparison and Lens stops ranking it."}
                    </p>

                    <p className="mt-3">
                        Nothing happens on <FinnLink /> — you can pin{" "}
                        {many ? "them" : "it"} again from the listing at any
                        time.
                    </p>
                </>
            }
        />
    );
}
