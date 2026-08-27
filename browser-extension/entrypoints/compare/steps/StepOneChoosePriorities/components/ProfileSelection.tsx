import { useState } from "react";
import {
    CheckBadgeIcon,
    ChevronDownIcon,
    InformationCircleIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";
import {
    CATEGORIES,
    FEATURES,
    TIERS,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureTier,
    FeatureWeight,
    Profile,
} from "@/lib/reasoning-engine/types";

const TIER_COLORS: Record<
    FeatureTier,
    {
        text: string;
        bg: string;
        border: string;
        square: string;
    }
> = {
    essential: {
        text: "text-green-700",
        bg: "bg-green-50/70",
        border: "border-green-100",
        square: "bg-green-500",
    },
    good: {
        text: "text-amber-700",
        bg: "bg-amber-50/70",
        border: "border-amber-100",
        square: "bg-amber-400",
    },
    luxury: {
        text: "text-finn-accent-blue",
        bg: "bg-finn-accent-blue/5",
        border: "border-finn-accent-blue/10",
        square: "bg-finn-accent-blue",
    },
};

const TIER_EXPLANATIONS: Record<FeatureTier, string> = {
    essential:
        "Features in this group matter most when we score this category.",
    good:
        "Features in this group are useful and improve the score, but aren't as important as the essentials.",
    luxury:
        "These are nice extras. They improve the score, but have a smaller influence on the result.",
};

export function FeatureChip({
    feature,
    size = "sm",
}: {
    feature: FeatureWeight;
    size?: "sm" | "md";
}) {
    const explanation = FEATURES[feature.key].explanation;

    return (
        <div
            className={[
                "group inline-flex max-w-full items-center gap-1 rounded-full border font-bold",
                TIER_COLORS[feature.tier].bg,
                TIER_COLORS[feature.tier].border,
                TIER_COLORS[feature.tier].text,
                size === "sm"
                    ? "px-2 py-1 text-[10px]"
                    : "px-2.5 py-1.5 text-[11px]",
            ].join(" ")}
        >
            <span className="truncate">
                {FEATURES[feature.key].label}
            </span>

            {explanation && (
                <FeatureInfo
                    feature={feature}
                    explanation={explanation}
                    size={size}
                />
            )}
        </div>
    );
}

function FeatureInfo({
    feature,
    explanation,
    size = "sm",
}: {
    feature: FeatureWeight;
    explanation: string;
    size?: "sm" | "md";
}) {
    const [open, setOpen] = useState(false);
    const label = FEATURES[feature.key].label;

    return (
        <span className="relative shrink-0">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((current) => !current);
                }}
                className={[
                    "flex items-center justify-center rounded-full transition-colors hover:bg-black/5",
                    size === "sm" ? "h-4 w-4" : "h-5 w-5",
                ].join(" ")}
                aria-label={`What is ${label}?`}
                aria-expanded={open}
            >
                <InformationCircleIcon
                    className={
                        size === "sm"
                            ? "h-3.5 w-3.5"
                            : "h-4 w-4"
                    }
                />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-finn-snow bg-white p-3 text-left shadow-lg"
                    onClick={(event) => event.stopPropagation()}
                >
                    <p className="text-[11px] font-black text-finn-black">
                        {label}
                    </p>

                    <p className="mt-1.5 text-[11px] leading-5 text-finn-iron">
                        {explanation}
                    </p>
                </div>
            )}
        </span>
    );
}

