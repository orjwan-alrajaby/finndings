import { useEffect, useState, type InputHTMLAttributes } from "react";

import { formatAmount, parseAmount } from "@/lib/number-input";

/**
 * A field for an amount — a price, a distance, a budget — that lets the reader
 * type it however they type it.
 *
 * It holds what is typed as text and hands the number over only once the text
 * is one, so:
 *
 * - **Clearing a field to retype it is fine.** It used to write 0 back into
 *   the box the moment it was empty, so the next digit landed after a zero.
 *   While a required field is empty, the value in effect stays in effect and
 *   shows as the placeholder; leave the field empty and it comes back.
 * - **"1,75" is a price.** A comma works as the decimal separator, which is
 *   how a litre of petrol is written on every pump sign in Germany. It reads
 *   back with a dot, like every other figure Lens writes.
 * - **Nonsense is marked, not zeroed.** Text that isn't an amount is
 *   `aria-invalid` until it is fixed or the field is left, when the last good
 *   value returns.
 *
 * `optional` is for a field where empty is itself an answer — the budget,
 * where empty means no limit — so there an empty field commits 0.
 *
 * Text rather than `type="number"`, deliberately: a number input reports ""
 * for "1," in most browsers, hides what was typed from the code reading it,
 * and scrolls the value when a mouse wheel passes over it.
 */
export function NumberInput({
    value,
    onChange,
    optional = false,
    placeholder,
    onBlur,
    ...rest
}: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "inputMode"
> & {
    value: number;
    onChange: (value: number) => void;
    optional?: boolean;
}) {
    const [draft, setDraft] = useState(() => formatAmount(value, optional));

    /*
     * Follows the value when it changes from somewhere else — "Use my saved
     * values", "Restore defaults" — without overwriting a draft that already
     * means it. "0." is still 0 while it is being typed into 0.35.
     */
    useEffect(() => {
        setDraft((current) => {
            if (parseAmount(current) === value) return current;
            if (optional && value === 0 && current.trim() === "") return current;

            return formatAmount(value, optional);
        });
    }, [value, optional]);

    const empty = draft.trim() === "";
    const invalid = !empty && parseAmount(draft) == null;

    return (
        <input
            {...rest}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft}
            placeholder={
                optional ? placeholder : (placeholder ?? formatAmount(value))
            }
            aria-invalid={invalid || undefined}
            onChange={(event) => {
                const next = event.target.value;

                setDraft(next);

                const amount = parseAmount(next);

                if (amount != null) onChange(amount);
                else if (optional && next.trim() === "") onChange(0);
            }}
            onBlur={(event) => {
                /*
                 * Left empty or unreadable, the field shows the value that is
                 * actually in effect again. Left readable, it reads back the
                 * way Lens writes numbers: "1,75" becomes "1.75".
                 */
                setDraft(formatAmount(value, optional));

                onBlur?.(event);
            }}
        />
    );
}
