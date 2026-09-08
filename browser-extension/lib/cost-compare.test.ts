import { describe, expect, it } from "vitest";

import { compareCosts } from "./cost-copy";
import type { CostAnalysis, CostLine } from "./reasoning-engine/types";

/**
 * Putting one car's bill next to another's.
 *
 * The advice page answers "what would you gain, what would you give up" for
 * every priority the reader ranked, and used to drop that framing for the
 * money: a car in the hot seat replaced the recommendation's cost figures
 * rather than being set against them.
 *
 * Two things this has to get right, and both are about not overclaiming. A
 * difference the inputs cannot support must not be reported as a distinction,
 * and a line that could not be priced must be shown as unknown rather than
 * left out — a table of only the differences invites the reader to assume
 * everything absent was checked and found equal.
 */
const line = (
  id: CostLine["id"],
  amount: number | null,
  available = amount != null,
): CostLine => ({
  id,
  label: id,
  amount,
  available,
  source: "estimate",
  explanation: "",
  facts: [],
});

const analysis = (
  amounts: Partial<Record<CostLine["id"], number | null>>,
  complete = true,
): CostAnalysis =>
  ({
    vehicleId: 1,
    vehicleName: "Car",
    lines: (["subscription", "energy", "excessMileage"] as const).map((id) =>
      line(id, amounts[id] ?? null),
    ),
    breakdown: {
      totalMonthly: Object.values(amounts).reduce<number>(
        (sum, value) => sum + (value ?? 0),
        0,
      ),
      complete,
    },
  }) as unknown as CostAnalysis;

const rowFor = (rows: ReturnType<typeof compareCosts>, id: string) =>
  rows.find((row) => row.id === id);

describe("compareCosts", () => {
  it("calls the cheaper side a gain for the car being considered", () => {
    const rows = compareCosts(
      analysis({ subscription: 400 }),
      analysis({ subscription: 500 }),
    );

    expect(rowFor(rows, "subscription")?.favours).toBe("subject");
    expect(rowFor(rows, "subscription")?.difference).toBe(-100);
  });

  it("calls the dearer side something the reader would give up", () => {
    const rows = compareCosts(
      analysis({ energy: 90 }),
      analysis({ energy: 50 }),
    );

    expect(rowFor(rows, "energy")?.favours).toBe("against");
  });

  /*
   * These are estimates built from a consumption figure and a price per kWh.
   * Reporting that one car costs 40 cents more a month is precision the
   * inputs cannot carry — it reads as a distinction when it is noise.
   */
  it("treats a difference under a euro as level, not as a saving", () => {
    const rows = compareCosts(
      analysis({ energy: 50.4 }),
      analysis({ energy: 50 }),
    );

    expect(rowFor(rows, "energy")?.favours).toBe("level");
  });

  it("reports a line it cannot price as unknown rather than dropping it", () => {
    const rows = compareCosts(
      analysis({ energy: null }),
      analysis({ energy: 50 }),
    );

    const row = rowFor(rows, "energy");

    expect(row).toBeDefined();
    expect(row?.favours).toBe("unknown");
    expect(row?.difference).toBeNull();
  });

  it("keeps every line, so nothing absent reads as checked and equal", () => {
    const rows = compareCosts(analysis({ subscription: 400 }), analysis({}));

    expect(rows.map((row) => row.id)).toEqual([
      "subscription",
      "energy",
      "excessMileage",
      "total",
    ]);
  });

  /*
   * Two partial totals differ by whatever each happens to be missing, so a
   * chip reading "€80 cheaper" off them would report a gap in FINN's data as
   * a saving.
   */
  it("refuses to compare totals when either estimate is incomplete", () => {
    const rows = compareCosts(
      analysis({ subscription: 400 }, false),
      analysis({ subscription: 500 }, true),
    );

    expect(rowFor(rows, "total")?.favours).toBe("unknown");
  });

  it("compares totals when both are whole", () => {
    const rows = compareCosts(
      analysis({ subscription: 400, energy: 50 }),
      analysis({ subscription: 500, energy: 50 }),
    );

    expect(rowFor(rows, "total")?.favours).toBe("subject");
    expect(rowFor(rows, "total")?.difference).toBe(-100);
  });
});
