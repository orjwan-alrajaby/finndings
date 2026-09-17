import type {
    AskRequest,
    AskResult,
    InterpretRequest,
    InterpretResult,
} from "../../../browser-extension/lib/lens-ai/contract.ts";

/**
 * The seam between Lens and whoever answers.
 *
 * Two jobs, both translation. A provider implements these and nothing else;
 * swapping one never touches the extension, and the extension never learns
 * which it is talking to beyond a name in the logs.
 */
export interface LensAiAdapter {
    readonly name: string;
    readonly model: string | null;
    interpret(request: InterpretRequest): Promise<InterpretResult>;
    ask(request: AskRequest): Promise<AskResult>;
}

/** A failure worth showing the reader in one sentence. */
export class AdapterError extends Error {
    readonly status: number;

    constructor(message: string, status = 502) {
        super(message);
        this.status = status;
    }
}
