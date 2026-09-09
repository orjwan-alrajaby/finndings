/**
 * A car, drawn rather than photographed.
 *
 * Two surfaces need one: the setup flow's mock of a finn.com listing, whose
 * three cars are invented and must never carry a photograph, and the pinned
 * set, where a car FINN published no thumbnail for would otherwise leave a
 * hole in a grid built around photographs.
 *
 * **Drawn to be seen.** It was first stroked in `finn-cotton` on a `finn-snow`
 * ground, which is a 1.04:1 contrast ratio — technically a car, visually an
 * empty grey rectangle, and an empty rectangle is what a card whose photo
 * failed to load looks like. It carries a filled body under a darker outline
 * now, and the colour is the caller's: on the pale blue ground both surfaces
 * use, `text-finn-accent-blue/30` reads without competing with anything on
 * top of it.
 */
export function CarSilhouette({ className = "" }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 120 48"
            fill="none"
            className={className}
        >
            {/* The body, filled first so the outline reads as its edge. */}
            <path
                d="M10 34v-8a4 4 0 0 1 3-3.9l12-3 10-8.6A8 8 0 0 1 40.2 8h26.5a8 8 0 0 1 5 1.8l13.5 11 15.8 3.4a5 5 0 0 1 4 4.9V34Z"
                fill="currentColor"
                fillOpacity="0.16"
            />

            <path
                d="M8 34h104M14 34a6 6 0 1 0 12 0 6 6 0 1 0-12 0M94 34a6 6 0 1 0 12 0 6 6 0 1 0-12 0"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M10 34v-8a4 4 0 0 1 3-3.9l12-3 10-8.6A8 8 0 0 1 40.2 8h26.5a8 8 0 0 1 5 1.8l13.5 11 15.8 3.4a5 5 0 0 1 4 4.9V34"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* The door line and the glasshouse, so it reads as a car rather
                than a wedge. */}
            <path
                d="M38 11.5v9.8m-14 0h58"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
            />
        </svg>
    );
}
