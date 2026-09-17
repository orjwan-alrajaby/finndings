import type { ContractOffer, ContractTerm, DriveType, FinnApiConfig } from "@/lib/types";
import { addTimeToDate } from "@/lib/utils";

export function brand(config: FinnApiConfig) {
  return {
    name: config.brand.id,
    logo: config.brand.picture.url,
  };
}

export function getFeature(config: FinnApiConfig, featureName: string) {
  return config.closed_features_list?.[featureName];
}

const FEATURE_KEYS = {
  // exterior
  hadLedLights: "LED-Scheinwerfer",
  hasFogLights: "Nebelscheinwerfer",
  hasMatrixLedHeadlights: "Matrix-LED-Scheinwerfer",
  hasSunroof: "Schiebedach / Panoramadach / Glasdach",
  hasPrivacyGlass: "Privacy-Glas",
  hasRoofRails: "Dachreling",
  hasElectricallyFoldingMirrors: "Elektrisch einklappbare Spiegel",
  hasRainSlashLightSensors: "Regen-/Lichtsensor",
  hasHeadlightCleaningSystem: "Scheinwerferreinigungsanlage",
  hasCorneringLights: "Kurvenlicht",

  // interior
  hasHeatedSeats: "Sitzheizung",
  hasSeatCooling: "Sitzkühlung",
  hasAirConditioning: "Klimaanlage",
  hasThreeZoneAutomaticClimateControls: "Drei-Zonen-Klimaautomatik",
  hasLeatherSeats: "Ledersitze",
  hasElectricFrontSeatAdjustment: "Elektrische Vordersitzeinstellung",
  hasAmbientInteriorLightning: "Ambientebeleuchtung im Innenraum",
  hasLumbarSupport: "Lendenwirbelstütze",
  hasHeatedSteeringWheel: "Beheizbares Lenkrad",
  hasHeadUpDisplay: "Head-up-Display",
  hasAppleCarPlaySlashAndroidAuto: "Apple CarPlay / Android Auto",
  hasWirelessChargingStation: "Kabellose Ladestation",
  hasPremiumSoundSystem: "Premium-Soundsystem",
  hasIntegratedNavigationSystem: "Navigationssystem integriert",

  // safety & driver assistance
  hasAdaptiveCruiseControl: "Adaptive Geschwindigkeitsregelung",
  hasCruiseControl: "Tempomat",
  hasIsofix: "Isofix",
  hasLaneKeepingAssist: "Spurhalteassistent",
  hasParkingAssistant: "Parkassistent",
  hasParkingSensors: "Parksensoren",
  hasAuxiliaryHeater: "Standheizung",
  hasBlindSpotAssist: "Toter-Winkel-Assistent",
  hasRearCrosswalkWarning: "Verkehrsquerenwarnung hinten",
  hasThreeSixtyDegreesCamera: "360°-Kamera",
  hasOneEightyDegreesReversingCamera: "180°- / Rückfahrkamera",
  hasHillStartAssist: "Berganfahrhilfe",
  hasTirePressureMonitoringSystem: "Reifendruckkontrollsystem",
  hasTrafficSignRecognition: "Verkehrszeichenerkennung", // good for people with visual impairments
  hasEmergencyBrakingAssist: "Notbremsassistent",
  hasEmergencyCallSystem: "Notrufsystem (eCall)", // aka eCall
  hasDriverAssistance: "Fahrerassistenz",

  // comfort
  hasKeylessEntryAndStart: "Keyless Entry & Start",
  hasElectricTailgate: "Elektrische Heckklappe",
  hasSplitFoldingRearSeats: "Geteilte Rücksitzlehnen",
  hasBackUSBPorts: "USB-Anschlüsse hinten",
  hasFrontUSBPorts: "USB-Anschlüsse vorne",
  hasStartSlashStopSystem: "Start/Stopp-System",
  hasElectricParkingBrake: "Elektrische Parkbremse",

  // tires & wheels
  hasAlloyWheels: "Leichtmetallräder",
  hasSpareWheel: "Ersatzrad",
} as const;

/**
 * Whether FINN supplied an equipment list for this car at all.
 *
 * The one question `extractFeatures` cannot answer afterwards. It reads a
 * German equipment list and turns everything it can't find into `false`, so
 * by the time anyone downstream sees the result, a car FINN told us nothing
 * about looks exactly like a car FINN told us has nothing — every key false,
 * in both cases.
 *
 * Those are completely different claims. "It doesn't have adaptive cruise
 * control" is a fact worth scoring and worth saying out loud; "we don't know
 * what it has" is a gap, and reporting it as the first is the product
 * inventing an absence. So the answer is taken here, where the raw response
 * is still in hand, and carried on the car.
 *
 * A list with no `true` in it is not an answer. FINN sends every key on every
 * car, so presence alone proves nothing, and in the September 2026 inventory
 * the cars whose lists say false to everything are an MG 4 Urban and two BYDs
 * — cars that plainly carry emergency braking and air conditioning. What FINN
 * sent there is an unfilled form, and it is read as "not supplied".
 */
export function hasSuppliedEquipment(config: FinnApiConfig): boolean {
  const list = config.closed_features_list;

  if (!list || typeof list !== "object") return false;

  return Object.values(list).includes(true);
}

