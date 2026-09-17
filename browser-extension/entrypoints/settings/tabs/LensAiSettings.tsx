import { GeminiKeyField } from "@/components/GeminiKeyField";
import type { LensAiSettings as Settings } from "@/lib/lens-ai/settings";

import { Section, Toggle } from "../components/primitives";

interface LensAiSettingsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

/**
 * Lens AI, switched on or off, and the reader's own Gemini key.
 *
 * Off is a complete product: the engine ranks, scores and explains without
 * a model. On adds the places where a reader can say what they need in their
 * own words. The switch can't be turned on without a key, and the key is
 * checked with Google as soon as it's entered (`GeminiKeyField`).
 */
export function LensAiSettings({ settings, onChange }: LensAiSettingsProps) {
    const key = settings.apiKey.trim();

    return (
        <Section
            title="Lens AI"
            description="Optional, and off unless you turn it on. Lens's recommendations, scores and explanations always come from its own engine. Lens AI only adds a way to tell Lens what you need in your own words — the engine still does the ranking."
        >
            <div className="flex items-start justify-between gap-4 rounded-2xl bg-finn-snow p-4">
                <div>
                    <p className="text-sm font-black text-finn-black">Use Lens AI</p>
                    <p className="mt-1 text-xs leading-5 text-finn-iron">
                        {settings.enabled && key
                            ? "On: Ask Lens appears on finn.com, and you can describe what you need on the recommendation page."
                            : key
                              ? "Off: Lens works from your settings and pinned cars only."
                              : "Add a Gemini API key below to turn it on."}
                    </p>
                </div>
                <Toggle
                    checked={settings.enabled && key.length > 0}
                    disabled={!key}
                    label={settings.enabled ? "Turn Lens AI off" : "Turn Lens AI on"}
                    onChange={(enabled) => onChange({ ...settings, enabled })}
                />
            </div>

            <div className="mt-5">
                <GeminiKeyField
                    apiKey={settings.apiKey}
                    onChange={(apiKey) => onChange({ enabled: apiKey ? settings.enabled : false, apiKey })}
                />
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-finn-cotton/70 p-4 text-xs leading-5 text-finn-iron">
                <p>
                    <strong className="text-finn-black">What's sent, and where.</strong> With Lens AI on, what you type to Lens,
                    and the facts Lens shows you about the cars being discussed, go to Google's Gemini API using your key.
                    Nothing is sent while it's off.
                </p>
                <p>
                    On Gemini's free tier, Google may use that content to improve its products. Don't type anything into Lens
                    you wouldn't want shared that way.
                </p>
                <p>
                    Your key is stored in this browser's extension storage, where websites can't read it, and is only ever sent
                    to Google. You can remove it here or on the Data tab.
                </p>
                <p>
                    The free tier allows a small number of requests a day for each model. When they run out, Lens AI says so
                    and everything else keeps working.
                </p>
            </div>
        </Section>
    );
}
