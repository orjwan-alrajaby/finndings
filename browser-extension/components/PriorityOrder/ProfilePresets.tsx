import { CircleCheck } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { InfoButton } from "@/components/PriorityInfo";
import type {
    CategoryId,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/**
 * The profiles a reader can actually apply right now.
 *
 * A profile whose order names a priority the reader has switched off would
 * put that priority back the moment it was applied, so it is not offered.
 * Exported because the callers need to know whether there is anything to
 * offer before they write a heading above it.
 */
export function applicableProfiles(
    profiles: Profile[],
    priorityDefinitions: PriorityDefinition[],
): Profile[] {
    return profiles.filter(
        (profile) =>
            profile.enabled &&
            profile.priorities.every(
                (id) =>
                    priorityDefinitions.find(
                        (definition) => definition.id === id,
                    )?.enabled !== false,
            ),
    );
}

/**
 * The profile whose order is exactly the one in front of the reader, if any.
 *
 * Exported because more than one surface needs to say "you are on this
 * profile" and they must agree about when that is true — a chip in a panel
 * header claiming Family First while the preset card below says nothing is
 * worse than neither saying it.
 *
 * Exact and ordered: a profile's claim is its five priorities *in its order*,
 * so moving two of them means the reader is no longer on it. That is the
 * honest reading, and it is what makes the chip disappear the moment they
 * make the order their own.
 */
export function matchingProfile(
    profiles: Profile[],
    priorityDefinitions: PriorityDefinition[],
    priorities: CategoryId[],
): Profile | null {
    return (
        applicableProfiles(profiles, priorityDefinitions).find(
            (profile) =>
                profile.priorities.length === priorities.length &&
                profile.priorities.every(
                    (id, index) => priorities[index] === id,
                ),
        ) ?? null
    );
}

/**
 * The profiles offered as a starting point.
 *
 * `chips` is the compact form for a reader who already knows what a profile
 * is and wants to reach for one. `cards` is for the reader meeting them for
 * the first time: it spends the space to say who each profile is written
 * for and which five priorities it would put in the list, so choosing one
 * is a decision rather than a guess.
 */
export function ProfilePresets({
    profiles,
    priorityDefinitions,
    priorities,
    onApply,
    layout = "chips",
}: {
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
    priorities: CategoryId[];
    onApply: (priorities: CategoryId[]) => void;
    layout?: "chips" | "cards";
}) {
    const definitionOf = (id: CategoryId) =>
        priorityDefinitions.find((definition) => definition.id === id);

    const applicable = applicableProfiles(profiles, priorityDefinitions);

    if (applicable.length === 0) return null;

    const activeProfile = matchingProfile(
        profiles,
        priorityDefinitions,
        priorities,
    );

    if (layout === "chips") {
        return (
            <div className="flex flex-wrap gap-2">
                {applicable.map((profile) => {
                    const active = profile.id === activeProfile?.id;

                    /*
                     * The pill is two controls, so the ground moves to a
                     * wrapper: applying a profile and asking what it is are
                     * different decisions, and a button cannot contain
                     * another one.
                     */
                    return (
                        <span
                            key={profile.id}
                            className={[
                                "inline-flex items-center gap-1 rounded-full pr-1.5",
                                "text-[11px] font-bold transition-colors",
                                /*
                                 * An unapplied profile is an offer, and it
                                 * has to look like one before the pointer
                                 * reaches it.
                                 *
                                 * It was `finn-snow` with `finn-iron` text:
                                 * a near-white ground on a white panel with
                                 * grey type, which is this design's own
                                 * shorthand for something switched off. The
                                 * one signal that it could be pressed at all
                                 * arrived on hover, which is no signal on a
                                 * touchscreen and a late one everywhere else.
                                 *
                                 * White with an edge and the label in full
                                 * ink instead — a button at rest — and the
                                 * accent kept for hover and for the applied
                                 * state, so the chip still has somewhere to
                                 * go when it is pressed.
                                 */
                                active
                                    ? "bg-finn-accent-blue text-white ring-1 ring-finn-accent-blue"
                                    : [
                                          "bg-white text-finn-black",
                                          "ring-1 ring-finn-iron/35",
                                          "hover:bg-finn-pale-blue hover:text-finn-accent-blue",
                                          "hover:ring-finn-accent-blue",
                                      ].join(" "),
                            ].join(" ")}
                        >
                            <button
                                type="button"
                                onClick={() => onApply([...profile.priorities])}
                                aria-pressed={active}
                                className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3"
                            >
                                {/*
                                  * Untinted while selected: the chip goes
                                  * solid blue behind it, and a blue mark on
                                  * blue is not a mark.
                                  */}
                                <PriorityIcon
                                    name={profile.icon}
                                    className="h-3.5 w-3.5"
                                    tinted={!active}
                                />
                                {profile.label}
                                {active && (
                                    <span className="text-[10px] font-black opacity-80">
                                        · in use
                                    </span>
                                )}
                            </button>

                            <InfoButton
                                subject={{ kind: "profile", id: profile.id }}
                                label={profile.label}
                                profiles={profiles}
                                priorityDefinitions={priorityDefinitions}
                                tone={active ? "onDark" : "quiet"}
                            />
                        </span>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {applicable.map((profile) => {
                const active = profile.id === activeProfile?.id;

                return (
                    /*
                     * The card is one big target, so the "i" cannot live
                     * inside it. It sits over the corner instead, on the
                     * wrapper, where it is reachable without standing between
                     * the reader and the thing they came to click.
                     */
                    <div key={profile.id} className="relative">
                        <span className="absolute right-3 top-3 z-10">
                            <InfoButton
                                subject={{ kind: "profile", id: profile.id }}
                                label={profile.label}
                                profiles={profiles}
                                priorityDefinitions={priorityDefinitions}
                            />
                        </span>

                        <button
                            type="button"
                            onClick={() => onApply([...profile.priorities])}
                            aria-pressed={active}
                            className={[
                                "flex w-full h-full flex-col rounded-[22px] p-4 text-left transition-all",
                                active
                                    ? "bg-finn-pale-blue shadow-[0_0_0_2px] shadow-finn-accent-blue"
                                    : "bg-finn-snow drop-shadow-sm hover:bg-finn-pale-blue/70",
                            ].join(" ")}
                        >
                            <span className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white text-finn-accent-blue">
                                    <PriorityIcon
                                        name={profile.icon}
                                        className="h-5 w-5"
                                    />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className={[
                                                "text-sm font-black",
                                                active
                                                    ? "text-finn-accent-blue"
                                                    : "text-finn-black",
                                            ].join(" ")}
                                        >
                                            {profile.label}
                                        </span>

                                        {active && (
                                            <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-finn-accent-blue" />
                                        )}
                                    </span>

                                    <span className="mt-0.5 block text-[11px] font-bold text-finn-iron">
                                        {active ? "In use" : "Start from this"}
                                    </span>
                                </span>
                            </span>

                            <span className="mt-3 block text-xs leading-5 text-finn-iron">
                                {profile.forWhom}
                            </span>

                            {/* The order it would put in the list, so the label is never taken on trust. */}
                            <span className="mt-3 flex flex-wrap gap-1">
                                {profile.priorities.map((id, index) => (
                                    <span
                                        key={id}
                                        className="rounded-full border border-finn-iron/15 bg-white px-2 py-0.5 text-[10px] font-bold text-finn-black"
                                    >
                                        {index + 1} ·{" "}
                                        {definitionOf(id)?.label ?? id}
                                    </span>
                                ))}
                            </span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
