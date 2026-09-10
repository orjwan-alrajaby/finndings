import { createContext, useContext, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Info, X } from "lucide-react";

import { DRAWER_SHELL } from "@/components/drawer";
import { InfoTip } from "@/components/InfoTip";
import { PriorityIcon } from "@/components/PriorityIcon";
import { getCategory } from "@/lib/reasoning-engine";
import { FEATURES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/**
 * "What is this, and what does it actually look at?"
 *
 * Every profile and priority in this app is a word — "Practicality", "Nervous
 * Driver" — standing in for a rule that decides which car a reader is told to
 * take. The words are reasonable and none of them are self-explanatory: two
 * people asked what "Comfort" covers will not give the same list, and neither
 * of them can check.
 *
 * So each one carries an "i", and the answer opens beside it rather than
 * under it. A panel keeps the list the reader is comparing against on screen
 * while they read what one row of it means, which an expanding row cannot do
 * — it pushes the thing being explained out from under the pointer.
 *
 * Everything shown here is already in `CATEGORIES` and `PROFILES`. The
 * question, the description, who it is recommended for, the features it
 * counts: all written long ago and, until now, never put in front of anyone.
 */

/* -------------------------------------------------------------------------- */
/* Which one is open                                                          */
/* -------------------------------------------------------------------------- */

export type InfoSubject =
    | { kind: "priority"; id: CategoryId }
    | { kind: "profile"; id: string };

/*
 * One panel at a time, tracked outside React.
 *
 * The triggers are spread across three components that are siblings rather
 * than parent and child — the profile chips, the ordered list, the row of
 * priorities still to add — and are mounted by three different screens. A
 * piece of state above all of them would have to be threaded through every
 * one of those screens to answer a question none of them care about. This is
 * the smaller thing: the store says which subject is open, every trigger
 * reads it, and the one that recognises itself renders the panel. Opening a
 * second closes the first because there is only one value.
 */
let openSubject: InfoSubject | null = null;
const listeners = new Set<() => void>();

function announce() {
    for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function openInfo(subject: InfoSubject) {
    openSubject = subject;
    announce();
}

function closeInfo() {
    openSubject = null;
    announce();
}

function useOpenSubject() {
    /*
     * The same value for both snapshots. There is no server and no hydration
     * here — these screens are mounted client-side into an extension page —
     * so a server snapshot that disagreed with the store would only ever be
     * wrong.
     */
    return useSyncExternalStore(
        subscribe,
        () => openSubject,
        () => openSubject,
    );
}

const isSame = (a: InfoSubject | null, b: InfoSubject) =>
    a !== null && a.kind === b.kind && a.id === b.id;

/* -------------------------------------------------------------------------- */
/* Where the panel is mounted                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The element the panel portals into. Null means the document body.
 *
 * It has to leave wherever it was written, because it measures itself against
 * the viewport and any transformed ancestor becomes the containing block for
 * a fixed child — which would pin it to that ancestor's edge.
 *
 * The body is right for every caller but one. Inside the compare drawer — a
 * modal dialog — the body is outside the drawer's scroll lock and its focus
 * trap, so a panel opened from in there would be unscrollable and unfocusable.
 * The drawer names itself here and the panel mounts inside it instead.
 */
export const InfoPanelContainer = createContext<HTMLElement | null>(null);

/* -------------------------------------------------------------------------- */
/* The trigger                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The "i" that opens the panel, and the panel it opens.
 *
 * Both live here so that no screen has to remember to mount the panel
 * separately. Every trigger renders one and all but the open one render
 * nothing, which is what keeps a single panel on screen without a provider.
 *
 * It is its own button rather than part of the chip it sits on: the chip
 * applies a profile or moves a priority, and a reader who wants to know what
 * something is has not yet decided to use it. Putting both on one control
 * would mean finding out costs you the thing you were about to change.
 */
export function InfoButton({
    subject,
    label,
    profiles = [],
    priorityDefinitions,
    tone = "quiet",
}: {
    subject: InfoSubject;
    /** Names the thing, not the act: "Practicality". */
    label: string;
    /** Only a profile subject needs these; a priority reads its own meta. */
    profiles?: Profile[];
    priorityDefinitions: PriorityDefinition[];
    /** `onDark` for a chip that has gone solid behind it. */
    tone?: "quiet" | "onDark";
}) {
    const open = useOpenSubject();
    const mine = isSame(open, subject);

    return (
        /*
         * Not modal. The list behind stays live and reachable, which is the
         * whole point of a panel beside it: a reader who reads what a
         * priority is and then tabs straight back to move it is doing the
         * thing this exists for. Radix still gives it the escape key, the
         * click-outside, the portal and the labelled dialog role.
         */
        <Dialog.Root
            modal={false}
            open={mine}
            onOpenChange={(next) => (next ? openInfo(subject) : closeInfo())}
        >
            <Dialog.Trigger
                aria-label={`What is ${label}?`}
                title={`What is ${label}?`}
                className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                    tone === "onDark"
                        ? "text-white/70 hover:bg-white/20 hover:text-white"
                        : "text-finn-iron/60 hover:bg-finn-pale-blue hover:text-finn-accent-blue",
                    "data-[state=open]:bg-finn-pale-blue data-[state=open]:text-finn-accent-blue",
                ].join(" ")}
            >
                <Info aria-hidden="true" className="h-3.5 w-3.5" />
            </Dialog.Trigger>

            <InfoPanel
                subject={subject}
                profiles={profiles}
                priorityDefinitions={priorityDefinitions}
            />
        </Dialog.Root>
    );
}

