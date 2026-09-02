/**
 * The screens, in order.
 *
 * Five, and the count is deliberate. The first two teach and ask for
 * nothing; the middle two are the entire setup; the last one shows the
 * product working. Anything else a reader might want to configure lives in
 * Settings, because a setup flow that asks for everything is a settings page
 * with a progress bar on it.
 */
export type OnboardingScreen =
    | "welcome"
    | "how"
    | "priorities"
    | "driving"
    | "preview";

export const SCREEN_ORDER: OnboardingScreen[] = [
    "welcome",
    "how",
    "priorities",
    "driving",
    "preview",
];

/** What the progress rail calls each screen. */
export const SCREEN_LABEL: Record<OnboardingScreen, string> = {
    welcome: "Welcome",
    how: "How it works",
    priorities: "Your priorities",
    driving: "Your driving",
    preview: "See it work",
};
