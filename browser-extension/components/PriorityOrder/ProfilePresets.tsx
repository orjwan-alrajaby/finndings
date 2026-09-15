import { CircleCheck, Sparkles } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { InfoButton } from "@/components/PriorityInfo";
import { surfaceTone } from "@/lib/priority-marks";
import type {
    CategoryId,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

import { ProfileOrderChips } from "./ProfileOrderChips";

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
 * is and wants to reach for one. `tiles` sits between the two: each profile
 * in its own colour with the marks of the order it sets, compact enough for a
 * drawer. `cards` is for the reader meeting them for
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
    layout?: "chips" | "tiles" | "cards";
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

    if (layout === "tiles") {
        return (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {applicable.map((profile) => {
                    const active = profile.id === activeProfile?.id;
                    const tone = surfaceTone(profile.icon);
                    const order = profile.priorities
                        .map((id) => definitionOf(id)?.label ?? id)
                        .join(", ");

                    return (
                        /* The "i" sits over the corner, as on the cards: a button cannot hold another. */
                        <div key={profile.id} className="group relative">
                            <span className="absolute right-2 top-2 z-10">
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
                                    "flex h-full w-full flex-col gap-2 rounded-2xl p-2.5 text-left transition-all",
                                    tone.ground,
                                    active
                                        ? `ring-2 ${tone.edgeStrong} shadow-sm`
                                        : `ring-1 ${tone.edge} ${tone.edgeHover} ${tone.groundHover}`,
                                ].join(" ")}
                            >
                                <span className="flex items-center gap-2 pr-5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                        <PriorityIcon
                                            name={profile.icon}
                                            className="h-4.5 w-4.5"
                                        />
                                    </span>

                                    <span className="min-w-0">
                                        <span className="block text-xs font-black leading-4 text-finn-black">
                                            {profile.label}
                                        </span>

                                        {active && (
                                            <span
                                                className={[
                                                    "flex items-center gap-1 text-[10px] font-bold leading-4",
                                                    tone.ink,
                                                ].join(" ")}
                                            >
                                                <CircleCheck
                                                    aria-hidden="true"
                                                    className="h-3 w-3 shrink-0"
                                                />
                                                In use
                                            </span>
                                        )}
                                    </span>
                                </span>

                                {/*
                                  * The order it would set, as the marks the
                                  * list below is drawn in — so a reader can
                                  * see "shield, snowflake, bag" and know what
                                  * they are choosing without opening the "i".
                                  */}
                                <span
                                    aria-hidden="true"
                                    className="flex items-center gap-1"
                                >
                                    {profile.priorities.map((id, index) => (
                                        <span
                                            key={id}
                                            title={`${index + 1}. ${definitionOf(id)?.label ?? id}`}
                                            className="flex h-5 w-5 items-center justify-center rounded-md bg-white/80"
                                        >
                                            <PriorityIcon
                                                name={definitionOf(id)?.icon ?? "car"}
                                                className="h-3 w-3"
                                            />
                                        </span>
                                    ))}
                                </span>

                                <span className="sr-only">
                                    Sets your order to {order}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    }

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
                                /* `group` so the "i" inside can follow the chip's own hover
                                   colours — see `InfoButton`. */
                                "group inline-flex items-center gap-1 rounded-full pr-1.5",
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

                        <ProfileCardButton
                            profile={profile}
                            active={active}
                            priorityDefinitions={priorityDefinitions}
                            onApply={() => onApply([...profile.priorities])}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/**
 * One profile, for a reader meeting the profiles for the first time.
 *
 * It was a grey card with a framed mark and grey chips — six of them, alike
 * but for their words, on the screen that is meant to help someone recognise
 * the way they drive. Each one now wears its own colour: a wash down from the
 * top, its mark large in a white tile and again as a faint watermark, and the
 * order it sets in the priorities' own hues. Choosing reads as picking one of
 * six characters rather than one of six paragraphs.
 */
function ProfileCardButton({
    profile,
    active,
    priorityDefinitions,
    onApply,
}: {
    profile: Profile;
    active: boolean;
    priorityDefinitions: PriorityDefinition[];
    onApply: () => void;
}) {
    const tone = surfaceTone(profile.icon);

    return (
        <button
            type="button"
            onClick={onApply}
            aria-pressed={active}
            className={[
                "relative flex h-full w-full flex-col overflow-hidden rounded-[22px] bg-white p-4 text-left",
                "bg-linear-to-b to-white to-60% transition-all duration-200",
                tone.wash,
                active
                    ? `shadow-md ring-2 ${tone.edgeStrong}`
                    : `shadow-sm ring-1 ${tone.edge} ${tone.edgeHover} hover:-translate-y-0.5 hover:shadow-md`,
            ].join(" ")}
        >
            {/* The mark again, large and faint — decoration, so hidden from everything but the eye. */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-5 -right-5 opacity-10"
            >
                <PriorityIcon name={profile.icon} className="h-24 w-24" />
            </span>

            <span className="relative flex items-center gap-3 pr-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <PriorityIcon name={profile.icon} className="h-6 w-6" />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-base font-black leading-5 text-finn-black">
                        {profile.label}
                    </span>

                    <span
                        className={[
                            "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                            active ? `${tone.solid} text-white` : `bg-white/80 ${tone.ink}`,
                        ].join(" ")}
                    >
                        {active ? (
                            <CircleCheck aria-hidden="true" className="h-3 w-3" />
                        ) : (
                            <Sparkles aria-hidden="true" className="h-3 w-3" />
                        )}
                        {active ? "In use" : "Start from this"}
                    </span>
                </span>
            </span>

            <span className="relative mt-3 block text-xs leading-5 text-finn-black/75">
                {profile.forWhom}
            </span>

            {/* The order it would put in the list, so the label is never taken on trust. */}
            <span className="relative mt-auto block pt-3">
                <ProfileOrderChips
                    priorities={profile.priorities}
                    priorityDefinitions={priorityDefinitions}
                />
            </span>
        </button>
    );
}