/* -------------------------------------------------------------------------- */
/* The panel                                                                  */
/* -------------------------------------------------------------------------- */

function InfoPanel({
    subject,
    profiles,
    priorityDefinitions,
}: {
    subject: InfoSubject;
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
}) {
    const container = useContext(InfoPanelContainer);

    /* Portalled — see `InfoPanelContainer` for where to, and why. */
    return (
        /*
         * No `Dialog.Overlay`. There was one, dimming the page behind — and
         * it had never rendered a pixel: Radix returns null from the overlay
         * whenever the dialog is `modal={false}`, which this one deliberately
         * is. Leaving it in was a scrim in the source that nobody had ever
         * seen on screen.
         */
        <Dialog.Portal container={container ?? undefined}>
            <Dialog.Content
                /* Its body is the description; there is no separate line. */
                aria-describedby={undefined}
                className={[
                    DRAWER_SHELL,
                    /*
                     * Between the setup flow's two bars: above its sticky
                     * header at `z-60`, below the stripe of controls it pins
                     * across the foot at `z-[62]`.
                     *
                     * The panel used to be over both, and the controls
                     * underneath were not merely hidden but dead — a press
                     * landed on the panel, so the control did nothing and the
                     * panel did not close either, which read as the thing
                     * refusing to go away. Passing behind the stripe fixes
                     * both at once: the controls stay live, and a press on one
                     * closes the panel the way any press outside does. Its own
                     * shadow goes with it, which is what it was for — a drawer
                     * stopping short of the bottom edge has a lit line under
                     * it that belongs to nothing.
                     *
                     * It has to stay above the header, though: it is full
                     * height, and a panel passing under that one loses its own
                     * title and the button that closes it.
                     */
                    "z-[61] max-w-96 bg-white",
                ].join(" ")}
            >
                {subject.kind === "profile" ? (
                    <ProfileBody
                        id={subject.id}
                        profiles={profiles}
                        priorityDefinitions={priorityDefinitions}
                    />
                ) : (
                    <PriorityBody id={subject.id} />
                )}
            </Dialog.Content>
        </Dialog.Portal>
    );
}

function PanelHeader({ icon, label, kind }: { icon: string; label: string; kind: string }) {
    return (
        <div className="flex items-start gap-3 border-b border-finn-cotton px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white">
                <PriorityIcon name={icon} className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                    {kind}
                </p>
                <Dialog.Title className="mt-0.5 text-base font-black leading-5 text-finn-black">
                    {label}
                </Dialog.Title>
            </div>

            <Dialog.Close
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-finn-iron transition-colors hover:bg-finn-cotton hover:text-finn-black"
            >
                <X aria-hidden="true" className="h-4 w-4" />
            </Dialog.Close>
        </div>
    );
}

/** A titled block, so every section of the panel is built the same way. */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {title}
            </h3>
            <div className="mt-1.5">{children}</div>
        </section>
    );
}

