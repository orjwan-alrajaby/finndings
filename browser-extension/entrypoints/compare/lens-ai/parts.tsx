import type { ButtonHTMLAttributes, ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Spinner } from "@/components/Spinner";

import type { LensAiStatus } from "./hooks";

/** The page's own two button weights, for the AI surfaces. */
export function PrimaryButton({
    children,
    busy = false,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
    return (
        <button
            type="button"
            {...props}
            disabled={props.disabled || busy}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-finn-accent-blue px-5 text-xs font-black text-white shadow-sm transition hover:bg-finn-highlight-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
            {busy && <Spinner className="h-4 w-4 text-white" />}
            {children}
        </button>
    );
}

export function SecondaryButton({
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            {...props}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-finn-iron ring-1 ring-finn-cotton transition hover:text-finn-black disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </button>
    );
}

/** A request that didn't come back, said in one line with a way to try again. */
export function AiError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-finn-influence-red-pale px-3 py-2.5">
            <p className="text-xs font-bold text-finn-influence-red">{message}</p>

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 text-xs font-black text-finn-influence-red underline-offset-2 hover:underline"
                >
                    <RotateCcw aria-hidden="true" className="h-3 w-3" />
                    Try again
                </button>
            )}
        </div>
    );
}

/** "Experimental", and in development which provider is answering. */
export function ExperimentTag({ status }: { status: LensAiStatus }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-finn-cotton px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-finn-iron">
            Experimental
            {import.meta.env.DEV && status.state === "ready" && (
                <span className="font-bold normal-case tracking-normal">
                    · {status.model ?? status.provider}
                </span>
            )}
        </span>
    );
}

/**
 * What an offline server looks like: nothing, for a reader; one quiet line
 * for someone developing the experiment, who needs to know why it's missing.
 */
export function OfflineHint({ onRetry }: { onRetry: () => void }) {
    if (!import.meta.env.DEV) return null;

    return (
        <p className="finn-lens-screen-only mb-4 flex flex-wrap items-center gap-2 text-[11px] text-finn-iron">
            Lens AI (experimental) is offline — start it with{" "}
            <code className="rounded bg-finn-cotton px-1.5 py-0.5 font-mono text-[10px]">
                cd lens-ai-server && npm start
            </code>
            <button
                type="button"
                onClick={onRetry}
                className="font-bold text-finn-accent-blue hover:underline"
            >
                Check again
            </button>
        </p>
    );
}

export function Thinking({ children }: { children: ReactNode }) {
    return (
        <p role="status" className="flex items-center gap-2 text-xs font-bold text-finn-iron">
            <Spinner className="h-4 w-4 text-finn-accent-blue" />
            {children}
        </p>
    );
}
