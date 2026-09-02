/**
 * The steps, in the order they are walked.
 *
 * `priorities` used to be two — one screen to choose them and another to put
 * them in order — and `assumptions` used to be the second half of
 * `preferences`. Both changed for the same reason: a step should ask one
 * question, and "what matters to you, in what order" is one question, while
 * "what should count extra inside a priority" and "what does your driving
 * cost" are two.
 */
export type CompareStep =
    | "priorities"
    | "preferences"
    | "assumptions"
    | "advice";