function PriorityBody({ id }: { id: CategoryId }) {
    const category = getCategory(id);

    if (!category) {
        return (
            <>
                <PanelHeader icon="car" label={id} kind="Priority" />
                <div className="px-5 py-4 text-sm leading-6 text-finn-iron">
                    This priority was added by you, so there is nothing written
                    about it beyond its name.
                </div>
            </>
        );
    }

    const features = category.features ?? [];

    return (
        <>
            <PanelHeader icon={category.icon} label={category.label} kind="Priority" />

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                {/* The question it answers, which is the shortest true summary. */}
                <p className="text-sm font-bold leading-6 text-finn-black">
                    {category.question}
                </p>

                <p className="text-sm leading-6 text-finn-iron">
                    {category.description}
                </p>

                <Block title="What it looks at">
                    {category.numericOnly ? (
                        <p className="text-sm leading-6 text-finn-iron">
                            Measured figures rather than a list of features —
                            this one is judged on what the car's own numbers
                            say, so there is nothing here to tick or untick.
                        </p>
                    ) : features.length === 0 ? (
                        <p className="text-sm leading-6 text-finn-iron">
                            Nothing listed yet.
                        </p>
                    ) : (
                        <ul className="flex flex-wrap gap-1.5">
                            {features.map((feature) => {
                                const meta = FEATURES[feature];

                                return (
                                    <li
                                        key={feature}
                                        className="inline-flex items-center gap-1 rounded-full bg-finn-cotton px-2.5 py-1 text-[11px] font-bold text-finn-black"
                                    >
                                        {meta.label}

                                        {/*
                                          * Every one of these carries its own
                                          * "i", the way a feature chip does
                                          * everywhere else in the app.
                                          *
                                          * This panel exists to answer "what
                                          * is this and what does it look at",
                                          * and it was answering the second
                                          * half with fifteen more terms of
                                          * jargon — "rear cross-traffic
                                          * alert", "tyre pressure monitoring"
                                          * — and no way to ask about any of
                                          * them. A reader who does not know
                                          * what a thing is cannot judge
                                          * whether the priority counting it
                                          * is the priority they want, which
                                          * is the only decision this panel is
                                          * open to support.
                                          *
                                          * The text was written long ago and
                                          * is already on every one of these
                                          * rows in `FEATURES`; it was simply
                                          * never put in front of anyone here.
                                          */}
                                        {meta.explanation && (
                                            <InfoTip subject={meta.label}>
                                                {meta.explanation}
                                            </InfoTip>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Block>

                {category.recommendedFor.length > 0 && (
                    <Block title="Worth ranking high if you are">
                        <ul className="space-y-1">
                            {category.recommendedFor.map((who) => (
                                <li
                                    key={who}
                                    className="text-sm leading-6 text-finn-iron"
                                >
                                    {who}
                                </li>
                            ))}
                        </ul>
                    </Block>
                )}
            </div>
        </>
    );
}

function ProfileBody({
    id,
    profiles,
    priorityDefinitions,
}: {
    id: string;
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
}) {
    const profile = profiles.find((item) => item.id === id);

    if (!profile) return null;

    const definitionOf = (categoryId: CategoryId) =>
        priorityDefinitions.find((definition) => definition.id === categoryId);

    return (
        <>
            <PanelHeader icon={profile.icon} label={profile.label} kind="Profile" />

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <p className="text-sm leading-6 text-finn-iron">
                    {profile.forWhom}
                </p>

                <Block title="What it assumes">
                    <p className="text-sm leading-6 text-finn-iron">
                        {profile.assumes}
                    </p>
                </Block>

                {/*
                  * The order itself, which is the whole of what applying a
                  * profile does. A reader who can see it does not have to
                  * take the label on trust.
                  */}
                <Block title="The order it would set">
                    <ol className="space-y-1.5">
                        {profile.priorities.map((categoryId, index) => {
                            const definition = definitionOf(categoryId);

                            return (
                                <li
                                    key={categoryId}
                                    className="flex items-center gap-2.5"
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-finn-pale-blue text-[11px] font-black text-finn-accent-blue">
                                        {index + 1}
                                    </span>

                                    <PriorityIcon
                                        name={definition?.icon ?? "car"}
                                        className="h-4 w-4 shrink-0"
                                    />

                                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-finn-black">
                                        {definition?.label ?? categoryId}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </Block>

                <p className="text-[11px] leading-4 text-finn-iron">
                    Applying a profile only sets this order. Everything stays
                    yours to change afterwards.
                </p>
            </div>
        </>
    );
}
