import type { PinnedFinnCar } from "@/lib/types";
import type {
  CATEGORIES,
  FEATURES,
  PROFILES,
  TIERS,
} from "./constants";

/* -------------------------------------------------------------------------- */
/* Configuration-derived types                                                */
/* -------------------------------------------------------------------------- */

export type CategoryId = keyof typeof CATEGORIES;
export type FeatureId = keyof typeof FEATURES;
export type FeatureTier = keyof typeof TIERS;
export type ProfileId = keyof typeof PROFILES;

/* -------------------------------------------------------------------------- */
/* Preferences                                                                */
/* -------------------------------------------------------------------------- */

export type PreferenceSource = "defaults" | "custom";

export interface LensPreferences {
  monthlyBudget: number;
  annualKm: number;
  petrolPrice: number;
  dieselPrice: number;
  electricityPrice: number;
}

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

export interface FeatureWeight {
  key: FeatureId;
  tier: FeatureTier;
}

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

export interface Profile {
  id: ProfileId;
  label: string;
  icon: string;
  forWhom: string;
  assumes: string;
  priorities: CategoryId[];
  enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export interface CategoryDef {
  label: string;
  icon: string;
  color: string;
  question: string;
  description: string;
  recommendedFor: string[];
  numericOnly?: boolean;
  features: FeatureWeight[];
}

/* -------------------------------------------------------------------------- */
/* User-editable priority metadata                                            */
/* -------------------------------------------------------------------------- */

export interface PriorityDefinition {
  id: CategoryId;
  label: string;
  icon: string;
  description: string;
  isCustom: boolean;
  enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export interface CategoryDetail {
  score: number;
  matched: FeatureWeight[];
  missing: FeatureWeight[];
}

export interface VehicleScore {
  vehicleId: number;
  total: number;
  byCategory: Record<CategoryId, number>;
  details: Partial<Record<CategoryId, CategoryDetail>>;
}

/* -------------------------------------------------------------------------- */
/* Costs                                                                      */
/* -------------------------------------------------------------------------- */

export interface CostBreakdown {
  rental: number;
  running: number;
  totalMonthly: number;
  annual: number;
  costPer100Km: number | null;
  energyLabel: string;
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                            */
/* -------------------------------------------------------------------------- */

export interface Recommendation {
  winner: PinnedFinnCar;
  score: VehicleScore;
  ranked: PinnedFinnCar[];
  scores: VehicleScore[];
  reasons: PriorityReason[];
  tradeoffs: Tradeoff[];
}

export interface PriorityReason {
  priority: CategoryId;
  title: string;
  text: string;
  evidence: string[];
}

export interface Tradeoff {
  priority: CategoryId;
  title: string;
  text: string;
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export interface LensSettings {
  preferences: LensPreferences;
  priorities: CategoryId[];
  priorityDefinitions: PriorityDefinition[];
  profiles: Profile[];
  categoryFeatures: Record<CategoryId, FeatureWeight[]>;
  defaultProfileId: ProfileId;
}