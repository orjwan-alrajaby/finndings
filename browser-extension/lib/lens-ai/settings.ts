/**
 * Whether Lens AI is on, and the Gemini key it uses.
 *
 * Off by default. Lens is a deterministic engine first: every recommendation,
 * score and explanation works without a model, and the AI only adds a way to
 * say things in your own words. Turning it on takes a key the reader creates
 * themselves, so there is never a shared or shipped credential.
 *
 * Stored in `storage.local` — this browser's extension storage, readable by
 * Finn Lens and not by websites — and listed on the Data tab so it can be
 * deleted like everything else Lens keeps.
 */

export const LENS_AI_KEY = "finnLensAi";

export interface LensAiSettings {
    enabled: boolean;
    apiKey: string;
}

export const DEFAULT_LENS_AI_SETTINGS: LensAiSettings = { enabled: false, apiKey: "" };

function read(value: unknown): LensAiSettings {
    const raw = (value ?? {}) as Partial<LensAiSettings>;

    return {
        enabled: raw.enabled === true,
        apiKey: typeof raw.apiKey === "string" ? raw.apiKey.trim() : "",
    };
}

export async function loadLensAiSettings(): Promise<LensAiSettings> {
    try {
        return read((await browser.storage.local.get(LENS_AI_KEY))[LENS_AI_KEY]);
    } catch {
        return DEFAULT_LENS_AI_SETTINGS;
    }
}

export async function saveLensAiSettings(settings: LensAiSettings): Promise<void> {
    await browser.storage.local.set({ [LENS_AI_KEY]: read(settings) });
}

/** On, with a key to use. The only state in which anything calls a model. */
export const lensAiUsable = (settings: LensAiSettings): boolean => settings.enabled && settings.apiKey.length > 0;

/** Calls back whenever the setting changes, from any page. Returns the unsubscribe. */
export function watchLensAiSettings(onChange: (settings: LensAiSettings) => void): () => void {
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        if (area === "local" && LENS_AI_KEY in changes) onChange(read(changes[LENS_AI_KEY]?.newValue));
    };

    browser.storage.onChanged.addListener(listener);

    return () => browser.storage.onChanged.removeListener(listener);
}
