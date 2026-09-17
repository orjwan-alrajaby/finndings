import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, TriangleAlert } from "lucide-react";

import { Spinner } from "@/components/Spinner";
import { checkGeminiKey, type KeyCheck } from "@/lib/lens-ai/gemini";
import type { LensAiSettings as Settings } from "@/lib/lens-ai/settings";

import { Section, Toggle } from "../components/primitives";

const KEY_PAGE = "https://aistudio.google.com/apikey";

type CheckState = { state: "idle" } | { state: "checking" } | { state: "done"; key: string; result: KeyCheck };

interface LensAiSettingsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

/**
 * Lens AI, switched on or off, and the reader's own Gemini key.
 *
 * Off is a complete product: the engine ranks, scores and explains without
 * a model. On adds the places where a reader can say what they need in their
 * own words. The switch can't be turned on without a key, and a key is
 * checked with Google as soon as it's entered, so "on" never means "on, and
 * failing on finn.com the first time someone types".
 */
export function LensAiSettings({ settings, onChange }: LensAiSettingsProps) {
    const [visible, setVisible] = useState(false);
    const [check, setCheck] = useState<CheckState>({ state: "idle" });
    const latest = useRef(settings.apiKey);

    const key = settings.apiKey.trim();
    latest.current = key;

    /* Checked shortly after typing stops, and only for something shaped like a key. */
    useEffect(() => {
        if (key.length < 20) {
            setCheck({ state: "idle" });
            return;
        }

        if (check.state === "done" && check.key === key) return;

        /* A verdict on the previous key says nothing about this one. */
        setCheck({ state: "idle" });

        const timer = window.setTimeout(async () => {
            setCheck({ state: "checking" });

            const result = await checkGeminiKey(key);

            if (latest.current === key) setCheck({ state: "done", key, result });
        }, 600);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const rejected = check.state === "done" && !check.result.ok && check.result.reason === "rejected";

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
                <label htmlFor="lens-ai-key" className="text-xs font-black text-finn-black">
                    Gemini API key
                </label>
                <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                    Free from Google AI Studio, no card needed.{" "}
                    <a
                        href={KEY_PAGE}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 font-bold text-finn-accent-blue hover:underline"
                    >
                        Get a key <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                </p>

                <div
                    className={[
                        "mt-2 flex items-center gap-2 rounded-2xl bg-finn-snow px-3",
                        rejected ? "ring-2 ring-finn-error/60" : "",
                    ].join(" ")}
                >
                    <input
                        id="lens-ai-key"
                        type={visible ? "text" : "password"}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Paste your key"
                        value={settings.apiKey}
                        aria-invalid={rejected || undefined}
                        aria-describedby="lens-ai-key-status"
                        onChange={(event) => {
                            const apiKey = event.target.value.trim();
                            onChange({ enabled: apiKey ? settings.enabled : false, apiKey });
                        }}
                        className="h-12 min-w-0 flex-1 bg-transparent font-mono text-sm text-finn-black outline-none placeholder:font-sans placeholder:text-finn-iron"
                    />
                    {settings.apiKey && (
                        <button
                            type="button"
                            onClick={() => setVisible((shown) => !shown)}
                            aria-label={visible ? "Hide key" : "Show key"}
                            className="text-finn-iron hover:text-finn-black"
                        >
                            {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                        </button>
                    )}
                </div>

                <div id="lens-ai-key-status" aria-live="polite" className="mt-1.5 min-h-4 text-[11px] leading-4">
                    {check.state === "checking" && (
                        <span className="inline-flex items-center gap-1.5 text-finn-iron">
                            <Spinner className="h-3 w-3 text-finn-accent-blue" /> Checking the key with Google…
                        </span>
                    )}
                    {check.state === "done" && check.result.ok && (
                        <span className="inline-flex items-center gap-1 font-bold text-finn-influence-emerald">
                            <Check aria-hidden="true" className="h-3.5 w-3.5" /> Google accepted this key.
                        </span>
                    )}
                    {check.state === "done" && !check.result.ok && (
                        <span className={`inline-flex items-center gap-1 font-bold ${rejected ? "text-finn-error" : "text-finn-iron"}`}>
                            <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" /> {check.result.message}
                        </span>
                    )}
                </div>

                {settings.apiKey && (
                    <button
                        type="button"
                        onClick={() => onChange({ enabled: false, apiKey: "" })}
                        className="text-xs font-bold text-finn-iron hover:text-finn-black"
                    >
                        Remove key
                    </button>
                )}
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
