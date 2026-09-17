import type {
    AskRequest,
    AskResult,
    ConverseRequest,
    ConverseResult,
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
    /** The model tried first, for the health check. */
    readonly model: string | null;
    interpret(request: InterpretRequest): Promise<Answered<InterpretResult>>;
    ask(request: AskRequest): Promise<Answered<AskResult>>;
    converse(request: ConverseRequest): Promise<Answered<ConverseResult>>;
}

/** A result, and which model actually produced it — not always the first. */
export interface Answered<T> {
    result: T;
    model: string | null;
}

/** A failure worth showing the reader in one sentence. */
export class AdapterError extends Error {
    readonly status: number;

    constructor(message: string, status = 502) {
        super(message);
        this.status = status;
    }
}
