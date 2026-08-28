import type {
  CategoryDef,
  FeatureImportance,
  FeatureSelection,
  LensPreferences,
  PriorityDefinition,
  Profile,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Feature importance                                                         */
/* -------------------------------------------------------------------------- */

/**
 * How much extra influence a picked-out feature carries.
 *
 * Read the numbers like this: every feature in a category's catalogue counts
 * once, because it is relevant equipment. A feature the user picked out
 * counts again for how much they said it should influence the result — once
 * more for the lowest level, twice for the middle, three times for the
 * highest. Hence 2, 3 and 4 against a base of 1.
 *
 * The ratios matter, not the absolute figures. What they have to achieve is
 * narrow: an extremely-important pick should visibly outweigh a merely
 * important one, and the whole catalogue must stay the denominator so that no
 * single feature can push a category to 0 or 100. Anything much steeper (the
 * old system's 5-to-1) starts letting five picks drown out the ten to fifteen
 * other things the category is actually made of.
 *
 * The three labels are adverbs because the question above them is "how much
 * should this influence your decision?" and an adverb is what answers it —
 * "somewhat", "moderately", "highly" finish the reader's own sentence, where
 * "high / medium / low" was a grading scheme they had to decode first. There
 * is deliberately no "essential" and no "required": nothing here gates a car
 * out, so no label may sound like it does.
 *
 * The colour fields live here rather than in the components so that the
 * scale looks the same everywhere it is shown — the picker in step 3, the
 * priority editor in settings, and the chips in the advice. Three distinct
 * hues, not three tints of one, because tints of one colour say "more of the
 * same" where these have to say "a different level".
 *
 * The scale currently runs emerald → orange → rose. Worth knowing what that
 * costs: a warm ramp ending in red is the colour language of severity, and
 * the top level here is the opposite of a warning — it is the reader saying
 * a feature matters most, on a scale where no level rules a car out. See
 * assets/tailwind.css for the contrast figures.
 */
export const FEATURE_IMPORTANCE = {
  /*
   * The keys are high/medium/low and stay that way. They are written into
   * saved settings, so renaming them to match the labels would strand every
   * preference a reader has already stored behind a migration — and the
   * labels are free to change again without touching any of that.
   */
  high: {
    label: "Highly",
    /** Completes "you said it should count ___". */
    inSentence: "highly",
    /** Names the level where the control isn't on screen to give it context. */
    badgeLabel: "Counts highly",
    hint: "As much as anything else in this priority",
    weight: 4,
    /* Rose: the loudest of the three. */
    activeClass:
      "bg-finn-influence-red text-white ring-1 ring-finn-influence-red",
    idleClass:
      "text-finn-influence-red hover:bg-finn-influence-red-pale",
    dotClass: "bg-finn-influence-red",
    selectedCardClass:
      "bg-finn-influence-red-pale ring-2 ring-finn-influence-red",
    accentTextClass: "text-finn-influence-red",
    chipClass:
      "bg-finn-influence-red-pale text-finn-influence-red",
  },
  medium: {
    label: "Moderately",
    inSentence: "moderately",
    badgeLabel: "Counts moderately",
    hint: "Clearly more than the rest of the category",
    weight: 3,
    /* Orange: the middle step, warm rather than louder blue. */
    activeClass:
      "bg-finn-influence-orange text-white ring-1 ring-finn-influence-orange",
    idleClass: "text-finn-influence-orange hover:bg-finn-influence-orange-pale",
    dotClass: "bg-finn-influence-orange",
    selectedCardClass:
      "bg-finn-influence-orange-pale ring-2 ring-finn-influence-orange",
    accentTextClass: "text-finn-influence-orange",
    chipClass: "bg-finn-influence-orange-pale text-finn-influence-orange",
  },
  low: {
    label: "Somewhat",
    inSentence: "somewhat",
    badgeLabel: "Counts somewhat",
    hint: "A little more than the rest of the category",
    weight: 2,
    /* Emerald: the calmest of the three, so visual weight tracks stated
       weight. */
    activeClass:
      "bg-finn-influence-emerald text-white ring-1 ring-finn-influence-emerald",
    idleClass: "text-finn-influence-emerald hover:bg-finn-influence-emerald-pale",
    dotClass: "bg-finn-influence-emerald",
    selectedCardClass:
      "bg-finn-influence-emerald-pale ring-2 ring-finn-influence-emerald",
    accentTextClass: "text-finn-influence-emerald",
    chipClass: "bg-finn-influence-emerald-pale text-finn-influence-emerald",
  },
} as const satisfies Record<
  FeatureImportance,
  {
    label: string;
    inSentence: string;
    badgeLabel: string;
    hint: string;
    weight: number;
    activeClass: string;
    idleClass: string;
    dotClass: string;
    selectedCardClass: string;
    accentTextClass: string;
    chipClass: string;
  }
>;

/** Every catalogue feature counts once for being relevant equipment. */
export const BASE_FEATURE_WEIGHT = 1;

/**
 * The rung below the three, and the one every feature starts on.
 *
 * Not a fourth importance: there is no such stored value, and a feature
 * sitting here is simply one the reader hasn't singled out — weight 1, like
 * the rest of the catalogue. It exists because the interface needs a *name*
 * for that. "Nothing selected" is an absence, and an absence is what a reader
 * mistakes for "doesn't count"; "Standard" is a state they can see themselves
 * choosing, sitting in the same control as the levels above it, which makes
 * the whole model legible in one glance: everything counts as standard, and
 * you may raise five of them.
 *
 * Grey on purpose. It is the resting state, not a low grade.
 */
export const STANDARD_INFLUENCE = {
  label: "Standard",
  hint: "Counts like everything else in this category",
  /** Stated for the reader of this file; the scorer uses BASE_FEATURE_WEIGHT. */
  weight: BASE_FEATURE_WEIGHT,
  activeClass: "bg-finn-iron/20 text-finn-black",
  idleClass: "text-finn-iron hover:bg-white hover:text-finn-black",
  dotClass: "bg-finn-iron/30",
  accentTextClass: "text-finn-iron",
} as const;

/**
 * What a feature gets when the user picks it without touching the importance
 * control.
 *
 * The middle rung on purpose: picking something already says it matters, and
 * defaulting to either end would put words in their mouth. Leaving every pick
 * in the middle reproduces plain equal weighting, so the importance layer is
 * refinement the user opts into rather than a form they must fill in.
 */
export const DEFAULT_FEATURE_IMPORTANCE: FeatureImportance = "medium";

/** The levels strongest-first, for anything reasoning about weight. */
export const IMPORTANCE_LEVELS = ["high", "medium", "low"] as const;

/**
 * The levels as the user meets them, gentlest first.
 *
 * The control reads left to right as a rising scale, which is the whole point
 * of it — reversing the internal order here keeps that reading in one place
 * instead of in every component that draws the control.
 */
export const IMPORTANCE_SCALE = ["low", "medium", "high"] as const;

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every feature FINN's data exposes, with a plain-English explanation.
 *
 * The explanations exist so a reader never has to leave Lens to look up a
 * term. Each one says what the system actually does — no marketing, no
 * "provides useful everyday assistance", and no claim the data can't support.
 *
 * `article` is set on the countable singulars, so prose reads "it doesn't
 * have a towbar" rather than "it doesn't have towbar". It is data rather than
 * a rule because no heuristic worth having can tell "a sunroof" from "privacy
 * glass" — both are single words ending in a consonant, and only one takes an
 * article. Features without it are plurals or mass nouns and need none.
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
    article: "a",
    label: "Sunroof",
    explanation:
      "A glass panel in the roof. Depending on the car it either slides open or is fixed and only lets light in.",
  },
  hasTowbar: {
    article: "a",
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
    article: "a",
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
    article: "a",
    label: "Heated steering wheel",
    explanation:
      "The rim of the wheel warms up, so you can drive without gloves on a cold morning.",
  },
  hasHeadUpDisplay: {
    article: "a",
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
    article: "a",
    label: "Wireless phone charging",
    explanation:
      "A pad you rest a compatible phone on to charge it without plugging in a cable.",
  },
  hasPremiumSoundSystem: {
    article: "a",
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
    article: "a",
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
    article: "an",
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
    article: "a",
    label: "360° camera",
    explanation:
      "Cameras around the car stitched into a bird's-eye view of the whole car and everything touching it.",
  },
  hasOneEightyDegreesReversingCamera: {
    article: "a",
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
    article: "an",
    label: "Emergency call system (eCall)",
    explanation:
      "Calls the emergency services automatically after a serious crash and sends them your location, even if nobody in the car can speak. There's also a manual button.",
  },
  hasDriverAssistance: {
    article: "a",
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
    article: "an",
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
    article: "a",
    label: "Start/stop system",
    explanation:
      "Switches the engine off when you stop in traffic and restarts it when you pull away, to cut fuel use and idling emissions.",
  },
  hasElectricParkingBrake: {
    article: "an",
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
    article: "a",
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
 * `features` is the **catalogue** — every feature the user may pick out for
 * this category, ordered most relevant first. It is not what they picked.
 *
 * Order is load-bearing twice over: it decides which five are offered as the
 * starting selection, and it is the list a car is judged against when the
 * user picks nothing at all.
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
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
      "hasAdaptiveCruiseControl",
      /* Offered, unselected by default. */
      "hasParkingSensors",
      "hasOneEightyDegreesReversingCamera",
      "hasTrafficSignRecognition",
      "hasRearCrosswalkWarning",
      "hasTirePressureMonitoringSystem",
      "hasParkingAssistant",
      "hasHillStartAssist",
      "hasCruiseControl",
      "hasThreeSixtyDegreesCamera",
      "hasMatrixLedHeadlights",
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
      "hasIsofix",
      "hasSplitFoldingRearSeats",
      "hasParkingSensors",
      "hasElectricTailgate",
      "hasBackUSBPorts",
      /* Offered, unselected by default. */
      "hasOneEightyDegreesReversingCamera",
      "hasThreeZoneAutomaticClimateControls",
      "hasRearCrosswalkWarning",
      "hasThreeSixtyDegreesCamera",
      "hasPrivacyGlass",
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
      "hasSplitFoldingRearSeats",
      "hasElectricTailgate",
      "hasRoofRails",
      "hasTowbar",
      "hasParkingSensors",
      /* Offered, unselected by default. */
      "hasSpareWheel",
      "hasKeylessEntryAndStart",
      "hasElectricallyFoldingMirrors",
      "hasFrontUSBPorts",
      "hasBackUSBPorts",
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
      "hasAdaptiveCruiseControl",
      "hasLumbarSupport",
      "hasIntegratedNavigationSystem",
      "hasHeatedSeats",
      "hasElectricFrontSeatAdjustment",
      /* Offered, unselected by default. */
      "hasCruiseControl",
      "hasAppleCarPlaySlashAndroidAuto",
      "hasRainSlashLightSensors",
      "hasHeadUpDisplay",
      "hasSeatCooling",
      "hasMatrixLedHeadlights",
      "hasPremiumSoundSystem",
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
      "hasAirConditioning",
      "hasHeatedSeats",
      "hasHeatedSteeringWheel",
      "hasRainSlashLightSensors",
      "hasAuxiliaryHeater",
      /* Offered, unselected by default. */
      "hasThreeZoneAutomaticClimateControls",
      "hasSeatCooling",
      "hasFogLights",
      "hasCorneringLights",
      "hasHeadlightCleaningSystem",
      "hasElectricallyFoldingMirrors",
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
      "hasHeatedSeats",
      "hasThreeZoneAutomaticClimateControls",
      "hasHeatedSteeringWheel",
      "hasLumbarSupport",
      "hasLeatherSeats",
      /* Offered, unselected by default. */
      "hasSeatCooling",
      "hasElectricFrontSeatAdjustment",
      "hasKeylessEntryAndStart",
      "hasAppleCarPlaySlashAndroidAuto",
      "hasPremiumSoundSystem",
      "hasAmbientInteriorLightning",
      "hasWirelessChargingStation",
      "hasHeadUpDisplay",
      "hasSunroof",
    ],
  },
} satisfies Record<
  string,
  Omit<CategoryDef, "id"> & {
    numericOnly: boolean;
    features: FeatureId[];
  }