export function extractFeatures(config: FinnApiConfig): Record<string, boolean> {
  const features = Object.fromEntries(
    Object.entries(FEATURE_KEYS).map(([key, germanName]) => [
      key,
      getFeature(config, germanName) === true,
    ])
  ) as Record<keyof typeof FEATURE_KEYS, boolean>;

  return {
    ...features,
    /*
     * FINN lists keyless entry and start either as one entry or as two, and
     * the two disagree on 82 cars. Either way of saying it counts.
     */
    hasKeylessEntryAndStart:
      features.hasKeylessEntryAndStart ||
      (getFeature(config, "Keyless Entry") === true &&
        getFeature(config, "Keyless Start") === true),
    hasTowbar: config.has_hitch === "true",
  };
}

/**
 * FINN's driver assistance level: "Level 1" or "Level 2".
 *
 * Null when the entry is missing or says something else, so an unlisted level
 * reads as unknown rather than as level 1.
 */
export function extractDriverAssistanceLevel(config: FinnApiConfig): 1 | 2 | null {
  const value = getFeature(config, "Fahrerassistenz");

  if (value === "Level 2") return 2;
  if (value === "Level 1") return 1;

  return null;
}

/** "26 Min." → 26. Null for anything that isn't a positive number of minutes. */
export function extractDcChargeMinutes(config: FinnApiConfig): number | null {
  const value = getFeature(config, "Ladezeit DC (10–80%)");

  if (typeof value === "number") return value > 0 ? value : null;
  if (typeof value !== "string") return null;

  const minutes = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

export function extractAvailability(config: FinnApiConfig) {
  const term = config.default_downpayment_term;
  const termAvailability = config.availability_by_term?.[term];
  const availableFrom = termAvailability?.available_from ?? null;

  return {
    expectedHandover: {
      from: availableFrom,
      to: addTimeToDate(availableFrom ?? "", termAvailability?.deviation_in_weeks ?? 0, "weeks"),
    },
    from: availableFrom,
    to: termAvailability?.available_to ?? null,
    deviationWeeks: termAvailability?.deviation_in_weeks ?? null,
    defaultDownPaymentTermInMonths: term,
  };
}

/**
 * The monthly price Lens quotes when the reader hasn't said how long they want
 * the car: FINN's own default term, with nothing paid upfront.
 *
 * This used to read `downpayment_prices` — FINN's price *after* a €1,500 down
 * payment — and never counted the €1,500, so every car looked about €125 a
 * month cheaper over twelve months than it is. The plain `price` object is
 * the no-down-payment price, and it is the one read now.
 */
export function extractPricing(config: FinnApiConfig) {
  const offer = extractContract(config);
  const term =
    offer.terms.find((item) => item.months === offer.defaultMonths) ??
    offer.terms[0];

  return {
    grossValue: config.downpayment_prices?.msrp ?? null,
    // 0 means "not supplied" downstream; see advertisedMonthlyPrice.
    customerMonthly: { price: term?.privateMonthly ?? 0, oldPrice: null },
    businessMonthly: { price: term?.businessMonthly ?? 0, oldPrice: null },
    extraKmPrice: config.downpayment_prices?.extra_km_price ?? null,
    currency: "€",
  };
}

const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/**
 * Every contract term FINN offers, with its no-down-payment price and its
 * delivery window.
 *
 * `available_terms` is the list of what can be booked. The price object also
 * carries figures for terms that aren't on offer — a car sold only on six
 * months still lists a 24-month price — so prices are read through that list
 * and never the other way round.
 */
export function extractContract(config: FinnApiConfig): ContractOffer {
  const offered = Array.isArray(config.available_terms)
    ? config.available_terms
    : [];

  const terms = [...new Set(offered)]
    .filter((months) => Number.isInteger(months) && months > 0)
    .sort((a, b) => a - b)
    .map((months): ContractTerm => {
      const window = config.availability_by_term?.[String(months)];

      return {
        months,
        privateMonthly: positive(config.price?.[`b2c_${months}`]),
        businessMonthly: positive(config.price?.[`b2b_${months}`]),
        deliveryFrom: window?.available_from?.slice(0, 10) ?? null,
        deliveryTo: window?.available_to?.slice(0, 10) ?? null,
        deviationWeeks:
          typeof window?.deviation_in_weeks === "number"
            ? window.deviation_in_weeks
            : null,
      };
    });

  const defaultMonths = terms.some((item) => item.months === config.default_term)
    ? (config.default_term as number)
    : null;

  return { terms, defaultMonths };
}

const DRIVE_TYPE_MAP: Record<string, DriveType> = {
  awd: "All-Wheel Drive",
  allrad: "All-Wheel Drive",
  allradantrieb: "All-Wheel Drive",
  frontantrieb: "Front-Wheel Drive",
  fwd: "Front-Wheel Drive",
  hinterradantrieb: "Rear-Wheel Drive",
  rwd: "Rear-Wheel Drive",
  heckantrieb: "Rear-Wheel Drive",
};

export function extractDriveType(config: FinnApiConfig): DriveType {
  return DRIVE_TYPE_MAP[config.config_drive.toLowerCase()] ?? "Unknown";
}