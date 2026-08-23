export function MetricCard({
    label,
    value,
    helper,
    accent = false,
}: {
    label: string;
    value: number;
    helper: string;
    accent?: boolean;
}) {
    return (
        <div className="flex flex-1 flex-col items-center py-4 sm:py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-finn-iron">
                {label}
            </p>
            <p
                className={[
                    "mt-2 font-mono text-4xl font-bold tracking-[-0.02em] transition-colors duration-300 sm:text-5xl",
                    accent ? "text-finn-accent-blue" : "text-finn-highlight-navy",
                ].join(" ")}
            >
                {value}
            </p>
            <p className="mt-1 text-xs text-finn-iron">{helper}</p>
        </div>
    );
}