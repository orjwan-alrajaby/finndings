/**
 * The screens, in order.
 *
 * Five, and the count is deliberate. The first two teach and ask for
 * nothing; the middle two are the entire setup; the last one shows the
 * product working. Anything else a reader might want to configure lives in
 * Settings, because a setup flow that asks for everything is a settings page
 * with a progress bar on it.
 *
 * The second screen used to be called `how` and described the product in
 * three sentences. It is now a working copy of finn.com with Lens on it, and
 * the rename is not cosmetic: the thing being shown is a *page*, not an idea
 * about one. See `screens/Tour`.
 */
export type OnboardingScreen =
    | "welcome"
    | "tour"
    | "priorities"
    | "driving"
    | "preview";

export const SCREEN_ORDER: OnboardingScreen[] = [
    "welcome",
    "tour",
    "priorities",
    "driving",
    "preview",
];

/** What the progress rail calls each screen. */
export const SCREEN_LABEL: Record<OnboardingScreen, string> = {
    welcome: "Welcome",
    tour: "What Lens adds",
    priorities: "Your priorities",
    driving: "Your driving",
    preview: "See it work",
};

/**
 * The same five, said to a reader who has not started yet.
 *
 * The rail can only say where you are; it cannot say where you are going,
 * because a five-segment bar with one segment lit is a shape, not a promise.
 * The welcome screen prints this list instead, so the first decision anybody
 * makes here — carry on, or skip — is made knowing what the whole thing
 * consists of and which parts ask for anything.
 */
export const SCREEN_PROMISE: Record<
    Exclude<OnboardingScreen, "welcome">,
    { title: string; body: string; asks: boolean }
> = {
    tour: {
        title: "See what Lens adds to finn.com",
        body: "A working copy of a listing page, with the two buttons Lens puts on every car.",
        asks: false,
    },
    priorities: {
        title: "Say what matters to you",
        body: "Pick a handful of things a car should be good at, and put them in order. Presets ready if you'd rather start from one.",
        asks: true,
    },
    driving: {
        title: "Say how much you drive",
        body: "So Lens can work out what a car costs you rather than what it advertises. Every field already has a workable answer.",
        asks: true,
    },
    preview: {
        title: "Read a worked example",
        body: "The same reasoning you'll get on real listings, run over three example cars and judged against the order you just set.",
        asks: false,
    },
};
