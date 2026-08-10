import { FINN_BASE_URL } from "./constants";
import type { PinnedFinnCar, AvailabilityType } from "./types";

export function createFullUrl(partialUrl: string) {
  return `${FINN_BASE_URL}${partialUrl}`;
}

function pluralize(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

const TIME_AGO_UNITS = [
  { seconds: 86_400, label: "day" },
  { seconds: 3_600, label: "hr" },
  { seconds: 60, label: "min" },
] as const;

export function calculateTimeAgo(isoString: string) {
  const pastTs = new Date(isoString).getTime();
  if (Number.isNaN(pastTs)) return "Just now";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - pastTs) / 1000));

  for (const { seconds, label } of TIME_AGO_UNITS) {
    const interval = Math.floor(elapsedSeconds / seconds);
    if (interval >= 1) return `${pluralize(interval, label)} ago`;
  }

  return "Just now";
}

export function calculateDiscount(newPrice: number | null, oldPrice: number | null) {
  const isValid =
    oldPrice != null &&
    newPrice != null &&
    Number.isFinite(newPrice) &&
    Number.isFinite(oldPrice) &&
    oldPrice > 0 &&
    newPrice < oldPrice;

  if (!isValid) return null;

  const amount = (oldPrice as number) - (newPrice as number);

  return {
    percentage: `${Math.round((amount / (oldPrice as number)) * 100)}%`,
    amount,
  };
}

export function getParamFromUrl(paramName: string) {
  return new URLSearchParams(window.location.search).get(paramName);
}

export function sortAndSlicePinnedCars(cars: Record<number, PinnedFinnCar> = {}) {
  return Object.values(cars).sort(
    (a, b) => Date.parse(b.pinnedAt) - Date.parse(a.pinnedAt)
  );
}

export function addTimeToDate(
  dateString: string,
  amount: number,
  duration: "hours" | "days" | "weeks" | "months" | "years"
) {
  if (!dateString || typeof amount !== "number") return;

  const date = new Date(dateString);

  switch (duration) {
    case "hours":
      date.setUTCHours(date.getUTCHours() + amount);
      break;
    case "days":
      date.setUTCDate(date.getUTCDate() + amount);
      break;
    case "weeks":
      date.setUTCDate(date.getUTCDate() + amount * 7);
      break;
    case "months":
      date.setUTCMonth(date.getUTCMonth() + amount);
      break;
    case "years":
      date.setUTCFullYear(date.getUTCFullYear() + amount);
      break;
    default:
      throw new Error(`Unsupported duration unit: ${duration}`);
  }

  return date.toISOString();
}

function getDayDifference(dateString: string) {
  const today = new Date();
  const target = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function getAvailabilityTime(dateString: string): { type: AvailabilityType; label: string } {
  const diffDays = getDayDifference(dateString);

  if (diffDays <= 0) return { type: "now", label: "Available now" };
  if (diffDays >= 28) return { type: "months", label: "In a month" };

  if (diffDays % 7 === 0) {
    return { type: "weeks", label: `In ${pluralize(diffDays / 7, "week")}` };
  }

  if (diffDays < 7) {
    return { type: "soon", label: `In ${pluralize(diffDays, "day")}` };
  }

  return {
    type: diffDays < 10 ? "days" : "weeks",
    label: `In ${diffDays} days`,
  };
}

export function formatIsoDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getUTCFullYear()}`;
}