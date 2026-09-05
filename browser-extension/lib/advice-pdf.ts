import type { Options } from "react-to-pdf";

/**
 * Taking the advice away as a file.
 *
 * A recommendation is a thing people argue about with somebody else — a
 * partner, a housemate, whoever is paying half of it — and until now the only
 * way to show it to them was to sit them in front of this browser profile.
 * The page is already the whole argument in order, so the export is a
 * photograph of it rather than a second, print-shaped rendering of the same
 * facts. Two renderings of one argument is how the two start disagreeing.
 *
 * What the file must not carry is the parts of the page that only mean
 * something while it is on screen: the buttons that change the answers, and
 * the picker that chooses which rival to examine. Those are marked
 * `finn-lens-screen-only` and dropped for the capture — see the rule in
 * assets/tailwind.css. Whichever rival was in the hot seat when the reader
 * pressed the button is kept, because that comparison is part of what they
 * are taking away; when nothing is in it, nothing is added.
 */

/** Everything a filename may contain, once the car's name has been through it. */
const UNSAFE = /[^a-z0-9]+/g;

/**
 * `finn-lens-advice-byd-dolphin-2026-09-05.pdf`.
 *
 * The car and the date, because the two questions anyone asks of a file like
 * this months later are which car it was about and when it was true. Dates
 * are ISO so a folder of them sorts itself.
 */
export function adviceFileName(carName: string, on: Date = new Date()): string {
  const slug = carName.toLowerCase().replace(UNSAFE, "-").replace(/^-|-$/g, "");
  const day = [
    on.getFullYear(),
    `${on.getMonth() + 1}`.padStart(2, "0"),
    `${on.getDate()}`.padStart(2, "0"),
  ].join("-");

  return ["finn-lens-advice", slug, day].filter(Boolean).join("-") + ".pdf";
}

/**
 * How the capture is taken.
 *
 * A4 portrait with a small margin, and the page split across as many sheets
 * as it needs — the advice runs to a couple of thousand pixels and refusing
 * to paginate would either crop the argument or shrink it past reading.
 *
 * `useCORS` is what lets the car's photograph through: it comes from FINN's
 * own CDN, and without it html2canvas silently leaves a hole where the car
 * was. If the CDN declines, the rest of the page still exports — the photo
 * is the one thing in here the reader can get elsewhere.
 *
 * JPEG rather than PNG, at a resolution of 2. The page is mostly flat colour
 * and text, where the difference is invisible, and a PNG of six A4 pages at
 * this size runs to tens of megabytes.
 */
export function advicePdfOptions(filename: string): Options {
  return {
    filename,
    method: "save",
    resolution: 2,
    page: { format: "a4", orientation: "portrait", margin: 8 },
    canvas: { mimeType: "image/jpeg", qualityRatio: 0.92, useCORS: true },
    overrides: {
      canvas: {
        useCORS: true,
        /* The page's own ground, so margins don't come out black. */
        backgroundColor: "#f8f8f8",
        /* Long enough for a CDN image, short enough not to hang the button. */
        imageTimeout: 6000,
        logging: false,
      },
    },
  };
}
