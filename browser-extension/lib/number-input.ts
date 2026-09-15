/**
 * Reading an amount a reader typed, and writing one back into a field.
 *
 * The driving figures used to be `type="number"` inputs bound straight to the
 * number: `Number(value) || 0` on every keystroke. Clearing a field to type a
 * new price made it 0, React wrote "0" back into the box, and the reader's
 * next digit landed after it — and a reader in Germany, who writes a litre of
 * petrol as "1,75", couldn't type the figure the way it is on the pump sign.
 *
 * So the field keeps what is typed as text and only hands over a number once
 * the text is one. These two functions are that rule, kept out of the
 * component so it can be tested.
 */

/**
 * The amount a piece of typed text means, or null when it doesn't mean one.
 *
 * Accepts a dot or a comma as the decimal separator, and surrounding spaces.
 * Refuses anything negative, anything with two separators, and anything with
 * letters in it — a field half-way through being typed ("1,") is not yet an
 * amount, and nothing is committed until it is.
 */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();

  if (!/^\d+(?:[.,]\d*)?$|^[.,]\d+$/.test(trimmed)) return null;

  const value = Number(trimmed.replace(",", "."));

  return Number.isFinite(value) ? value : null;
}

/**
 * What a field shows for an amount.
 *
 * An optional field shows 0 as empty, because there 0 means "not set" — no
 * budget — rather than a figure of zero.
 */
export function formatAmount(value: number, optional = false): string {
  if (optional && value === 0) return "";

  return String(value);
}
