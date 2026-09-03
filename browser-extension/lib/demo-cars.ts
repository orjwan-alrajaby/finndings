import type { FeatureId } from "@/lib/reasoning-engine/types";
import type { FuelType, PinnedFinnCar } from "@/lib/types";

/**
 * Three cars that do not exist, so the setup flow can show what Lens does.
 *
 * The last thing onboarding does is run the real engine over these against
 * the priorities the reader has just set, and show them the verdict it
 * produces. That is the only honest way to explain this product: the pitch
 * is "we tell you which one and why", and a page that describes the pitch is
 * strictly worse than one that performs it. It also lets a reader see the
 * output before pinning anything, which is the whole reason they would go
 * and pin anything.
 *
 * They are deliberately not real listings and not real models. Naming them
 * after cars FINN actually rents would put fabricated prices, emissions and
 * equipment lists in front of someone about to spend money, and no amount of
 * labelling makes that safe. Generic descriptions cost nothing here: the
 * reasoning is what is being demonstrated, and it reads the same either way.
 *
 * The names carry a throwaway first word because the narrative layer reads
 * word one as the manufacturer and drops it — "Demo Example Family SUV"
 * reaches the reader as "Example Family SUV". Without the padding word the
 * disclaimer is the first thing stripped from the one sentence most likely
 * to be read, which is exactly backwards.
 *
 * The figures are ordinary for their class — a small EV, a mid-size petrol
 * SUV, a diesel estate — because the demonstration is worthless if the
 * answer it produces is one no real comparison could produce. Each is
 * strongest somewhere different, so every priority order picks a winner for
 * a reason the reader can see.
 */

interface DemoSpec {
    id: number;
    name: string;
    summary: string;
    fuelType: FuelType;
    vehicleType: string;
    monthly: number;
    /** Litres or kWh per 100 km, matching the fuel type. */
    consumption: number;
    co2: number;
    co2Class: string;
    trunk: number;
    seats: string;
    /** Electric range in km. Only meaningful for the electric car. */
    range: number | null;
    features: FeatureId[];
}

const DEMO_SPECS: DemoSpec[] = [
    {
        id: -1,
        name: "Demo Example Compact Electric",
        summary: "A small electric hatchback — cheap to run, short on space.",
        fuelType: "Electric",
        vehicleType: "Hatchback",
        monthly: 449,
        consumption: 16.5,
        co2: 0,
        co2Class: "A",
        trunk: 310,
        seats: "5",
        range: 380,
        features: [
            "hasEmergencyBrakingAssist",
            "hasLaneKeepingAssist",
            "hasAdaptiveCruiseControl",
            "hasParkingSensors",
            "hasOneEightyDegreesReversingCamera",
            "hasTirePressureMonitoringSystem",
            "hasEmergencyCallSystem",
            "hasIsofix",
            "hasSplitFoldingRearSeats",
            /* Electric cars pre-condition from the mains; the kit follows. */
            "hasHeatedSeats",
            "hasHeatedSteeringWheel",
            "hasAirConditioning",
            "hasRainSlashLightSensors",
            "hasAppleCarPlaySlashAndroidAuto",
            "hasKeylessEntryAndStart",
        ],
    },
    {
        id: -2,
        name: "Demo Example Family SUV",
        summary: "A mid-size petrol SUV — room and equipment, thirstier.",
        fuelType: "Petrol",
        vehicleType: "SUV",
        monthly: 629,
        consumption: 7.4,
        co2: 168,
        co2Class: "E",
        trunk: 620,
        seats: "5",
        range: null,
        features: [
            "hasEmergencyBrakingAssist",
            "hasBlindSpotAssist",
            "hasLaneKeepingAssist",
            "hasAdaptiveCruiseControl",
            "hasOneEightyDegreesReversingCamera",
            "hasThreeSixtyDegreesCamera",
            "hasParkingAssistant",
            "hasParkingSensors",
            "hasTrafficSignRecognition",
            "hasRearCrosswalkWarning",
            "hasEmergencyCallSystem",
            "hasTirePressureMonitoringSystem",
            "hasIsofix",
            "hasSplitFoldingRearSeats",
            "hasElectricTailgate",
            "hasRoofRails",
            "hasTowbar",
            "hasThreeZoneAutomaticClimateControls",
            "hasBackUSBPorts",
            "hasFrontUSBPorts",
            "hasAppleCarPlaySlashAndroidAuto",
            /*
             * No heated seats, no lumbar, no powered seats: the space and the
             * safety kit are the point, and the seats are where a car at this
             * price pays for them.
             */
        ],
    },
    {
        id: -3,
        name: "Demo Example Touring Estate",
        summary: "A diesel estate — built for distance, middling on emissions.",
        fuelType: "Diesel",
        vehicleType: "Estate",
        monthly: 549,
        consumption: 5.4,
        co2: 142,
        co2Class: "D",
        trunk: 640,
        seats: "5",
        range: null,
        features: [
            "hasEmergencyBrakingAssist",
            "hasBlindSpotAssist",
            "hasLaneKeepingAssist",
            "hasAdaptiveCruiseControl",
            "hasEmergencyCallSystem",
            "hasTirePressureMonitoringSystem",
            "hasParkingSensors",
            /* Where it actually wins: three hours at a time. */
            "hasLumbarSupport",
            "hasElectricFrontSeatAdjustment",
            "hasHeatedSeats",
            "hasHeatedSteeringWheel",
            "hasSeatCooling",
            "hasIntegratedNavigationSystem",
            "hasHeadUpDisplay",
            "hasAppleCarPlaySlashAndroidAuto",
            "hasPremiumSoundSystem",
            "hasCruiseControl",
            "hasIsofix",
            "hasSplitFoldingRearSeats",
            "hasRoofRails",
            /*
             * No reversing camera, no 360, no powered tailgate: an older
             * estate's cabin is the investment and the parking kit isn't.
             */
        ],
    },
];

