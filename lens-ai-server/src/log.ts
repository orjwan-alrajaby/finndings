/**
 * Development logging: one line per request with token usage, plus the raw
 * model output when `LENS_AI_DEBUG=1`. Request bodies are never logged whole —
 * they carry the reader's own words and their shortlist.
 */

const debugOn = process.env.LENS_AI_DEBUG === "1";
const stamp = () => new Date().toISOString().slice(11, 23);

export const log = {
    info(...parts: unknown[]) {
        console.log(stamp(), ...parts);
    },

    error(route: string, ...parts: unknown[]) {
        console.error(stamp(), `✕ ${route}`, ...parts);
    },

    debug(route: string, label: string, value: unknown) {
        if (!debugOn) return;
        console.log(stamp(), `· ${route} ${label}:`, typeof value === "string" ? value : JSON.stringify(value, null, 2));
    },
};
