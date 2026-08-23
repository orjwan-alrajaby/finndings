import type {
  CategoryDef,
  FeatureWeight,
  LensPreferences,
  PriorityDefinition,
  Profile,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Tiers                                                                      */
/* -------------------------------------------------------------------------- */

export const TIERS = {
  essential: {
    label: "Essential",
    weight: 5,
    activeClass: "bg-finn-accent-blue text-white",
  },
  good: {
    label: "Good to have",
    weight: 3,
    activeClass: "bg-[#14B8A6] text-white",
  },
  luxury: {
    label: "Luxury extra",
    weight: 1,
    activeClass: "bg-[#8B5CF6] text-white",
  },
} as const;

type FeatureTier = keyof typeof TIERS;

const tier = (tier: FeatureTier, key: FeatureId): FeatureWeight => ({
  key,
  tier,
});

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

export const FEATURES = {
  hadLedLights: {
    label: "LED headlights",
    explanation:
      "Bright, efficient headlights that improve visibility at night.",
  },
  hasFogLights: {
    label: "Fog lights",
    explanation:
      "Helps improve visibility in fog and other low-visibility conditions.",
  },
  hasMatrixLedHeadlights: {
    label: "Matrix LED headlights",
    explanation:
      "Automatically adjusts individual LED sections to improve visibility without dazzling other drivers.",
  },
  hasSunroof: {
    label: "Sunroof",
    explanation:
      "A roof panel that lets in extra light and, when opened, fresh air.",
  },
  hasTowbar: {
    label: "Towbar",
    explanation:
      "Allows the car to tow a trailer or use compatible towing accessories.",
  },
  hasPrivacyGlass: {
    label: "Privacy glass",
    explanation:
      "Tinted rear glass that reduces glare and gives passengers more privacy.",
  },
  hasRoofRails: {
    label: "Roof rails",
    explanation:
      "Provides mounting points for roof boxes, bikes and other cargo carriers.",
  },
  hasElectricallyFoldingMirrors: {
    label: "Electrically folding mirrors",
    explanation:
      "Lets the side mirrors fold in automatically, useful in tight spaces.",
  },
  hasRainSlashLightSensors: {
    label: "Rain & light sensors",
    explanation:
      "Automatically turns on lights and adjusts wipers when conditions require it.",
  },
  hasHeadlightCleaningSystem: {
    label: "Headlight cleaning system",
    explanation:
      "Cleans the headlights to help maintain visibility when they're dirty.",
  },
  hasCorneringLights: {
    label: "Cornering lights",
    explanation:
      "Adds light to the side of the road when turning at low speeds.",
  },

  hasHeatedSeats: {
    label: "Heated seats",
    explanation: "Warms the seat quickly on cold days.",
  },
  hasSeatCooling: {
    label: "Seat cooling",
    explanation:
      "Circulates air through the seats to make hot-weather driving more comfortable.",
  },
  hasAirConditioning: {
    label: "Air conditioning",
    explanation: "Cools and dehumidifies the cabin.",
  },
  hasThreeZoneAutomaticClimateControls: {
    label: "3-zone climate control",
    explanation:
      "Automatically maintains separate temperature settings for different areas of the cabin.",
  },
  hasLeatherSeats: {
    label: "Leather seats",
    explanation:
      "Leather upholstery that adds a more premium feel and is easy to wipe clean.",
  },
  hasElectricFrontSeatAdjustment: {
    label: "Electric front seat adjustment",
    explanation:
      "Lets you adjust the front seats electrically for easier, more precise positioning.",
  },
  hasAmbientInteriorLightning: {
    label: "Ambient interior lighting",
    explanation:
      "Soft interior lighting that adds atmosphere to the cabin.",
  },
  hasLumbarSupport: {
    label: "Lumbar support",
    explanation:
      "Adjustable lower-back support that can improve comfort on longer drives.",
  },
  hasHeatedSteeringWheel: {
    label: "Heated steering wheel",
    explanation: "Warms the steering wheel on cold days.",
  },
  hasHeadUpDisplay: {
    label: "Head-up display",
    explanation:
      "Projects key driving information into your line of sight.",
  },

  hasAppleCarPlaySlashAndroidAuto: {
    label: "Apple CarPlay / Android Auto",
    explanation:
      "Connects your phone to the car's display for apps, calls, music and navigation.",
  },
  hasWirelessChargingStation: {
    label: "Wireless phone charging",
    explanation: "Charges compatible phones without a cable.",
  },
  hasPremiumSoundSystem: {
    label: "Premium sound system",
    explanation:
      "Higher-quality audio hardware designed for a richer listening experience.",
  },
  hasIntegratedNavigationSystem: {
    label: "Built-in navigation",
    explanation:
      "Built-in navigation that works without relying entirely on your phone.",
  },

  hasAdaptiveCruiseControl: {
    label: "Adaptive cruise control",
    explanation:
      "Maintains your speed while automatically adjusting distance from traffic ahead.",
  },
  hasCruiseControl: {
    label: "Cruise control",
    explanation:
      "Maintains a set speed without keeping your foot on the accelerator.",
  },
  hasIsofix: {
    label: "ISOFIX child seat anchors",
    explanation:
      "Standard mounting points make compatible child seats easier and more secure to install.",
  },
  hasLaneKeepingAssist: {
    label: "Lane keeping assist",
    explanation:
      "Helps keep the car within its lane if it detects that you're drifting.",
  },
  hasParkingAssistant: {
    label: "Parking assistant",
    explanation:
      "Assists with steering while parking; you remain responsible for controlling the car.",
  },
  hasParkingSensors: {
    label: "Parking sensors",
    explanation:
      "Warns you when you're getting close to objects while parking.",
  },
  hasAuxiliaryHeater: {
    label: "Auxiliary heater",
    explanation:
      "Provides additional heating to warm the cabin more quickly in cold weather.",
  },
  hasBlindSpotAssist: {
    label: "Blind spot warning",
    explanation:
      "Warns you when another vehicle is travelling beside you in a hard-to-see area.",
  },
  hasRearCrosswalkWarning: {
    label: "Rear crosswalk warning",
    explanation:
      "Warns about approaching traffic when reversing out of a parking space.",
  },
  hasThreeSixtyDegreesCamera: {
    label: "360° camera",
    explanation:
      "Uses cameras around the car to provide a top-down view when manoeuvring.",
  },
  hasOneEightyDegreesReversingCamera: {
    label: "Reversing camera",
    explanation:
      "Shows the area behind the car while reversing.",
  },

  hasHillStartAssist: {
    label: "Hill start assist",
    explanation:
      "Prevents the car from rolling backwards when moving off on an incline.",
  },
  hasTirePressureMonitoringSystem: {
    label: "Tyre pressure monitoring",
    explanation:
      "Monitors tyre pressure and warns you when it becomes too low.",
  },
  hasTrafficSignRecognition: {
    label: "Traffic sign recognition",
    explanation:
      "Detects common road signs and displays relevant information to the driver.",
  },
  hasEmergencyBrakingAssist: {
    label: "Automatic emergency braking",
    explanation:
      "Can automatically brake when a collision appears imminent and the driver doesn't react.",
  },
  hasEmergencyCallSystem: {
    label: "Emergency call system (eCall)",
    explanation:
      "Can automatically contact emergency services after a serious crash.",
  },
  hasDriverAssistance: {
    label: "General driver assistance package",
    explanation:
      "A general package of systems designed to support the driver and reduce workload.",
  },

  hasKeylessEntryAndStart: {
    label: "Keyless entry & start",
    explanation:
      "Lets you unlock and start the car without taking the key out of your pocket.",
  },
  hasElectricTailgate: {
    label: "Electric tailgate",
    explanation:
      "Opens and closes the boot electrically, often at the push of a button.",
  },
  hasSplitFoldingRearSeats: {
    label: "Split-folding rear seats",
    explanation:
      "Allows the rear seats to fold in sections for more flexible passenger and cargo space.",
  },
  hasBackUSBPorts: {
    label: "Rear USB ports",
    explanation:
      "Provides USB charging ports for passengers in the rear.",
  },
  hasFrontUSBPorts: {
    label: "Front USB ports",
    explanation:
      "Provides USB charging ports for front passengers.",
  },
  hasStartSlashStopSystem: {
    label: "Start/stop system",
    explanation:
      "Automatically switches the engine off when stopped and restarts it when needed.",
  },
  hasElectricParkingBrake: {
    label: "Electric parking brake",
    explanation:
      "Applies the parking brake electronically instead of using a traditional lever or pedal.",
  },
  hasAlloyWheels: {
    label: "Alloy wheels",
    explanation:
      "Lightweight metal wheels that typically improve appearance and can reduce unsprung weight.",
  },
  hasSpareWheel: {
    label: "Spare wheel",
    explanation:
      "Provides a spare wheel for use after a puncture.",
  },
} as const;

type FeatureId = keyof typeof FEATURES;

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const CATEGORIES = {
  affordability: {
    label: "Affordability",
    icon: "💶",
    color: "#0F9D58",
    question: "Can I comfortably afford this, month after month?",
    description:
      "Total monthly cost of renting — base price, estimated extra-kilometre charges, and fuel or electricity.",
    recommendedFor: [
      "Budget-conscious renters",
      "First-time FINN customers",
      "Anyone comparing monthly payments closely",
    ],
    numericOnly: true,
    features: [],
  },

  safety: {
    label: "Safety",
    icon: "🛡️",
    color: "#2563EB",
    question: "How well does this car protect the people inside it?",
    description:
      "Systems that intervene automatically to prevent or reduce the severity of an accident.",
    recommendedFor: [
      "Families",
      "Safety-conscious drivers",
      "Parents",
      "Long-distance commuters",
      "Drivers who travel in poor weather often",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasEmergencyBrakingAssist"),
      tier("essential", "hasBlindSpotAssist"),
      tier("essential", "hasLaneKeepingAssist"),
      tier("essential", "hasEmergencyCallSystem"),
      tier("good", "hasTirePressureMonitoringSystem"),
      tier("good", "hasTrafficSignRecognition"),
    ],
  },

  driverAssistance: {
    label: "Driver Assistance",
    icon: "🧭",
    color: "#7C3AED",
    question: "How much does the car help you while you're driving it?",
    description:
      "Technology that reduces mental effort behind the wheel — cruise control, parking help, and navigation.",
    recommendedFor: [
      "New drivers",
      "City commuters",
      "Drivers who spend lots of time in traffic",
      "People who dislike parking",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasEmergencyBrakingAssist"),
      tier("essential", "hasAdaptiveCruiseControl"),
      tier("essential", "hasLaneKeepingAssist"),
      tier("essential", "hasParkingAssistant"),
      tier("good", "hasTrafficSignRecognition"),
      tier("good", "hasCruiseControl"),
      tier("good", "hasBlindSpotAssist"),
      tier("luxury", "hasThreeSixtyDegreesCamera"),
    ],
  },

  familyFriendly: {
    label: "Family Friendly",
    icon: "👨‍👩‍👧",
    color: "#EA580C",
    question: "Will this work for transporting your family, week after week?",
    description: "Child seat compatibility and rear-seat practicality.",
    recommendedFor: [
      "Parents",
      "Large families",
      "School runs",
      "Weekend trips",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasIsofix"),
      tier("essential", "hasSplitFoldingRearSeats"),
      tier("good", "hasElectricTailgate"),
      tier("good", "hasParkingSensors"),
      tier("good", "hasThreeSixtyDegreesCamera"),
    ],
  },

  practicality: {
    label: "Practicality",
    icon: "🎒",
    color: "#0891B2",
    question: "Will everything you carry day-to-day actually fit?",
    description:
      "Boot space plus small daily conveniences — roof rails, towbar, USB ports, parking sensors.",
    recommendedFor: [
      "Daily commuters",
      "Active lifestyles",
      "People carrying shopping or equipment",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasSplitFoldingRearSeats"),
      tier("good", "hasTowbar"),
      tier("good", "hasRoofRails"),
      tier("good", "hasElectricTailgate"),
    ],
  },

  longDistance: {
    label: "Long Distance Travel",
    icon: "🛣️",
    color: "#D97706",
    question: "How enjoyable will this be after three hours on the motorway?",
    description:
      "Cruise assistance, seat comfort, and — for electric cars — enough range not to think about it.",
    recommendedFor: [
      "Road trippers",
      "Business travellers",
      "Highway drivers",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasAdaptiveCruiseControl"),
      tier("good", "hasIntegratedNavigationSystem"),
      tier("good", "hasHeatedSeats"),
      tier("good", "hasLumbarSupport"),
    ],
  },

  climateSuitability: {
    label: "Climate Suitability",
    icon: "❄️",
    color: "#0284C7",
    question: "How will this hold up through winter mornings & summer heat?",
    description: "Heated seats, heated steering wheel, and climate control.",
    recommendedFor: [
      "Drivers in extreme climates",
      "Mountain regions",
      "Cold winters",
      "Hot summers",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasAirConditioning"),
      tier("good", "hasHeatedSeats"),
      tier("good", "hasHeatedSteeringWheel"),
      tier("good", "hasRainSlashLightSensors"),
      tier("luxury", "hasAuxiliaryHeater"),
    ],
  },

  environmental: {
    label: "Environmental Impact",
    icon: "🌿",
    color: "#16A34A",
    question: "How much does this car affect the environment?",
    description:
      "CO₂ emissions and fuel type — the dominant signal — plus a couple of efficiency features.",
    recommendedFor: [
      "Eco-conscious drivers",
      "City drivers",
      "Low-emission focused buyers",
    ],
    numericOnly: true,
    features: [],
  },

  comfort: {
    label: "Comfort",
    icon: "🛋️",
    color: "#DB2777",
    question: "How enjoyable is it just to sit in and drive, every single day?",
    description:
      "Leather, warmth, ambient lighting, and other small everyday luxuries.",
    recommendedFor: [
      "Daily drivers who spend hours in the car",
      "Anyone who wants driving to feel like a treat",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasHeatedSeats"),
      tier("essential", "hasThreeZoneAutomaticClimateControls"),
      tier("good", "hasHeatedSteeringWheel"),
      tier("good", "hasLumbarSupport"),
      tier("good", "hasLeatherSeats"),
      tier("good", "hasSeatCooling"),
      tier("luxury", "hasPremiumSoundSystem"),
      tier("luxury", "hasAmbientInteriorLightning"),
      tier("luxury", "hasWirelessChargingStation"),
    ],
  },
} satisfies Record<
  string,
  Omit<CategoryDef, "id"> & {
    numericOnly: boolean;
    features: FeatureWeight[];
  }
>;

type CategoryId = keyof typeof CATEGORIES;

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

export const PROFILES = {
  nervous: {
    label: "Nervous Driver",
    icon: "🛡️",
    forWhom:
      "Drivers who want maximum reassurance behind the wheel — safety and assistance systems doing the heavy lifting.",
    assumes:
      "Weighs safety and driver assistance far above everything else, even cost.",
    priorities: [
      "safety",
      "driverAssistance",
      "practicality",
      "familyFriendly",
      "climateSuitability",
    ],
  },

  commuter: {
    label: "City Commuter",
    icon: "🧭",
    forWhom:
      "People who spend lots of time in traffic and dislike parking.",
    assumes:
      "Prioritizes tech that reduces daily friction, but keeps cost in the top 5.",
    priorities: [
      "driverAssistance",
      "safety",
      "practicality",
      "affordability",
      "longDistance",
    ],
  },

  family: {
    label: "Family First",
    icon: "👨‍👩‍👧",
    forWhom:
      "Parents who need to safely and comfortably transport children on a regular basis.",
    assumes:
      "Safety and family practicality dominate — cost matters less if the fit is right.",
    priorities: [
      "safety",
      "familyFriendly",
      "practicality",
      "driverAssistance",
      "longDistance",
    ],
  },

  roadtrip: {
    label: "Road Tripper",
    icon: "🛣️",
    forWhom:
      "Anyone who regularly spends hours behind the wheel on longer journeys.",
    assumes:
      "Comfort and long-distance capability matter as much as safety.",
    priorities: [
      "longDistance",
      "driverAssistance",
      "safety",
      "comfort",
      "practicality",
    ],
  },

  eco: {
    label: "Eco-Conscious",
    icon: "🌿",
    forWhom:
      "Drivers who want their car choice to reflect their environmental values.",
    assumes:
      "Environmental impact leads, with cost close behind.",
    priorities: [
      "environmental",
      "safety",
      "affordability",
      "driverAssistance",
      "practicality",
    ],
  },

  balanced: {
    label: "Balanced",
    icon: "⚖️",
    forWhom:
      "Anyone without a strong single priority who wants a well-rounded pick.",
    assumes:
      "No category dominates — spreads weight evenly across the essentials.",
    priorities: [
      "safety",
      "driverAssistance",
      "practicality",
      "longDistance",
      "climateSuitability",
    ],
  },
} as const;

export type ProfileId = keyof typeof PROFILES;

/* -------------------------------------------------------------------------- */
/* Derived defaults                                                           */
/* -------------------------------------------------------------------------- */

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export const NUMERIC_ONLY_CATEGORIES = CATEGORY_IDS.filter(
  (id) => CATEGORIES[id].numericOnly
);

export const DEFAULT_CATEGORY_FEATURES = Object.fromEntries(
  CATEGORY_IDS.map((id) => [id, CATEGORIES[id].features])
) as Record<CategoryId, FeatureWeight[]>;

export const DEFAULT_PRIORITY_DEFINITIONS: PriorityDefinition[] =
  CATEGORY_IDS.map((id) => ({
    id,
    label: CATEGORIES[id].label,
    icon: CATEGORIES[id].icon,
    description: CATEGORIES[id].description,
    isCustom: false,
    enabled: true,
  }));

export const DEFAULT_PROFILES: Profile[] = (
  Object.keys(PROFILES) as ProfileId[]
).map((id) => ({
  id,
  ...PROFILES[id],
  priorities: [...PROFILES[id].priorities],
  enabled: true,
}));

export const DEFAULT_PRIORITIES: CategoryId[] = [
  "safety",
  "affordability",
  "driverAssistance",
  "practicality",
  "comfort",
];

/** Which profile is pre-selected for a brand-new comparison, out of the box. */
export const DEFAULT_DEFAULT_PROFILE_ID: ProfileId = "balanced";

/* -------------------------------------------------------------------------- */
/* Preferences                                                                */
/* -------------------------------------------------------------------------- */

export const DEFAULT_FINN_MONTHLY_KM = 500;

export const DEFAULT_PREFERENCES: LensPreferences = {
  annualKm: 12_000,
  petrolPrice: 1.75,
  dieselPrice: 1.7,
  electricityPrice: 0.32,
  monthlyBudget: 300,
};