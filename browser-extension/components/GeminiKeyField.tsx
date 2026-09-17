import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, TriangleAlert } from "lucide-react";

import { Spinner } from "@/components/Spinner";
import { checkGeminiKey, type KeyCheck } from "@/lib/lens-ai/gemini";

const KEY_PAGE = "https://aistudio.google.com/apikey";

export type KeyStatus = "empty" | "checking" | "accepted" | "rejected" | "unchecked";

type CheckState = { state: "idle" } | { state: "checking" } | { state: "done"; key: string; result: KeyCheck };

/**
 * The reader's Gemini API key, checked with Google as soon as it's entered.
 *
 * Shared by Settings and the setup flow, so a key is entered, shown, checked
 * and removed the same way in both. The check reads a model's metadata, which
 * spends none of the key's daily requests.
 */
export function GeminiKeyField({
    apiKey,
    onChange,
    onStatus,
    tone = "bg-finn-snow",
}: {
    apiKey: string;
    onChange: (apiKey: string) => void;
    /** What's known about the key right now, for a caller that gates on it. */
    onStatus?: (status: KeyStatus) => void;
    /** The field's ground, to sit on white or on a tinted card. */
    tone?: string;
}) {
    const [visible, setVisible] = useState(false);
    const [check, setCheck] = useState<CheckState>({ state: "idle" });
    const latest = useRef(apiKey);

    const key = apiKey.trim();
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

    const status: KeyStatus = !key
        ? "empty"
        : check.state === "done"
          ? check.result.ok
              ? "accepted"
              : rejected
                ? "rejected"
                : "unchecked"
          : "checking";

    useEffect(() => {
        onStatus?.(status);
    }, [status, onStatus]);

    return (
        <div>
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

            <div className={["mt-2 flex items-center gap-2 rounded-2xl px-3", tone, rejected ? "ring-2 ring-finn-error/60" : ""].join(" ")}>
                <input
                    id="lens-ai-key"
                    type={visible ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Paste your key"
                    value={apiKey}
                    aria-invalid={rejected || undefined}
                    aria-describedby="lens-ai-key-status"
                    onChange={(event) => onChange(event.target.value.trim())}
                    className="h-12 min-w-0 flex-1 bg-transparent font-mono text-sm text-finn-black outline-none placeholder:font-sans placeholder:text-finn-iron"
                />
                {apiKey && (
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

            {apiKey && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="mt-1 text-xs font-bold text-finn-iron hover:text-finn-black"
                >
                    Remove key
                </button>
            )}
        </div>
    );
}
