import { Lightbulb } from "lucide-react";

import type { PriorityDefinition, Profile } from "@/lib/reasoning-engine/types";
import {
    DefaultBadge,
    SetDefaultButton,
    Toggle,
} from "@/entrypoints/settings/components/primitives";
import { PriorityIcon } from "@/components/PriorityIcon";
import { InfoButton } from "@/components/PriorityInfo";
import { ProfileOrderChips } from "@/components/PriorityOrder";
import { surfaceTone } from "@/lib/priority-marks";

interface ProfileCardProps {
    profile: Profile;
    priorityDefinitions: PriorityDefinition[];
    isDefault: boolean;
    enabledCount: number;
    onToggleEnabled: (id: string, enabled: boolean) => void;
    onSetDefault: (id: string) => void;
}

export function ProfileCard({
    profile,
    priorityDefinitions,
    isDefault,
    enabledCount,
    onToggleEnabled,
    onSetDefault,
}: ProfileCardProps) {
    /* Lens always needs one strategy to start from. */
    const isLastEnabled = profile.enabled && enabledCount <= 1;

    /*
     * Each profile in its own colour — the same one its tile wears in the
     * compare drawer and its card in the setup flow — so the six on this page
     * are told apart by more than their names, and a reader who met Family
     * First as an orange card meets it here as the same card.
     */
    const tone = surfaceTone(profile.icon);

    /* A switched-off profile drains to grey — everything but its controls. */
    const dimmed = profile.enabled
        ? "transition-[filter,opacity]"
        : "opacity-60 grayscale transition-[filter,opacity]";

    return (
        /*
         * The default wears its state rather than explaining it. It used to
         * carry a paragraph saying it is the one Lens starts you on; a card
         * ringed in its own colour at the top of the list says the same thing
         * without spending three lines on it, and says it while the reader is
         * scanning rather than after they have stopped to read.
         *
         * A profile that is switched off drains to grey. On and off were told
         * apart by the switch alone, at the far end of the card from
         * everything it switches — a card still in full colour reads as a
         * card still in use.
         */
        <div
            className={[
                "relative overflow-hidden rounded-[22px] bg-white transition-all",
                profile.enabled
                    ? `bg-linear-to-r to-white to-55% ${tone.wash}`
                    : "",
                isDefault
                    ? `shadow-md ring-2 ${tone.edgeStrong}`
                    : `shadow-sm ring-1 ${profile.enabled ? tone.edge : "ring-finn-cotton"}`,
            ].join(" ")}
        >
            {/* The mark again, large and faint — decoration only. */}
            <span
                aria-hidden="true"
                className={[
                    "pointer-events-none absolute -bottom-5 -right-3 opacity-10 sm:-bottom-6 sm:right-10",
                    profile.enabled ? "" : "grayscale",
                ].join(" ")}
            >
                <PriorityIcon name={profile.icon} className="h-24 w-24 sm:h-32 sm:w-32" />
            </span>

            {/*
              * A grid, so the card can change shape rather than just shrink.
              *
              * Side by side, the mark and the switch each hold a column down
              * the full height of the card, and on a phone that leaves the
              * words a column a few words wide — the summary wrapped onto six
              * lines. Below `sm` the mark, the name and the switch share a
              * header row and everything else runs the full width under them;
              * from `sm` up the mark and the switch span both rows again and
              * the card reads as it did.
              */}
            <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 p-4 sm:gap-x-4 sm:gap-y-1 sm:p-5">
                <span
                    className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5",
                        "sm:row-span-2 sm:h-14 sm:w-14 sm:rounded-2xl",
                        dimmed,
                    ].join(" ")}
                >
                    <PriorityIcon name={profile.icon} className="h-5.5 w-5.5 sm:h-7 sm:w-7" />
                </span>

                {/*
                  * The badge and the button occupy the same spot, because
                  * they answer the same question: this one is the default, or
                  * this is where you make it one.
                  *
                  * Not dimmed as a whole: the "i" lives here, and what a
                  * profile is stays worth asking while it is switched off —
                  * that is exactly when a reader is deciding whether to turn
                  * it back on.
                  */}
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 self-center sm:min-h-0 sm:self-start">
                    <span
                        className={[
                            "text-base font-black leading-6 text-finn-black",
                            dimmed,
                        ].join(" ")}
                    >
                        {profile.label}
                    </span>

                    <InfoButton
                        subject={{ kind: "profile", id: profile.id }}
                        label={profile.label}
                        profiles={[profile]}
                        priorityDefinitions={priorityDefinitions}
                    />

                    {isDefault && <DefaultBadge />}

                    {!isDefault && profile.enabled && (
                        <SetDefaultButton
                            onClick={() => onSetDefault(profile.id)}
                            label={profile.label}
                        />
                    )}

                    {!profile.enabled && (
                        <span className="rounded-full bg-finn-cotton px-2.5 py-1 text-[10px] font-bold text-finn-iron">
                            Switched off
                        </span>
                    )}
                </div>

                {/*
                  * The reason the last one can't be switched off moved into
                  * the switch itself. It used to be a panel under the card,
                  * which is a lot of furniture for a sentence a reader needs
                  * exactly once — but a disabled control with no explanation
                  * anywhere is a dead end, so the title carries it.
                  */}
                <span className="flex min-h-11 items-center sm:row-span-2 sm:min-h-0 sm:pt-0.5">
                    <Toggle
                        checked={profile.enabled}
                        disabled={isLastEnabled}
                        onChange={(next) => onToggleEnabled(profile.id, next)}
                        label={
                            isLastEnabled
                                ? `Lens needs one profile switched on, so ${profile.label} can't be switched off`
                                : `${profile.enabled ? "Disable" : "Enable"} profile ${profile.label}`
                        }
                    />
                </span>

                <div
                    className={[
                        "col-span-3 min-w-0 sm:col-span-1 sm:col-start-2",
                        dimmed,
                    ].join(" ")}
                >
                    <p className="text-xs leading-5 text-finn-black/75">
                        {profile.forWhom}
                    </p>

                    {/*
                      * Held to a reading measure. On a wide settings page this
                      * one sentence ran the width of the card, a single long
                      * line with its lightbulb stranded at one end.
                      */}
                    <p className="mt-2.5 flex max-w-[620px] gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-finn-black ring-1 ring-black/5">
                        <Lightbulb
                            aria-hidden="true"
                            className={["mt-0.5 h-3.5 w-3.5 shrink-0", tone.ink].join(" ")}
                        />
                        {profile.assumes}
                    </p>

                    {/* The profile's fixed order, shown so the label is never taken on trust. */}
                    <div className="mt-3">
                        <ProfileOrderChips
                            priorities={profile.priorities}
                            priorityDefinitions={priorityDefinitions}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
