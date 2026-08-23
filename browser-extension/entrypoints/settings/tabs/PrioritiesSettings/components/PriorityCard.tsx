import type {
    FeatureWeight,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import { FeatureCard } from "@/components/FeatureCard";

interface PriorityCardProps {
    priority: PriorityDefinition;
    features: FeatureWeight[];
    open: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
}

export function PriorityCard({
    priority,
    features,
    open,
    onToggle,
    children,
}: PriorityCardProps) {
    return (
        <FeatureCard
            icon={priority.icon}
            label={priority.label}
            featureCount={features.length}
            open={open}
            onToggle={onToggle}
        >
            {children}
        </FeatureCard>
    );
}
