import type { DriveType, FinnApiConfig } from "@/lib/types";
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
 * Presence of the list is the whole test, not what is in it. A list that says
 * false to all fifty features is FINN answering the question — that is a bare
 * car, and it is exactly the case that used to be mistaken for missing data.
 */
export function hasSuppliedEquipment(config: FinnApiConfig): boolean {
  const list = config.closed_features_list;

  if (!list || typeof list !== "object") return false;

  return Object.keys(list).length > 0;
}

export function extractFeatures(config: FinnApiConfig): Record<string, boolean> {
  const features = Object.fromEntries(
    Object.entries(FEATURE_KEYS).map(([key, germanName]) => [
      key,
      Boolean(getFeature(config, germanName)),
    ])
  ) as Record<keyof typeof FEATURE_KEYS, boolean>;

  return {
    ...features,
    hasTowbar: config.has_hitch === "true",
  };
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

export function extractPricing(config: FinnApiConfig) {
  type PriceKeys = keyof typeof config.downpayment_prices.available_price_list;
  const term = config.default_downpayment_term;
  const prices = config.downpayment_prices;

  const priceFor = (audience: "b2c" | "b2b") => ({
    price: prices.available_price_list?.[`${audience}_${term}` as PriceKeys] ?? 0,
    oldPrice: prices.available_price_list?.[`${audience}_${term}_old` as PriceKeys] ?? null,
  });

  return {
    grossValue: prices?.msrp ?? null,
    customerMonthly: priceFor("b2c"),
    businessMonthly: priceFor("b2b"),
    extraKmPrice: prices?.extra_km_price ?? null,
    currency: "€",
  };
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