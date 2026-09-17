import { Undo2, UserRound } from "lucide-react";

import type { Profile, SettingsBasis } from "@/lib/reasoning-engine/types";

/**
 * Where the reader's settings came from, said in one line.
 *
 * A profile is a starting point: applying one copies its order and emphasis,
 * and from then on the settings are the reader's. So the line names the
 * profile they started from, says "customised" once they have changed
 * anything, and — right after an apply — offers the one-tap undo that puts
 * back exactly what was replaced.
 */
export function ProfileBasisNote({
    basedOn,
    customised,
    profiles,
    onUndo,
}: {
    basedOn: SettingsBasis;
    customised: boolean;
    profiles: Profile[];
    /** Present only straight after a profile replaced the reader's settings. */
    onUndo?: (() => void) | null;
}) {
    const profile = basedOn
        ? profiles.find((item) => item.id === basedOn)
        : undefined;

    if (!profile && !onUndo) return null;

    return (
        <p
            className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-finn-iron"
            aria-live="polite"
        >
            {profile && (
                <span className="inline-flex items-center gap-1 font-bold text-finn-black">
                    <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
                    {customised
                        ? `Customised from ${profile.label}`
                        : `${profile.label}, as the profile sets it`}
                </span>
            )}

            {onUndo && (
                <button
                    type="button"
                    onClick={onUndo}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-black text-finn-accent-blue shadow-sm ring-1 ring-finn-accent-blue/25 transition-colors hover:bg-finn-pale-blue"
                >
                    <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Undo — put back your order and raises
                </button>
            )}
        </p>
    );
}
