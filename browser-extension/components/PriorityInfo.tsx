import { createContext, useContext, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
    ArrowLeft,
    CircleCheck,
    Gauge,
    Info,
    Lightbulb,
    ListChecks,
    ListOrdered,
    MessageCircleQuestion,
    Ruler,
    ShieldAlert,
    Target,
    UserRound,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";

import { DRAWER_SHELL } from "@/components/drawer";
import { InfoTip } from "@/components/InfoTip";
import { PriorityIcon } from "@/components/PriorityIcon";
import { surfaceTone, type SurfaceTone } from "@/lib/priority-marks";
import { getCategory, priorityWeights } from "@/lib/reasoning-engine";
import {
    CATEGORIES,
    FEATURE_IMPORTANCE,
    SIGNALS,
    profileEmphasis,
} from "@/lib/reasoning-engine/constants";
import { homeOf } from "@/lib/reasoning-engine/evidence";
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

/**
 * Closes whichever panel is open.
 *
 * For a host that is going away: a panel mounted inside the compare drawer
 * must not outlive the drawer, or it reopens the next time that subject's "i"
 * is drawn.
 */
export function closeInfoPanel(): void {
    if (openSubject) closeInfo();
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
 * Where the panel is mounted, and how it sits against whatever it came from.
 *
 * - `edge` — the default: portalled to the body and pinned to the window's
 *   right edge. Right for every screen where the list is the page itself.
 *
 * - `inside` — opened from inside a drawer. The panel becomes a page of that
 *   drawer, filling it with a "Back to your answers" button, so there is only
 *   ever one sheet on screen. It used to be pinned to the same right edge as
 *   the drawer, landing on top of it: a second sheet over the first, with two
 *   shadows and two close buttons stacked in one corner.
 *
 * `container` is the element to portal into; null means the body. A panel
 * opened from inside a modal drawer has to mount inside it — the body is
 * outside the drawer's scroll lock and focus trap, so it would be
 * unscrollable and unfocusable.
 */
export type InfoPanelHostValue =
    | { placement: "edge"; container: null }
    | { placement: "inside"; container: HTMLElement | null };

export const InfoPanelHost = createContext<InfoPanelHostValue>({
    placement: "edge",
    container: null,
});

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
    tone: variant = "quiet",
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

    /*
     * While its panel is open the "i" fills with the subject's own colour —
     * the panel's header wears it too, so the button and what it opened are
     * visibly the same thing. It was accent blue for everything, which on an
     * orange Family First card pointed at the panel in the wrong colour.
     */
    const mark =
        subject.kind === "profile"
            ? profiles.find((profile) => profile.id === subject.id)?.icon
            : (priorityDefinitions.find((definition) => definition.id === subject.id)?.icon ??
              getCategory(subject.id)?.icon);
    const tone = surfaceTone(mark);

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
                    /*
                     * Open wins outright rather than layering over the rest:
                     * the group-hover rules below would otherwise hand the
                     * icon back to the chip's ink the moment the pointer
                     * crossed it, and white on a pale chip is no mark at all.
                     *
                     * A filled 20px disc on its own was easy to lose among a
                     * row of other small marks, so it also takes a halo in the
                     * same hue, set off by a white gap and grown a step — the
                     * one "i" on the screen whose panel is open should be
                     * findable from across the page.
                     */
                    mine
                        ? `${tone.solid} ${tone.edgeStrong} scale-110 text-white shadow-md ring-2 ring-offset-2 ring-offset-white`
                        : variant === "onDark"
                        ? "text-white/70 hover:bg-white/20 hover:text-white"
                        : [
                              "text-finn-iron/60",
                              "hover:bg-finn-pale-blue hover:text-finn-accent-blue",
                              /*
                               * On a chip that colours itself under the
                               * pointer, the "i" goes with it.
                               *
                               * These sit inside chips that recolour on hover
                               * — the profile presets take the accent, the
                               * "add a priority" chips go solid blue — and
                               * the "i" was staying the grey it is at rest.
                               * The whole chip lit up except the one thing
                               * inside it, which read as a mark that had
                               * failed to load rather than a control.
                               *
                               * `text-inherit` rather than a colour per
                               * caller: whatever the chip turns its own type,
                               * this is that. The self-hover ground follows
                               * from the same place, so the pill the "i"
                               * draws under itself is a wash of the chip's
                               * own hue instead of a pale blue that only
                               * suits one of them.
                               *
                               * Both are keyed on a `group` the chip has to
                               * declare, so an "i" standing on its own — the
                               * priority rows, the corner of a profile card —
                               * keeps the accent-blue hover it has always had.
                               */
                              "group-hover:text-inherit",
                              /*
                               * Stacked, and not redundant: inside a group,
                               * `group-hover:text-inherit` and the plain
                               * `hover:` above it are the same specificity,
                               * and Tailwind emits `hover:` last — so without
                               * this the "i" would snap back to accent blue
                               * the moment the pointer reached it, which on
                               * the chip that goes solid blue is dark type on
                               * its own dark ground.
                               */
                              "group-hover:hover:text-inherit",
                              "group-hover:hover:bg-current/20",
                          ].join(" "),
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

/** The panel's shell in each placement — see `InfoPanelHost`. */
const PANEL_CLASS: Record<InfoPanelHostValue["placement"], string> = {
    edge: [
        DRAWER_SHELL,
        /*
         * Between the setup flow's two bars: above its sticky header at
         * `z-60`, below the stripe of controls it pins across the foot at
         * `z-[62]`.
         *
         * The panel used to be over both, and the controls underneath were
         * not merely hidden but dead — a press landed on the panel, so the
         * control did nothing and the panel did not close either, which read
         * as the thing refusing to go away. Passing behind the stripe fixes
         * both at once: the controls stay live, and a press on one closes the
         * panel the way any press outside does. Its own shadow goes with it,
         * which is what it was for — a drawer stopping short of the bottom
         * edge has a lit line under it that belongs to nothing.
         *
         * It has to stay above the header, though: it is full height, and a
         * panel passing under that one loses its own title and the button
         * that closes it.
         */
        "z-[61] max-w-96 bg-white",
    ].join(" "),

    /*
     * A page of the drawer: filling it, and sliding in over the answers from
     * the drawer's right edge and back out the same way. The answers stay
     * mounted underneath, so going back finds them scrolled where they were.
     */
    inside:
        "finn-lens-drawer absolute inset-0 z-10 flex flex-col bg-white outline-none",
};

function InfoPanel({
    subject,
    profiles,
    priorityDefinitions,
}: {
    subject: InfoSubject;
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
}) {
    const host = useContext(InfoPanelHost);

    /* Portalled — see `InfoPanelHost` for where to, and why. */
    return (
        /*
         * No `Dialog.Overlay`. There was one, dimming the page behind — and
         * it had never rendered a pixel: Radix returns null from the overlay
         * whenever the dialog is `modal={false}`, which this one deliberately
         * is. Leaving it in was a scrim in the source that nobody had ever
         * seen on screen.
         */
        <Dialog.Portal container={host.container ?? undefined}>
            <Dialog.Content
                /* Its body is the description; there is no separate line. */
                aria-describedby={undefined}
                className={PANEL_CLASS[host.placement]}
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


/**
 * The top of the panel, in the subject's own colour.
 *
 * It was a white bar with a framed mark, the same for every priority and
 * every profile, so a reader who opened Comfort and then Safety saw the
 * panel's words change and nothing else. The list they opened it from now
 * draws each priority in its hue; the panel carries that hue across, so the
 * row and the explanation of it read as one thing.
 */
function PanelHeader({
    icon,
    label,
    kind,
    children,
}: {
    icon: string;
    label: string;
    kind: "Priority" | "Profile";
    /** A line under the title — the question a priority answers. */
    children?: React.ReactNode;
}) {
    const tone = surfaceTone(icon);
    const KindIcon = kind === "Priority" ? Target : UserRound;
    const { placement } = useContext(InfoPanelHost);

    return (
        <div className={["relative px-5 pb-5 pt-4", tone.ground].join(" ")}>
            {/*
              * A page of the drawer is left the way pages are left: back, to
              * what it covered, rather than closed as though it were a
              * separate thing.
              */}
            {placement === "inside" && (
                <Dialog.Close className="-ml-1.5 mb-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/70 px-3 text-xs font-black text-finn-black transition-colors hover:bg-white">
                    <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                    Back to your answers
                </Dialog.Close>
            )}

            <div className="flex items-start gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <PriorityIcon name={icon} className="h-7 w-7" />
                </span>

                <div className="min-w-0 flex-1 pt-1">
                    <p
                        className={[
                            "flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em]",
                            tone.ink,
                        ].join(" ")}
                    >
                        <KindIcon aria-hidden="true" className="h-3 w-3" />
                        {kind}
                    </p>

                    <Dialog.Title className="mt-1 text-lg font-black leading-6 text-finn-black">
                        {label}
                    </Dialog.Title>
                </div>

                {placement !== "inside" && (
                    <Dialog.Close
                        aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-finn-iron transition-colors hover:bg-white hover:text-finn-black"
                    >
                        <X aria-hidden="true" className="h-4 w-4" />
                    </Dialog.Close>
                )}
            </div>

            {children}
        </div>
    );
}

/** A titled block, so every section of the panel is built the same way. */
function Block({
    title,
    icon: Icon,
    aside,
    children,
}: {
    title: string;
    icon: LucideIcon;
    /** A count or note at the far end of the heading. */
    aside?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section>
            <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-finn-black">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-finn-cotton text-finn-iron">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                </span>

                <span className="min-w-0 flex-1">{title}</span>

                {aside && (
                    <span className="text-[11px] font-bold normal-case tracking-normal text-finn-iron">
                        {aside}
                    </span>
                )}
            </h3>

            <div className="mt-2.5">{children}</div>
        </section>
    );
}

function PriorityBody({ id }: { id: CategoryId }) {
    const category = getCategory(id);

    if (!category) {
        return (
            <>
                <PanelHeader icon="car" label={id} kind="Priority" />
                <div className="px-5 py-5 text-sm leading-6 text-finn-iron">
                    This priority was added by you, so there is nothing written
                    about it beyond its name.
                </div>
            </>
        );
    }

    const tone = surfaceTone(category.icon);
    const niche = new Set(category.niche ?? []);
    /* Boot volume is defined but not scored until FINN's figure can be trusted. */
    const features = (category.features ?? []).filter(
        (feature) => feature !== "bootVolume",
    );
    const alsoCounts = category.alsoCounts ?? [];
    const expected = category.expected ?? [];

    return (
        <>
            {/* The question it answers, which is the shortest true summary — so it leads. */}
            <PanelHeader icon={category.icon} label={category.label} kind="Priority">
                <p className="mt-4 flex gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-sm font-bold leading-5 text-finn-black">
                    <MessageCircleQuestion
                        aria-hidden="true"
                        className={["mt-0.5 h-4 w-4 shrink-0", tone.ink].join(" ")}
                    />
                    {category.question}
                </p>
            </PanelHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <p className="text-sm leading-6 text-finn-iron">
                    {category.description}
                </p>

                <Block
                    title="What it looks at"
                    icon={ListChecks}
                    aside={
                        !category.numericOnly && features.length > 0
                            ? `${features.length + alsoCounts.length + expected.length} item${features.length + alsoCounts.length + expected.length === 1 ? "" : "s"}`
                            : undefined
                    }
                >
                    {category.numericOnly ? (
                        <Callout tone={tone} icon={Gauge} title="A measured figure">
                            Not a list of features — this one is scored from
                            the car's own published data, so there is nothing
                            here to tick or untick.
                        </Callout>
                    ) : features.length === 0 ? (
                        <p className="text-sm leading-6 text-finn-iron">
                            Nothing listed yet.
                        </p>
                    ) : (
                        <ul className="flex flex-wrap gap-1.5">
                            {[...features, ...alsoCounts, ...expected].map((feature) => {
                                const meta = SIGNALS[feature];
                                const home = homeOf(feature);
                                const note = niche.has(feature)
                                    ? "only if raised"
                                    : home && home !== id
                                      ? `from ${CATEGORIES[home].label}`
                                      : null;

                                return (
                                    <li
                                        key={feature}
                                        className={[
                                            "inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[11px] font-bold text-finn-black ring-1",
                                            tone.ground,
                                            tone.edge,
                                        ].join(" ")}
                                    >
                                        <CircleCheck
                                            aria-hidden="true"
                                            className={["h-3.5 w-3.5 shrink-0", tone.ink].join(" ")}
                                        />

                                        {meta.label}

                                        {note && (
                                            <span className="font-medium text-finn-iron">
                                                · {note}
                                            </span>
                                        )}

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

                    {/*
                      * The figures, which the chips alone don't show. Length
                      * under City & Parking is one of its items, scored on a
                      * fixed scale; electric range under Long Distance is a
                      * limit — it can hold a short-range car back, and gives
                      * a long-range one nothing extra.
                      */}
                    {category.measured && (
                        <div className="mt-3">
                            <Callout
                                tone={tone}
                                icon={Ruler}
                                title={category.limit ? "And a limit" : "One of these is measured"}
                            >
                                {category.measured}.
                            </Callout>
                        </div>
                    )}

                </Block>

                {category.recommendedFor.length > 0 && (
                    <Block title="Recommended for" icon={Users}>
                        <ul className="space-y-1.5">
                            {category.recommendedFor.map((who) => (
                                <li
                                    key={who}
                                    className="flex items-start gap-2.5 rounded-xl bg-finn-snow px-3 py-2 text-sm leading-5 text-finn-black"
                                >
                                    <CircleCheck
                                        aria-hidden="true"
                                        className={["mt-0.5 h-4 w-4 shrink-0", tone.ink].join(" ")}
                                    />
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

    const tone = surfaceTone(profile.icon);
    const weights = priorityWeights(profile.priorities);
    const emphasis = profileEmphasis(profile.id);
    const raised = profile.priorities.flatMap((categoryId) =>
        (emphasis[categoryId] ?? []).map((pick) => ({ categoryId, pick })),
    );
    const topWeight = weights[0]?.weight ?? 1;

    const definitionOf = (categoryId: CategoryId) =>
        priorityDefinitions.find((definition) => definition.id === categoryId);

    return (
        <>
            <PanelHeader icon={profile.icon} label={profile.label} kind="Profile">
                <p className="mt-4 text-sm leading-6 text-finn-black">
                    {profile.forWhom}
                </p>
            </PanelHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <Block title="What it assumes" icon={Lightbulb}>
                    <Callout tone={tone}>{profile.assumes}</Callout>
                </Block>

                {/*
                  * The order itself, which is the whole of what applying a
                  * profile does. A reader who can see it does not have to
                  * take the label on trust — and drawn the way the list they
                  * would be changing is drawn, colour for colour and share
                  * for share, they can see what it would do to theirs.
                  */}
                <Block
                    title="The order it would set"
                    icon={ListOrdered}
                    aside="share of the result"
                >
                    <ol className="space-y-1.5">
                        {profile.priorities.map((categoryId, index) => {
                            const definition = definitionOf(categoryId);
                            const rowTone = surfaceTone(definition?.icon);
                            const weight = weights[index];

                            return (
                                <li
                                    key={categoryId}
                                    className={[
                                        "flex items-center gap-2.5 rounded-xl bg-white px-2.5 py-2 ring-1",
                                        rowTone.edge,
                                    ].join(" ")}
                                >
                                    <span
                                        className={[
                                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white",
                                            rowTone.solid,
                                        ].join(" ")}
                                    >
                                        {index + 1}
                                    </span>

                                    <span
                                        className={[
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                            rowTone.ground,
                                        ].join(" ")}
                                    >
                                        <PriorityIcon
                                            name={definition?.icon ?? "car"}
                                            className="h-4 w-4"
                                        />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px] font-bold leading-4 text-finn-black">
                                            {definition?.label ?? categoryId}
                                        </span>

                                        {weight && (
                                            <span
                                                aria-hidden="true"
                                                className={[
                                                    "mt-1.5 block h-1 w-full max-w-32 overflow-hidden rounded-full",
                                                    rowTone.track,
                                                ].join(" ")}
                                            >
                                                <span
                                                    className={["block h-full rounded-full", rowTone.bar].join(" ")}
                                                    style={{
                                                        width: `${(weight.weight / topWeight) * 100}%`,
                                                    }}
                                                />
                                            </span>
                                        )}
                                    </span>

                                    {weight && (
                                        <span
                                            className={[
                                                "shrink-0 text-xs font-black tabular-nums",
                                                rowTone.ink,
                                            ].join(" ")}
                                        >
                                            {weight.weightPercent}%
                                            <span className="sr-only"> of the result</span>
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </Block>

                {raised.length > 0 && (
                    <Block title="What it counts for more" icon={Target}>
                        <ul className="space-y-1.5">
                            {raised.map(({ categoryId, pick }) => (
                                <li
                                    key={`${categoryId}-${pick.key}`}
                                    className="flex items-baseline justify-between gap-3 rounded-xl bg-finn-snow px-3 py-2 text-[13px] leading-5 text-finn-black"
                                >
                                    <span className="min-w-0">
                                        {SIGNALS[pick.key].label}
                                        <span className="text-finn-iron">
                                            {" "}· {definitionOf(categoryId)?.label ?? categoryId}
                                        </span>
                                    </span>
                                    <span
                                        className={[
                                            "shrink-0 text-[11px] font-black",
                                            FEATURE_IMPORTANCE[pick.importance].accentTextClass,
                                        ].join(" ")}
                                    >
                                        {FEATURE_IMPORTANCE[pick.importance].label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Block>
                )}

                <Block title="What it doesn't promise" icon={ShieldAlert}>
                    <Callout tone={tone}>{profile.doesNotGuarantee}</Callout>
                </Block>

                <p className="flex gap-2 text-[11px] leading-4 text-finn-iron">
                    <Info aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
                    Applying a profile sets this order and what counts for more,
                    replacing yours — you can undo it straight away, and
                    everything stays yours to change afterwards.
                </p>
            </div>
        </>
    );
}

/** A tinted note in the subject's colour — for the one thing a block most needs noticed. */
function Callout({
    tone,
    icon: Icon,
    title,
    children,
}: {
    tone: SurfaceTone;
    icon?: LucideIcon;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={[
                "flex gap-2.5 rounded-xl px-3.5 py-3 ring-1",
                tone.ground,
                tone.edge,
            ].join(" ")}
        >
            {Icon && (
                <Icon
                    aria-hidden="true"
                    className={["mt-0.5 h-4 w-4 shrink-0", tone.ink].join(" ")}
                />
            )}

            <div className="min-w-0 flex-1 text-[13px] leading-5 text-finn-black">
                {title && (
                    <p className={["mb-0.5 font-black", tone.ink].join(" ")}>
                        {title}
                    </p>
                )}
                {children}
            </div>
        </div>
    );
}