/** Whether a car is one of the examples rather than something FINN listed. */
export function isDemoCar(car: { id: number }): boolean {
    return car.id < 0;
}

/** A one-line description of an example car, for the UI that shows them. */
export function demoCarSummary(id: number): string {
    return DEMO_SPECS.find((spec) => spec.id === id)?.summary ?? "";
}

function build(spec: DemoSpec): PinnedFinnCar {
    const features: Record<string, boolean> = {};

    for (const feature of spec.features) features[feature] = true;

    return {
        id: spec.id,
        name: spec.name,
        brand: "Demo",
        model: spec.name,
        trim: "",
        year: "2025",
        engine: "",
        equipmentLine: "",

        fuelType: spec.fuelType,
        transmission: "Automatic",
        driveType: "Front-Wheel Drive",

        power: { inKw: 110, inHp: 150 },

        isRefurbished: false,
        vehicleType: spec.vehicleType,
        doors: "5",

        availability: {
            expectedHandover: { from: null, to: undefined },
            from: null,
            to: null,
            deviationWeeks: null,
            defaultDownPaymentTermInMonths: 6,
        },

        pricing: {
            grossValue: 0,
            customerMonthly: { price: spec.monthly, oldPrice: null },
            businessMonthly: {
                price: Math.round(spec.monthly * 0.84),
                oldPrice: null,
            },
            extraKmPrice: 0.2,
            currency: "€",
        },

        consumption: {
            combined: spec.consumption,
            city: null,
            highway: null,
            unit: spec.fuelType === "Electric" ? "kWh/100Km" : "L/100Km",
        },

        co2: { value: spec.co2, class: spec.co2Class, unit: "g/km" },

        electric:
            spec.fuelType === "Electric"
                ? {
                      range: spec.range ?? "Unknown",
                      batteryCapacity: 58,
                      rangeUnit: "km",
                      batteryUnit: "kWh",
                  }
                : null,

        capacity: {
            trunk: String(spec.trunk),
            trunkUnit: "L",
            seats: spec.seats,
        },

        color: { id: "grey", name: "Grey", hex: "#8A8F98" },

        images: { thumbnail: "", gallery: [] },

        features,

        dimensions: { length: 4500, width: 1820, height: 1550, unit: "mm" },

        /* Never linked anywhere — these cars have no page to open. */
        url: "",
        pinnedAt: "",
    };
}

export function demoCars(): PinnedFinnCar[] {
    return DEMO_SPECS.map(build);
}