function TierLegend({
    activeTier,
    onSelect,
}: {
    activeTier: FeatureTier | null;
    onSelect: (tier: FeatureTier) => void;
}) {
    const tiers: FeatureTier[] = [
        "essential",
        "good",
        "luxury",
    ];

    return (
        <div className="flex items-center justify-end gap-1.5">
            {tiers.map((tier) => {
                const colors = TIER_COLORS[tier];
                const active = activeTier === tier;
                const label = TIERS[tier].label;

                return (
                    <div key={tier} className="relative">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelect(tier);
                            }}
                            className={[
                                "h-3 w-3 rounded-[3px] transition-all",
                                colors.square,
                                active
                                    ? "scale-125 shadow-[0_0_0_2px_white,0_0_0_3px_rgba(0,0,0,0.15)]"
                                    : "opacity-80 hover:scale-110 hover:opacity-100",
                            ].join(" ")}
                            aria-label={`About ${label} features`}
                            aria-expanded={active}
                        />

                        {active && (
                            <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-finn-snow bg-white p-3 text-left shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={[
                                            "h-2.5 w-2.5 rounded-[3px]",
                                            colors.square,
                                        ].join(" ")}
                                    />

                                    <p className="text-[11px] font-black text-finn-black">
                                        {label}
                                    </p>
                                </div>

                                <p className="mt-1.5 text-[11px] leading-5 text-finn-iron">
                                    {TIER_EXPLANATIONS[tier]}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ProfilePriority({
    categoryId,
    index,
    active,
    expanded,
    features,
    onToggle,
}: {
    categoryId: CategoryId;
    index: number;
    active: boolean;
    expanded: boolean;
    /** What Lens will actually look at — the user's enabled set, not the defaults. */
    features: FeatureWeight[];
    onToggle: () => void;
}) {
    const meta = CATEGORIES[categoryId];

    const [activeTier, setActiveTier] = useState<FeatureTier | null>(
        null,
    );

    const groups: Record<FeatureTier, FeatureWeight[]> = {
        essential: [],
        good: [],
        luxury: [],
    };

    features.forEach((feature) => {
        groups[feature.tier].push(feature);
    });

    const handleTierSelect = (tier: FeatureTier) => {
        setActiveTier((current) =>
            current === tier ? null : tier,
        );
    };

    return (
        <div
            className={[
                "rounded-xl",
                expanded
                    ? "border border-finn-accent-blue/50 bg-finn-accent-blue/10"
                    : "",
            ].join(" ")}
        >
            <button
                type="button"
                onClick={onToggle}
                className={[
                    "flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition-colors",
                    expanded
                        ? "bg-finn-accent-blue/20"
                        : "hover:bg-finn-snow/70",
                ].join(" ")}
            >
                <span
                    className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                        active ? "text-white" : "text-finn-iron",
                        active
                            ? index === 0
                                ? "bg-finn-accent-blue"
                                : index === 1
                                    ? "bg-finn-accent-blue/85"
                                    : index === 2
                                        ? "bg-finn-accent-blue/70"
                                        : index === 3
                                            ? "bg-finn-accent-blue/55"
                                            : "bg-finn-accent-blue/40"
                            : "bg-finn-iron/15",
                    ].join(" ")}
                >
                    {index + 1}
                </span>

                <span className="shrink-0 text-base">
                    {meta.icon}
                </span>

                <span className="min-w-0 flex-1 text-xs font-bold text-finn-black">
                    {meta.label}
                </span>

                <ChevronDownIcon
                    className={[
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        expanded
                            ? "rotate-180 text-finn-accent-blue/80"
                            : "text-finn-iron",
                    ].join(" ")}
                />
            </button>

            {expanded && (
                <div className="px-2 pb-3 pt-2">
                    <div className="rounded-xl bg-white p-3">
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-xs font-black text-finn-black">
                                What we look at
                            </p>

                            <TierLegend
                                activeTier={activeTier}
                                onSelect={handleTierSelect}
                            />
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-finn-iron">
                            {meta.description}
                        </p>

                        {features.length > 0 ? (
                            <div className="mt-3 space-y-3">
                                {(
                                    [
                                        "essential",
                                        "good",
                                        "luxury",
                                    ] as FeatureTier[]
                                ).map((tier) => {
                                    if (
                                        groups[tier].length === 0
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <div key={tier}>
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <span
                                                    className={[
                                                        "h-2 w-2 rounded-xs",
                                                        TIER_COLORS[
                                                            tier
                                                        ].square,
                                                    ].join(" ")}
                                                />

                                                <p
                                                    className={[
                                                        "text-[10px] font-black",
                                                        TIER_COLORS[
                                                            tier
                                                        ].text,
                                                    ].join(" ")}
                                                >
                                                    {TIERS[tier].label}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {groups[tier].map(
                                                    (feature) => (
                                                        <FeatureChip
                                                            key={
                                                                feature.key
                                                            }
                                                            feature={
                                                                feature
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="mt-3 text-[11px] italic text-finn-iron">
                                This category is based on vehicle-level
                                data rather than individual features.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ProfileCard({
    profile,
    active,
    isDefault,
    categoryFeatures,
    onSelect,
}: {
    profile: Profile;
    active: boolean;
    isDefault: boolean;
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
    onSelect: () => void;
}) {
    const [expandedPriority, setExpandedPriority] = useState<
        CategoryId | null
    >(null);

    const togglePriority = (categoryId: CategoryId) => {
        setExpandedPriority((current) =>
            current === categoryId ? null : categoryId,
        );
    };

    return (
        <div className="mb-4 break-inside-avoid">
            <div
                className={[
                    "rounded-[28px] bg-white p-5 transition-all",
                    active
                        ? "shadow-[0_0_0_2px] shadow-finn-accent-blue"
                        : "shadow-sm hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
            >
                {/* Profile */}
                <button
                    type="button"
                    onClick={onSelect}
                    className="group w-full text-left"
                >
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">
                            {profile.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={[
                                        "text-sm font-black",
                                        active
                                            ? "text-finn-accent-blue"
                                            : "text-finn-black",
                                    ].join(" ")}
                                >
                                    {profile.label}
                                </span>

                                {active && (
                                    <CheckBadgeIcon className="h-5 w-5 shrink-0 text-finn-accent-blue" />
                                )}

                                {isDefault && !active && (
                                    <span className="rounded-full bg-finn-cotton px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-finn-iron">
                                        Your default
                                    </span>
                                )}
                            </div>

                            <p
                                className={[
                                    "mt-1.5 text-xs leading-5",
                                    active
                                        ? "text-finn-black"
                                        : "text-finn-iron",
                                ].join(" ")}
                            >
                                {profile.forWhom}
                            </p>
                        </div>
                    </div>
                </button>

                {/* Priorities */}
                <div className="mt-5 border-t border-finn-cotton pt-4">
                    <p
                        className={[
                            "mb-2 text-[10px] font-black uppercase tracking-[0.14em]",
                            active
                                ? "text-finn-accent-blue"
                                : "text-finn-iron",
                        ].join(" ")}
                    >
                        {active ? "your" : "profile"} priorities
                    </p>

                    <div className="space-y-1.5">
                        {profile.priorities
                            .map((categoryId, index) => (
                                <ProfilePriority
                                    key={categoryId}
                                    categoryId={categoryId}
                                    index={index}
                                    active={active}
                                    features={
                                        categoryFeatures[
                                            categoryId
                                        ] ?? []
                                    }
                                    expanded={
                                        expandedPriority ===
                                        categoryId
                                    }
                                    onToggle={() =>
                                        togglePriority(categoryId)
                                    }
                                />
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProfileSelection({
    profiles,
    activeProfileId,
    defaultProfileId,
    categoryFeatures,
    onSelect,
    onSettings,
    onChooseCustom,
}: {
    /** Enabled profiles only — a disabled profile isn't offered. */
    profiles: Profile[];
    activeProfileId: string | null;
    /** The one Lens starts you on. Marked, so the badge means something. */
    defaultProfileId: string | null;
    /** The user's enabled features, so a card shows what Lens will really check. */
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
    onSelect: (profile: Profile) => void;
    onSettings: () => void;
    onChooseCustom: () => void;
}) {
    return (
        <section>
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-finn-black">
                        Choose a profile
                    </p>

                    <p className="mt-0.5 text-xs text-finn-iron">
                        Each profile is five priorities in a fixed order.
                        Pick one as a starting point — you can reorder them
                        in the next step, and anything you change is what
                        Lens actually uses.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onSettings}
                    className="flex shrink-0 items-center gap-1 text-xs font-bold text-finn-accent-blue transition hover:text-finn-highlight-navy"
                >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                    Manage profiles
                </button>
            </div>

            {/* Masonry */}
            <div className="columns-1 gap-4 md:columns-2 lg:columns-3">
                {profiles.map((profile) => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        active={activeProfileId === profile.id}
                        isDefault={profile.id === defaultProfileId}
                        categoryFeatures={categoryFeatures}
                        onSelect={() => onSelect(profile)}
                    />
                ))}
            </div>

            <div className="mt-5 flex justify-center">
                <button
                    type="button"
                    onClick={onChooseCustom}
                    className="text-xs font-bold text-finn-iron transition hover:text-finn-accent-blue"
                >
                    I'd rather choose my own priorities →
                </button>
            </div>
        </section>
    );
}