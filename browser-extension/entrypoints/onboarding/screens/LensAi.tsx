import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { MessageCircle, Scale, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { GeminiKeyField, type KeyStatus } from "@/components/GeminiKeyField";

/**
 * Lens AI, offered once and never pressed.
 *
 * The reader should leave setup knowing it exists, what it adds and what it
 * costs them — a key of their own, and their words going to Google — because
 * that's a choice worth making knowingly rather than discovering in Settings.
 * But Lens is complete without it, so "Not now" is the answer already
 * selected, and nothing here is saved until the flow finishes.
 */
export function LensAi({
    enabled,
    apiKey,
    onChangeEnabled,
    onChangeKey,
    onKeyStatus,
}: {
    enabled: boolean;
    apiKey: string;
    onChangeEnabled: (enabled: boolean) => void;
    onChangeKey: (apiKey: string) => void;
    onKeyStatus: (status: KeyStatus) => void;
}) {
    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">Optional</p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    Want to tell Lens what you need in your own words?
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    Everything you've set up so far works without it. Lens AI adds a chat on finn.com where you can
                    describe your situation, and Lens turns it into what it can check on each car.
                </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
                <Point icon={<MessageCircle aria-hidden="true" className="h-4 w-4" />} title="What it adds">
                    Say "I have a toddler, I'm bad at parking and I can't go over €450" and Lens works out which
                    equipment and limits that means, asking a question when the answer would change things.
                </Point>
                <Point icon={<Scale aria-hidden="true" className="h-4 w-4" />} title="What stays the same">
                    The AI never scores or picks a car. Lens's own engine still does the ranking, the same way it
                    does now, and shows its working.
                </Point>
                <Point icon={<Sparkles aria-hidden="true" className="h-4 w-4" />} title="What it needs">
                    A free Gemini API key of your own. What you type to Lens, and facts about the cars being
                    discussed, go to Google, whose free tier may use them to improve its products.
                </Point>
            </div>

            <section className="mx-auto mt-8 max-w-3xl rounded-[26px] bg-white p-5 shadow-sm sm:p-6">
                <p id="lens-ai-choice" className="text-sm font-black text-finn-black">
                    Use Lens AI?
                </p>

                <ToggleGroup.Root
                    type="single"
                    value={enabled ? "on" : "off"}
                    onValueChange={(next) => {
                        if (next) onChangeEnabled(next === "on");
                    }}
                    aria-labelledby="lens-ai-choice"
                    className="mt-2 flex gap-2"
                >
                    {[
                        ["off", "Not now"],
                        ["on", "Turn on Lens AI"],
                    ].map(([value, label]) => (
                        <ToggleGroup.Item
                            key={value}
                            value={value!}
                            className={[
                                "h-11 flex-1 rounded-2xl text-xs font-black shadow-sm transition",
                                "bg-finn-pale-blue text-finn-black hover:bg-finn-cotton",
                                "data-[state=on]:bg-finn-accent-blue data-[state=on]:text-white",
                            ].join(" ")}
                        >
                            {label}
                        </ToggleGroup.Item>
                    ))}
                </ToggleGroup.Root>

                {enabled ? (
                    <div className="mt-5">
                        <GeminiKeyField apiKey={apiKey} onChange={onChangeKey} onStatus={onKeyStatus} />
                        <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                            Your key is stored in this browser's extension storage, where websites can't read it, and is
                            only ever sent to Google. The free tier allows a small number of requests a day; when they run
                            out, Lens AI says so and everything else keeps working.
                        </p>
                    </div>
                ) : (
                    <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                        Lens will work from your priorities and driving alone, and nothing is sent anywhere. You can turn
                        Lens AI on any time in Settings → Lens AI.
                    </p>
                )}
            </section>
        </div>
    );
}

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-black text-finn-black">
                <span className="text-finn-accent-blue">{icon}</span>
                {title}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-finn-iron">{children}</p>
        </div>
    );
}
