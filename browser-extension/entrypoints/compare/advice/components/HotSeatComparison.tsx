import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { PinnedFinnCar } from "@/lib/types";
import type {
    ChallengeLine,
    ChallengeReasoning,
} from "@/lib/reasoning-engine/narrative";
import { challengeRows, phraseLabel } from "@/lib/reasoning-engine/narrative";
import { joinList } from "@/lib/reasoning-engine";

/**
 * One alternative, weighed against the recommendation.
 *
 * The heading is deliberately "challenger vs winner" and never the other way
 * round: once a recommendation exists, the only decision on the table is
 * whether to swap, and every sentence here answers that.
 *
 * The two sides used to sit in facing columns, one list of gains beside one
 * list of losses. They read as two separate things because they were: a
 * priority appears in exactly one of them, so nothing lined up across the
 * gap and there was no way to scan the comparison as a whole. The reader's
 * actual question — "are the things I'd give up ranked above the things I'd
 * gain?" — had to be answered by holding both columns in your head at once.
 *
 * So they are one table now, running down the reader's own priority order,
 * with the side each row falls on shown rather than implied. The rank column
 * is the spine: seeing #1 and #2 lean one way and #4 and #5 the other is the
 * whole decision, available before a word is read.
 *
 * All prose is composed by the narrative layer from established facts. This
 * component lays it out and does no reasoning of its own.
 */
