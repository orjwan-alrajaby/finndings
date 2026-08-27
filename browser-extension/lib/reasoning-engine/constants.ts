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

/**
 * How much the user said a feature matters.
 *
 * The weights are deliberately far apart: a car that has everything the user
 * called essential should beat one that has five luxuries and none of them.
 */
export const TIERS = {
  essential: {
    label: "Essential",
    /** How the tier reads in a sentence: "you marked it essential". */
    inSentence: "essential",
    weight: 5,
    activeClass: "bg-finn-accent-blue text-white",
  },
  good: {
    label: "Good to have",
    inSentence: "good to have",
    weight: 3,
    activeClass: "bg-[#14B8A6] text-white",
  },
  luxury: {
    label: "Luxury extra",
    inSentence: "a luxury extra",
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

/**
 * Every feature FINN's data exposes, with a plain-English explanation.
 *
 * The explanations exist so a reader never has to leave Lens to look up a
 * term. Each one says what the system actually does — no marketing, no
 * "provides useful everyday assistance", and no claim the data can't support.
 */
export const FEATURES = {
  hadLedLights: {
    label: "LED headlights",
    explanation:
      "Headlights that use LEDs instead of halogen bulbs. They throw a brighter, whiter beam and use less power.",
  },
  hasFogLights: {
    label: "Fog lights",
    explanation:
      "Extra low, wide-beam lamps at the front. They light the road edge in fog, heavy rain and snow, where normal headlights reflect back at you.",
  },
  hasMatrixLedHeadlights: {
    label: "Matrix LED headlights",
    explanation:
      "Headlights split into segments that switch off individually. You can leave main beam on and the car blanks out just the part aimed at oncoming traffic.",
  },
  hasSunroof: {
    label: "Sunroof",
    explanation:
      "A glass panel in the roof. Depending on the car it either slides open or is fixed and only lets light in.",
  },
  hasTowbar: {
    label: "Towbar",
    explanation:
      "A fitted tow hitch at the rear, for pulling a trailer or caravan or carrying a bike rack.",
  },
  hasPrivacyGlass: {
    label: "Privacy glass",
    explanation:
      "Darkened rear side and tailgate windows. They make it harder to see into the back of the car and cut sun glare for rear passengers.",
  },
  hasRoofRails: {
    label: "Roof rails",
    explanation:
      "Rails along the roof that crossbars bolt to, so you can fit a roof box, bike carrier or ski rack.",
  },
  hasElectricallyFoldingMirrors: {
    label: "Electrically folding mirrors",
    explanation:
      "The door mirrors fold flat at the touch of a button, or automatically when you lock the car — useful in narrow garages and tight street parking.",
  },
  hasRainSlashLightSensors: {
    label: "Rain & light sensors",
    explanation:
      "Sensors that start the wipers when the windscreen gets wet and switch the headlights on when it gets dark, without you touching either stalk.",
  },
  hasHeadlightCleaningSystem: {
    label: "Headlight washers",
    explanation:
      "Small jets that spray the headlight lenses clean. Road salt and winter grime dim a headlight quickly.",
  },
  hasCorneringLights: {
    label: "Cornering lights",
    explanation:
      "An extra lamp that lights up the inside of a bend when you turn the wheel or indicate at low speed.",
  },

  hasHeatedSeats: {
    label: "Heated seats",
    explanation:
      "Heating elements in the seat cushion and backrest. They warm you directly, so you feel warm before the cabin does.",
  },
  hasSeatCooling: {
    label: "Ventilated seats",
    explanation:
      "Fans that draw air through perforations in the seat. They keep your back from sticking to the upholstery in hot weather.",
  },
  hasAirConditioning: {
    label: "Air conditioning",
    explanation:
      "Cools the cabin and pulls moisture out of the air, which is also what clears a fogged-up windscreen quickly.",
  },
  hasThreeZoneAutomaticClimateControls: {
    label: "3-zone climate control",
    explanation:
      "Driver, front passenger and the rear seats each get their own temperature setting, held automatically.",
  },
  hasLeatherSeats: {
    label: "Leather seats",
    explanation:
      "Leather upholstery rather than cloth. It wipes clean and doesn't soak up spills, but gets colder in winter and hotter in summer.",
  },
  hasElectricFrontSeatAdjustment: {
    label: "Electric front seats",
    explanation:
      "The front seats move on motors instead of levers, so you can fine-tune the position — and often store it — rather than working it out by hand.",
  },
  hasAmbientInteriorLightning: {
    label: "Ambient interior lighting",
    explanation:
      "Coloured strip lighting in the doors and dashboard, usually adjustable. It's decorative — it isn't bright enough to read by.",
  },
  hasLumbarSupport: {
    label: "Lumbar support",
    explanation:
      "An adjustable pad in the seat backrest that pushes into the curve of your lower back. It's what stops the ache on a long drive.",
  },
  hasHeatedSteeringWheel: {
    label: "Heated steering wheel",
    explanation:
      "The rim of the wheel warms up, so you can drive without gloves on a cold morning.",
  },
  hasHeadUpDisplay: {
    label: "Head-up display",
    explanation:
      "Projects your speed and navigation directions onto the windscreen in front of you, so you read them without looking down at the dials.",
  },

  hasAppleCarPlaySlashAndroidAuto: {
    label: "Apple CarPlay / Android Auto",
    explanation:
      "Puts your phone's maps, music and messages on the car's own screen, so you use apps you already know instead of the car's built-in ones.",
  },
  hasWirelessChargingStation: {
    label: "Wireless phone charging",
    explanation:
      "A pad you rest a compatible phone on to charge it without plugging in a cable.",
  },
  hasPremiumSoundSystem: {
    label: "Premium sound system",
    explanation:
      "The manufacturer's upgraded audio system — typically more speakers and a separate amplifier than the standard fit.",
  },
  hasIntegratedNavigationSystem: {
    label: "Built-in navigation",
    explanation:
      "Maps stored in the car itself, so directions keep working where there's no phone signal.",
  },

  hasAdaptiveCruiseControl: {
    label: "Adaptive cruise control",
    explanation:
      "Holds a set speed and automatically slows to keep a gap from the car in front, then picks the speed back up. Ordinary cruise control can't slow down for traffic.",
  },
  hasCruiseControl: {
    label: "Cruise control",
    explanation:
      "Holds a speed you set so you can take your foot off the accelerator. It does not react to traffic ahead — you brake yourself.",
  },
  hasIsofix: {
    label: "ISOFIX child seat anchors",
    explanation:
      "Metal anchor points built into the seat frame. A compatible child seat clicks straight onto them instead of being strapped in with the seatbelt.",
  },
  hasLaneKeepingAssist: {
    label: "Lane keeping assist",
    explanation:
      "Watches the lane markings and nudges the steering back if you start drifting out of your lane without indicating.",
  },
  hasParkingAssistant: {
    label: "Parking assistant",
    explanation:
      "Finds a space and steers the car into it while you control the brake and accelerator.",
  },
  hasParkingSensors: {
    label: "Parking sensors",
    explanation:
      "Sensors in the bumpers that beep faster as you get closer to an obstacle you can't see.",
  },
  hasAuxiliaryHeater: {
    label: "Auxiliary heater",
    explanation:
      "A heater that runs with the engine off, so the cabin is warm and the windows clear before you get in.",
  },
  hasBlindSpotAssist: {
    label: "Blind spot warning",
    explanation:
      "Lights up a warning in the door mirror when another vehicle is alongside you, in the area you can't see in the mirrors.",
  },
  hasRearCrosswalkWarning: {
    label: "Rear cross-traffic alert",
    explanation:
      "Warns you about cars crossing behind you as you reverse out of a parking space between two vehicles.",
  },
  hasThreeSixtyDegreesCamera: {
    label: "360° camera",
    explanation:
      "Cameras around the car stitched into a bird's-eye view of the whole car and everything touching it.",
  },
  hasOneEightyDegreesReversingCamera: {
    label: "Reversing camera",
    explanation:
      "A camera that shows what's directly behind the car on the screen when you select reverse.",
  },

  hasHillStartAssist: {
    label: "Hill start assist",
    explanation:
      "Holds the brakes for a moment after you lift off on a slope, so the car doesn't roll back while you move to the accelerator.",
  },
  hasTirePressureMonitoringSystem: {
    label: "Tyre pressure monitoring",
    explanation:
      "Warns you on the dashboard when a tyre loses pressure, rather than you noticing it looks flat.",
  },
  hasTrafficSignRecognition: {
    label: "Traffic sign recognition",
    explanation:
      "A camera reads speed limit and no-overtaking signs and shows the current limit on the dashboard.",
  },
  hasEmergencyBrakingAssist: {
    label: "Automatic emergency braking",
    explanation:
      "Brakes the car by itself if it detects a collision coming and you haven't reacted. It can avoid the impact entirely at low speed and reduce it at higher speed.",
  },
  hasEmergencyCallSystem: {
    label: "Emergency call system (eCall)",
    explanation:
      "Calls the emergency services automatically after a serious crash and sends them your location, even if nobody in the car can speak. There's also a manual button.",
  },
  hasDriverAssistance: {
    label: "Driver assistance package",
    explanation:
      "FINN lists this car as carrying a driver assistance package, but not which individual systems are in it.",
  },

  hasKeylessEntryAndStart: {
    label: "Keyless entry & start",
    explanation:
      "The car unlocks when you touch the handle with the key in your pocket, and starts on a button — you never take the key out.",
  },
  hasElectricTailgate: {
    label: "Electric tailgate",
    explanation:
      "The boot lid opens and closes on a motor at the press of a button, useful when both your hands are full.",
  },
  hasSplitFoldingRearSeats: {
    label: "Split-folding rear seats",
    explanation:
      "The rear bench folds down in sections, so you can carry something long and still seat a passenger in the back.",
  },
  hasBackUSBPorts: {
    label: "Rear USB ports",
    explanation:
      "USB sockets for the back seats, so rear passengers can charge without a cable running from the front.",
  },
  hasFrontUSBPorts: {
    label: "Front USB ports",
    explanation: "USB sockets in the front of the cabin for charging.",
  },
  hasStartSlashStopSystem: {
    label: "Start/stop system",
    explanation:
      "Switches the engine off when you stop in traffic and restarts it when you pull away, to cut fuel use and idling emissions.",
  },
  hasElectricParkingBrake: {
    label: "Electric parking brake",
    explanation:
      "A switch replaces the handbrake lever. It usually holds the car automatically at a standstill and releases as you drive off.",
  },
  hasAlloyWheels: {
    label: "Alloy wheels",
    explanation:
      "Cast metal wheels instead of steel wheels with plastic covers. Mostly a cosmetic difference.",
  },
  hasSpareWheel: {
    label: "Spare wheel",
    explanation:
      "An actual spare wheel in the boot, rather than only a tyre repair kit — so a serious puncture doesn't need a tow.",
  },
} as const;

type FeatureId = keyof typeof FEATURES;

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `features` is the **catalogue** — every feature the user may enable for the
 * category, ordered most relevant first. It is not what is enabled.
 *
 * The enabled set defaults to the first `MAX_FEATURES_PER_CATEGORY` of this
 * list (all of it, when the catalogue is shorter than that) and the user is
 * free to change both which features are on and what tier each one sits at.
 * See `DEFAULT_CATEGORY_FEATURES` below.
 */
export const CATEGORIES = {
  /**
   * Safety and driver assistance are one priority.
   *
   * They were two, and splitting them made the user rank the same systems
   * twice: automatic emergency braking is a safety feature and an assistance
   * feature, and no reader has a coherent opinion about which of the two they
   * care about more.
   */
  safetyAssistance: {
    label: "Safety & Driver Assistance",
    icon: "🛡️",
    color: "#2563EB",
    question: "What does the car do to keep you out of an accident?",
    description:
      "Systems that intervene when something goes wrong — automatic braking, blind spot and lane warnings, the emergency call — plus the assistance that reduces the work of driving.",
    recommendedFor: [
      "Families",
      "New drivers",
      "Long-distance commuters",
      "Drivers who travel in poor weather often",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasEmergencyBrakingAssist"),
      tier("essential", "hasBlindSpotAssist"),
      tier("essential", "hasLaneKeepingAssist"),
      tier("essential", "hasEmergencyCallSystem"),
      tier("good", "hasAdaptiveCruiseControl"),
      /* Available, off by default. */
      tier("good", "hasParkingSensors"),
      tier("good", "hasOneEightyDegreesReversingCamera"),
      tier("good", "hasTrafficSignRecognition"),
      tier("good", "hasRearCrosswalkWarning"),
      tier("good", "hasTirePressureMonitoringSystem"),
      tier("good", "hasParkingAssistant"),
      tier("good", "hasHillStartAssist"),
      tier("good", "hasCruiseControl"),
      tier("luxury", "hasThreeSixtyDegreesCamera"),
      tier("luxury", "hasMatrixLedHeadlights"),
    ],
  },

  familyFriendly: {
    label: "Family Friendly",
    icon: "👨‍👩‍👧",
    color: "#EA580C",
    question: "Will this work for transporting your family, week after week?",
    description:
      "Child seat anchors, a rear bench that folds, and the things that make loading children and their equipment less of a fight.",
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
      tier("good", "hasParkingSensors"),
      tier("good", "hasElectricTailgate"),
      tier("good", "hasBackUSBPorts"),
      /* Available, off by default. */
      tier("good", "hasOneEightyDegreesReversingCamera"),
      tier("good", "hasThreeZoneAutomaticClimateControls"),
      tier("good", "hasRearCrosswalkWarning"),
      tier("luxury", "hasThreeSixtyDegreesCamera"),
      tier("luxury", "hasPrivacyGlass"),
    ],
  },

  practicality: {
    label: "Practicality",
    icon: "🎒",
    color: "#0891B2",
    question: "Will everything you carry day-to-day actually fit?",
    description:
      "Boot space, plus the fittings that decide what you can get in and out of it — folding seats, roof rails, a towbar, a powered tailgate.",
    recommendedFor: [
      "Daily commuters",
      "Active lifestyles",
      "People carrying shopping or equipment",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasSplitFoldingRearSeats"),
      tier("good", "hasElectricTailgate"),
      tier("good", "hasRoofRails"),
      tier("good", "hasTowbar"),
      tier("good", "hasParkingSensors"),
      /* Available, off by default. */
      tier("good", "hasSpareWheel"),
      tier("good", "hasKeylessEntryAndStart"),
      tier("good", "hasElectricallyFoldingMirrors"),
      tier("good", "hasFrontUSBPorts"),
      tier("good", "hasBackUSBPorts"),
    ],
  },

  longDistance: {
    label: "Long Distance Travel",
    icon: "🛣️",
    color: "#D97706",
    question: "How does this feel after three hours on the motorway?",
    description:
      "What keeps a long drive tolerable: cruise assistance that holds a gap for you, a seat you can set up properly, and navigation that doesn't drop out.",
    recommendedFor: [
      "Road trippers",
      "Business travellers",
      "Highway drivers",
    ],
    numericOnly: false,
    features: [
      tier("essential", "hasAdaptiveCruiseControl"),
      tier("good", "hasLumbarSupport"),
      tier("good", "hasIntegratedNavigationSystem"),
      tier("good", "hasHeatedSeats"),
      tier("good", "hasElectricFrontSeatAdjustment"),
      /* Available, off by default. */
      tier("good", "hasCruiseControl"),
      tier("good", "hasAppleCarPlaySlashAndroidAuto"),
      tier("good", "hasRainSlashLightSensors"),
      tier("luxury", "hasHeadUpDisplay"),
      tier("luxury", "hasSeatCooling"),
      tier("luxury", "hasMatrixLedHeadlights"),
      tier("luxury", "hasPremiumSoundSystem"),
    ],
  },

  climateSuitability: {
    label: "Climate Suitability",
    icon: "❄️",
    color: "#0284C7",
    question: "How will this hold up through winter mornings and summer heat?",
    description:
      "Heating and cooling for the people rather than the cabin — warm seats and wheel on a frozen morning, air conditioning in August.",
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
      /* Available, off by default. */
      tier("good", "hasThreeZoneAutomaticClimateControls"),
      tier("good", "hasSeatCooling"),
      tier("good", "hasFogLights"),
      tier("good", "hasCorneringLights"),
      tier("good", "hasHeadlightCleaningSystem"),
      tier("good", "hasElectricallyFoldingMirrors"),
    ],
  },

  environmental: {
    label: "Environmental Impact",
    icon: "🌿",
    color: "#16A34A",
    question: "How much does this car emit, and what does it run on?",
    description:
      "CO₂ per kilometre and the drivetrain it comes from. Measured from the vehicle data rather than from a feature list.",
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
    question: "How pleasant is it to sit in, every single day?",
    description:
      "Warmth, upholstery and the small everyday conveniences you notice on the drive to work and nowhere else.",
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
      /* Available, off by default. */
      tier("good", "hasSeatCooling"),
      tier("good", "hasElectricFrontSeatAdjustment"),
      tier("good", "hasKeylessEntryAndStart"),
      tier("good", "hasAppleCarPlaySlashAndroidAuto"),
      tier("luxury", "hasPremiumSoundSystem"),
      tier("luxury", "hasAmbientInteriorLightning"),
      tier("luxury", "hasWirelessChargingStation"),
      tier("luxury", "hasHeadUpDisplay"),
      tier("luxury", "hasSunroof"),
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
/* Feature selection rules                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The most features one priority may have switched on at once.
 *
 * A cap, not a quota. A category whose catalogue is shorter than this simply
 * starts with all of it enabled.
 */
export const MAX_FEATURES_PER_CATEGORY = 5;

/**
 * The fewest.
 *
 * A feature-based priority with nothing enabled has no way to tell two cars
 * apart, so the UI never lets the user empty one.
 */
export const MIN_FEATURES_PER_CATEGORY = 1;

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Profiles are fixed starting philosophies, not user documents.
 *
 * They can be enabled, disabled and chosen. They cannot be renamed, reordered
 * or deleted — a "Family First" profile the user has rewritten to lead on
 * comfort is a lie in the picker, and the way to express that is the custom
 * priority flow instead.
 *
 * Every profile carries exactly five priorities.
 */
export const PROFILES = {
  nervous: {
    label: "Nervous Driver",
    icon: "🛡️",
    forWhom:
      "Drivers who want the car watching the road with them — braking, lane and blind spot warnings doing the heavy lifting.",
    assumes:
      "Safety and assistance systems outrank everything else, with visibility in bad weather close behind.",
    priorities: [
      "safetyAssistance",
      "climateSuitability",
      "practicality",
      "familyFriendly",
      "longDistance",
    ],
  },

  commuter: {
    label: "City Commuter",
    icon: "🧭",
    forWhom:
      "People doing the same short, busy journey twice a day, mostly in traffic.",
    assumes:
      "Assistance that reduces daily friction leads, and emissions matter because most of the driving is urban.",
    priorities: [
      "safetyAssistance",
      "practicality",
      "comfort",
      "environmental",
      "climateSuitability",
    ],
  },

  family: {
    label: "Family First",
    icon: "👨‍👩‍👧",
    forWhom:
      "Parents moving children, car seats and everything that comes with them, week after week.",
    assumes:
      "Fitting the family in comes first, with safety immediately behind it.",
    priorities: [
      "familyFriendly",
      "safetyAssistance",
      "practicality",
      "climateSuitability",
      "longDistance",
    ],
  },

  roadtrip: {
    label: "Road Tripper",
    icon: "🛣️",
    forWhom:
      "Anyone who regularly spends hours at a stretch behind the wheel.",
    assumes:
      "How the car feels after three hours matters as much as what it does in an emergency.",
    priorities: [
      "longDistance",
      "comfort",
      "safetyAssistance",
      "practicality",
      "climateSuitability",
    ],
  },

  eco: {
    label: "Eco-Conscious",
    icon: "🌿",
    forWhom:
      "Drivers who want emissions to be the first thing the choice answers to.",
    assumes:
      "CO₂ and drivetrain lead, with safety immediately behind them.",
    priorities: [
      "environmental",
      "safetyAssistance",
      "practicality",
      "longDistance",
      "comfort",
    ],
  },

  balanced: {
    label: "Balanced",
    icon: "⚖️",
    forWhom:
      "Anyone without one dominant requirement who wants a sensible all-rounder.",
    assumes:
      "No category runs away with it — the weight is spread across the everyday essentials.",
    priorities: [
      "safetyAssistance",
      "practicality",
      "familyFriendly",
      "climateSuitability",
      "comfort",
    ],
  },
} as const;

export type ProfileId = keyof typeof PROFILES;

/** How many priorities every profile carries. */
export const PROFILE_PRIORITY_COUNT = 5;

/* -------------------------------------------------------------------------- */
/* Derived defaults                                                           */
/* -------------------------------------------------------------------------- */

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export const NUMERIC_ONLY_CATEGORIES = CATEGORY_IDS.filter(
  (id) => CATEGORIES[id].numericOnly
);

/**
 * Every feature a category *offers*, in relevance order.
 *
 * This is the list the settings UI draws from. It is not what is enabled.
 */
export const AVAILABLE_CATEGORY_FEATURES = Object.fromEntries(
  CATEGORY_IDS.map((id) => [id, CATEGORIES[id].features as FeatureWeight[]])
) as Record<CategoryId, FeatureWeight[]>;

/**
 * What a category starts with switched on.
 *
 * The first five of the catalogue when there are more than five, and all of
 * them when there aren't. The order in `CATEGORIES` is therefore load-bearing:
 * it is the answer to "which five are the sensible five?".
 */
export const DEFAULT_CATEGORY_FEATURES = Object.fromEntries(
  CATEGORY_IDS.map((id) => [
    id,
    (CATEGORIES[id].features as FeatureWeight[]).slice(
      0,
      MAX_FEATURES_PER_CATEGORY
    ),
  ])
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

/**
 * Which profile is automatically selected out of the box.
 *
 * "Default" means selected, not merely present. Nothing else in the product
 * is allowed to use the word for "shipped in the list".
 */
export const DEFAULT_DEFAULT_PROFILE_ID: ProfileId = "balanced";

/**
 * The starting priority order: the default profile's own, so that opening
 * Lens and pressing nothing gives exactly what the default profile promises.
 */
export const DEFAULT_PRIORITIES: CategoryId[] = [
  ...PROFILES[DEFAULT_DEFAULT_PROFILE_ID].priorities,
];

/* -------------------------------------------------------------------------- */
/* Preferences                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Kilometres FINN's base subscription currently includes each month.
 *
 * This is an assumption about the FINN offer, not a user preference, so it
 * deliberately lives outside LensPreferences. Anything driven beyond it is
 * charged at the vehicle's own `pricing.extraKmPrice`.
 */
export const FINN_INCLUDED_MONTHLY_KM = 500;

/**
 * Placeholder starting point for a brand-new install — not a claim about what
 * anyone can or should spend. The user is expected to edit it.
 */
export const DEFAULT_MONTHLY_BUDGET = 300;

export const DEFAULT_PREFERENCES: LensPreferences = {
  monthlyKm: 1_000,
  petrolPrice: 1.75,
  dieselPrice: 1.7,
  electricityPrice: 0.32,
  monthlyBudget: DEFAULT_MONTHLY_BUDGET,
  contractType: "private",
};
