import { CalendarClock, UserRound } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import type { Profile, SettingsBasis } from "@/lib/reasoning-engine/types";

/**
 * Whose raises these are, said before the reader changes one.
 *
 * A profile sets an order and what counts for more inside each priority, and
 * the editor for the second sits right under the profiles. Without saying
 * so, a reader raising "blind spot assist" can't tell whether they are
 * editing Nervous Driver for everyone who picks it, or their own settings.
 * It is always their own: applying a profile copies its raises, and profiles
 * themselves never change. This says that, and names the profile the copy
 * came from.
 *
 * `settings` is the saved answer used everywhere; `comparison` is the compare
 * drawer, where raises apply to the cars on screen and are not saved.
 */
export function EmphasisScope({
    scope,
    basedOn,
    customised,
    profiles,
}: {
    scope: "settings" | "comparison";
    basedOn: SettingsBasis;
    customised: boolean;
    profiles: Profile[];
}) {
    const profile = basedOn
        ? profiles.find((item) => item.id === basedOn)
        : undefined;

    const title =
        scope === "settings"
            ? "You're editing your own settings, not a profile"
            : "For this comparison only — not a profile, and not saved";

    const origin = profile ? (
        customised ? (
            <>
                Customised from <ProfileName profile={profile} />.{" "}
                {profile.label} itself hasn't changed — applying it again
                would put its raises back.
            </>
        ) : (
            <>
                These start as <ProfileName profile={profile} />
                's raises. Change one and it's yours — {profile.label} itself
                stays as it is.
            </>
        )
    ) : (
        <>
            They aren't tied to a profile. Applying one would replace them.
        </>
    );

    const Icon = scope === "settings" ? UserRound : CalendarClock;

    return (
        <div className="mb-4 flex gap-3 rounded-2xl bg-finn-pale-blue px-4 py-3">
            <Icon
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-finn-accent-blue"
            />

            <div className="min-w-0 text-xs leading-5 text-finn-highlight-navy">
                <p className="font-black">{title}</p>
                <p className="mt-0.5">
                    {scope === "comparison" &&
                        "Raises here change how the cars you're comparing now are judged. Make them permanent in Settings. "}
                    {origin}
                </p>
            </div>
        </div>
    );
}

function ProfileName({ profile }: { profile: Profile }) {
    return (
        <strong className="inline-flex items-center gap-1 font-black">
            <PriorityIcon name={profile.icon} className="h-3.5 w-3.5" />
            {profile.label}
        </strong>
    );
}