>;

type CategoryId = keyof typeof CATEGORIES;

/* -------------------------------------------------------------------------- */
/* Feature selection rules                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The most features a user may pick out within one priority.
 *
 * A cap on how many things they can single out, not a quota to fill. Picking
 * none is a real answer — "I want the safest car, I just don't have opinions
 * about which systems it has" — and is handled by judging the category on its
 * catalogue alone. See `categoryDetail`.
 */
export const MAX_FEATURES_PER_CATEGORY = 5;

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
 * Two jobs: it is the list the picker draws from, and it is what a car is
 * judged against when the user singles out nothing.
 */
export const AVAILABLE_CATEGORY_FEATURES = Object.fromEntries(
  CATEGORY_IDS.map((id) => [id, CATEGORIES[id].features as FeatureId[]])
) as Record<CategoryId, FeatureId[]>;

/**
 * What a category starts with picked out: nothing.
 *
 * An earlier build pre-selected the five most relevant features. That was
 * defensible when a pick was a weightless hint, and isn't now: a pick says
 * "this matters to me" and carries an importance the user chose, so putting
 * five of them in their mouth before they have said anything is the product
 * inventing preferences and then reasoning from them.
 *
 * Starting empty means a reader who configures nothing is compared on each
 * category's whole catalogue, which is the honest reading of having told us
 * nothing.
 */
export const DEFAULT_CATEGORY_FEATURES = Object.fromEntries(
  CATEGORY_IDS.map((id) => [id, [] as FeatureSelection])
) as Record<CategoryId, FeatureSelection>;

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
