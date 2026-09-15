import { formatEUR, formatNumber } from "@/lib/reasoning-engine";
import type { FitPriority } from "@/lib/reasoning-engine/fit";
import type { FinnCar } from "@/lib/types";

/**
 * How a car and its verdict are named, wherever they are shown.
 *
 * These lived in the in-page panel, which was the only surface that showed
 * them. There are now three — the panel, the pinned-cars page, and the
 * analysis on it — and a car labelled two ways is a car the reader has to
 * check is the same car. Moved here rather than exported from the panel
 * because that module reaches for the DOM at import time and an extension
 * page cannot have it.
 */

/**
 * Which configuration this is.
 *
 * FINN sells a Dolphin Surf as a Boost with 88 PS and as a Comfort with 156
 * PS, and the whole analysis changes between them. Every surface labels a
 * configuration with these same two lines, so a reader who picks one and
 * then reads two screens of prose never has to wonder which car it is about.
 */
export function configurationName(car: FinnCar): string {
    const named = [car.trim, car.equipmentLine].filter(Boolean).join(" ");

    return named || car.engine || `Configuration ${car.id}`;
}

/** The figures a reader tells configurations apart by. */
export function configurationDetail(
    car: FinnCar,
    {
        withPrice = true,
        withPower = true,
        withFuel = true,
    }: {
        /**
         * Drop the price where the surface already shows it. The pinned list
         * gives every car its price in its own column, and repeating it inside
         * the spec line spends the row's remaining width saying it twice.
         *
         * The in-page panel drops it for a different reason: it is standing on
         * FINN's own listing, where the reader has just read that number. A
         * panel that opens by repeating the page behind it has spent its first
         * line saying nothing.
         */
        withPrice?: boolean;
        /**
         * Same again for PS. It is here at all because two configurations of
         * one model can differ by power alone, and a reader choosing between
         * them needs to see it — but the panel is opened *from* a card, so
         * that choice is already made, and horsepower has no part in anything
         * the panel goes on to say.
         *
         * The cost of dropping it: two configurations distinguished only by
         * power read identically in the panel's subtitle. The photograph, the
         * trim name above it and the analysis below are all still that car's.
         */
        withPower?: boolean;
        /**
         * Drop the fuel type where the surface gives it a place of its own.
         * The panel does: what a car runs on decides which cohort its
         * consumption is judged against, so it belongs beside that judgement
         * rather than buried mid-way through a line of specs.
         */
        withFuel?: boolean;
    } = {},
): string {
    const range =
        car.electric?.range != null && car.electric.range !== "Unknown"
            ? `${formatNumber(Number(car.electric.range))} km range`
            : null;

    const price = car.pricing?.customerMonthly?.price;

    return [
        withPower && car.power?.inHp ? `${car.power.inHp} PS` : null,
        withFuel ? car.fuelType : null,
        range,
        withPrice && price ? `from ${formatEUR(price)}/mo` : null,
    ]
        .filter(Boolean)
        .join(" · ");
}

/**
 * What one priority's band was measured on, in one line.
 *
 * Two different counts, kept apart: how many of the reader's own picks the
 * car has, and how much of the category's catalogue it carries. The first is
 * what they asked for and the second is what the score counted.
 */
export function describeCoverage(priority: FitPriority): string {
    /*
     * The environmental line carries the car's own figure rather than a note
     * about how the priority works. Every other priority's subtitle says
     * something about this car — "3 of your 5 picks" — and "judged on
     * emissions, not on equipment" said something about Finn Lens instead,
     * in the one place a reader is scanning for the car.
     */
    if (priority.impact) {
        return (
            priority.impact.co2?.display ??
            "FINN doesn't publish a CO₂ figure for this one"
        );
    }

    if (priority.band.level === "unknown") {
        return "Equipment not listed by FINN";
    }

    const picks = priority.picked.length;

    const held = priority.picked.filter(
        (feature) => feature.state === "present",
    ).length;

    const catalogue = `${priority.covered} of ${priority.catalogueSize} features it covers`;

    return picks
        ? `${held} of your ${picks} pick${picks === 1 ? "" : "s"} · ${catalogue}`
        : catalogue;
}