export function HotSeatComparison({
    reasoning,
    challenger,
}: {
    reasoning: ChallengeReasoning;
    challenger: PinnedFinnCar;
}) {
    const { challengerName, winnerName, unseparated } = reasoning;

    const rows = challengeRows(reasoning);

    return (
        /*
          * Grey on purpose, where the sections around it are coloured. This
          * one's whole content is a blue side and an amber side, and a
          * tinted field behind them would put a thumb on one of the scales.
          */
        <section className="rounded-[28px] bg-finn-cotton p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                In the hot seat
            </p>

            <h2 className="mt-2 text-2xl font-black">
                {challengerName} vs {winnerName}
            </h2>

            <p className="mt-2 text-sm leading-6 text-finn-iron">
                What you'd gain and lose by taking {challengerName} instead.
            </p>

            {rows.length === 0 ? (
                <p className="mt-5 rounded-[22px] bg-white p-5 text-sm leading-6 text-finn-iron">
                    Nothing you ranked separates {challengerName} from{" "}
                    {winnerName}. Neither car beats the other on any of your
                    priorities by enough to be worth reporting.
                </p>
            ) : (
                <>
                    <Balance
                        rows={rows}
                        challengerName={challengerName}
                        winnerName={winnerName}
                    />

                    <Table rows={rows} />
                </>
            )}

            {/*
              * Only alongside a table. With no rows at all the message above
              * has already said this, and naming all five priorities under it
              * is the same finding at four times the length.
              */}
            {rows.length > 0 && unseparated.length > 0 && (
                <p className="mt-3 text-xs leading-5 text-finn-iron">
                    Your{" "}
                    {joinList(
                        unseparated.map((item) => `#${item.rank} ${item.label}`),
                    )}{" "}
                    {unseparated.length === 1 ? "isn't" : "aren't"} in the table:
                    nothing in the data separates the two cars there by enough
                    to be worth reporting.
                </p>
            )}

            {(reasoning.cost || reasoning.budget) && (
                <div className="mt-4 space-y-2 rounded-[22px] bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                        What it costs
                    </p>

                    {reasoning.cost && (
                        <p className="text-sm leading-6 text-finn-black">
                            {reasoning.cost}
                        </p>
                    )}

                    {reasoning.budget && (
                        <p className="text-sm leading-6 text-finn-iron">
                            {reasoning.budget}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-4 rounded-[22px] bg-finn-pale-blue p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                    Why {winnerName} is still the recommendation
                </p>

                <p className="mt-1.5 text-sm leading-6 text-finn-highlight-navy">
                    {reasoning.verdict}
                </p>
            </div>

            {/*
              * Only when there is somewhere to go, the same as the hero.
              * FINN doesn't supply a URL for every car — a card built from
              * markup rather than from a response we saw carries an empty
              * one — and `href=""` resolves to the page it is on, so this
              * button would silently reload the advice and throw away the
              * hot seat it belongs to.
              */}
            {challenger.url && (
                <a
                    href={challenger.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-finn-cotton px-5 py-3 text-xs font-black text-finn-black transition hover:border-finn-iron/40"
                >
                    View {challengerName} on FINN
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
            )}
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* The answer, before the reading                                             */
/* -------------------------------------------------------------------------- */

/**
 * Which ranks fall on which side, as two facing sets of chips.
 *
 * The one thing a reader wants from this section in the first second: did
 * the swap cost me the priorities I put at the top? Ranks are the only
 * quantity used, because ranks are the only quantity the reader gave us —
 * anything else here would be a score wearing a different hat.
 */
function Balance({
    rows,
    challengerName,
    winnerName,
}: {
    rows: ChallengeLine[];
    challengerName: string;
    winnerName: string;
}) {
    const gains = rows.filter((row) => row.favours === "challenger");
    const losses = rows.filter((row) => row.favours === "winner");

    return (
        <div className="mt-5 grid gap-px overflow-hidden rounded-[22px] bg-white sm:grid-cols-2">
            <Side
                title="You'd gain"
                subject={challengerName}
                lines={gains}
                empty={`${challengerName} doesn't beat ${winnerName} anywhere you ranked.`}
                tone="gain"
            />

            <Side
                title="You'd give up"
                subject={winnerName}
                lines={losses}
                empty={`${winnerName} doesn't beat ${challengerName} anywhere you ranked.`}
                tone="loss"
            />
        </div>
    );
}

function Side({
    title,
    subject,
    lines,
    empty,
    tone,
}: {
    title: string;
    subject: string;
    lines: ChallengeLine[];
    empty: string;
    tone: "gain" | "loss";
}) {
    const gain = tone === "gain";

    return (
        <div className={gain ? "bg-finn-pale-blue p-5" : "bg-finn-warning/15 p-5"}>
            <p
                className={[
                    "text-[10px] font-black uppercase tracking-[0.14em]",
                    gain ? "text-finn-accent-blue" : "text-finn-warning-deep",
                ].join(" ")}
            >
                {title}
            </p>

            {lines.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-finn-iron">{empty}</p>
            ) : (
                <>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {lines.map((line) => (
                            <span
                                key={line.priority}
                                className={[
                                    "rounded-full px-2 py-0.5 text-[11px] font-black text-white",
                                    gain
                                        ? "bg-finn-accent-blue"
                                        : "bg-finn-warning-deep",
                                ].join(" ")}
                            >
                                #{line.rank}
                            </span>
                        ))}
                    </div>

                    <p className="mt-2 text-xs leading-5 text-finn-iron">
                        {subject} is stronger on{" "}
                        {joinList(lines.map((line) => phraseLabel(line.label)))}
                        .
                    </p>
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The reading                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Every separated priority, in the reader's order, with its evidence.
 *
 * A grid rather than a `<table>`, for one reason: the third column is prose
 * the reader is meant to read, not a value they are meant to scan, and a
 * table forces that prose into a cell that has to survive a phone. This
 * collapses to stacked rows below `sm` and holds its columns above it, which
 * is the behaviour a table would need anyway.
 */
function Table({ rows }: { rows: ChallengeLine[] }) {
    return (
        /*
          * A white panel on the section's grey, so the rows inside it can
          * carry their side's colour and still read as one table.
          */
        <div className="mt-4 overflow-hidden rounded-[22px] bg-white p-4 sm:p-5">
            <div className="hidden gap-4 border-b border-finn-cotton pb-2 pl-3 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron sm:grid sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                <span>Your priority · stronger here</span>
                <span>What separates them</span>
            </div>

            <div className="mt-1 space-y-1">
                {rows.map((row) => (
                    <Row key={row.priority} row={row} />
                ))}
            </div>
        </div>
    );
}

function Row({ row }: { row: ChallengeLine }) {
    const gain = row.favours === "challenger";

    return (
        <div
            className={[
                "grid gap-x-4 gap-y-2 rounded-r-xl border-l-4 py-3 pl-3 pr-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]",
                /*
                  * The side is now the row's ground as well as its edge. A
                  * bar alone made the reader trace a thin line down the
                  * page to answer "which way does this one go?"; a tinted
                  * row answers it from across the room.
                  */
                gain
                    ? "border-l-finn-accent-blue bg-finn-pale-blue/70"
                    : "border-l-finn-warning bg-finn-warning/10",
            ].join(" ")}
        >
            <div>
                <p className="flex items-baseline gap-2">
                    <span className="text-[11px] font-black text-finn-iron">
                        #{row.rank}
                    </span>

                    <span className="text-xs font-black text-finn-black">
                        {row.label}
                    </span>
                </p>

                {/*
                  * Which car, and which direction, said in words as well as
                  * in the colour down the edge. A row whose meaning is
                  * carried by hue alone is a row half the readers can't use.
                  */}
                <p className="mt-1.5">
                    <span
                        className={[
                            "inline-block rounded-full px-2.5 py-1 text-[11px] font-black leading-4",
                            gain
                                ? "bg-white text-finn-accent-blue"
                                : "bg-white text-finn-warning-deep",
                        ].join(" ")}
                    >
                        {row.favoursName}
                    </span>
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-finn-iron">
                    {gain ? "you'd gain here" : "you'd give this up"}
                </p>
            </div>

            <div>
                <p className="text-sm leading-6 text-finn-black">
                    {row.evidence}
                </p>

                <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                    {row.relevance}
                </p>
            </div>
        </div>
    );
}
