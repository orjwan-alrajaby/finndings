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
 * **The marques are invented, and every field around them is shaped like a
 * real listing.** Those two things sound opposed and are not. Naming these
 * after cars FINN actually rents would put fabricated prices, emissions and
 * equipment in front of someone about to spend money, and no amount of
 * labelling makes that safe — so Aveline, Norvane and Halden are not
 * manufacturers, and never will be.
 *
 * But they were previously called things like "Example Compact Electric",
 * which does not read as the name of a car, and a demonstration that looks
 * like placeholder text argues for a product that produces placeholder
 * answers. So they now carry a marque, a model, a trim, an equipment line, an
 * engine and a year, the way everything the panel and the advice page render
 * does — because those fields are what `configurationName` and
 * `configurationDetail` draw, and a preview that leaves them empty is
 * previewing a page nobody will ever see.
 *
 * The honesty moved to where it belongs rather than being deleted: the screen
 * that shows these says, above them and unmissably, that the cars are
 * examples and do not exist, and each row carries the word.
 *
 * The figures are ordinary for their class — a small EV, a mid-size petrol
 * SUV, a diesel estate — because the demonstration is worthless if the
 * answer it produces is one no real comparison could produce. Each is
 * strongest somewhere different, so every priority order picks a winner for
 * a reason the reader can see.
 */

interface DemoSpec {
    id: number;
    /** An invented marque. See the note above about why it isn't a real one. */
    brand: string;
    model: string;
    /** The configuration, the way FINN names one. */
    trim: string;
    equipmentLine: string;
    engine: string;
    year: string;
    summary: string;
    fuelType: FuelType;
    vehicleType: string;
    power: { inKw: number; inHp: number };
    monthly: number;
    /** €/km past FINN's included allowance. */
    extraKmPrice: number;
    /** Litres or kWh per 100 km, matching the fuel type. */
    consumption: number;
    co2: number;
    co2Class: string;
    trunk: number;
    seats: string;
    doors: string;
    /** Electric range in km. Only meaningful for the electric car. */
    range: number | null;
    batteryCapacity: number | null;
    features: FeatureId[];
}

const DEMO_SPECS: DemoSpec[] = [
    {
        id: -1,
        brand: "Aveline",
        model: "Lumo",
        trim: "Boost",
        equipmentLine: "Comfort",
        engine: "58 kWh Electric",
        year: "2025",
        summary: "Small electric hatchback — cheapest to run, tightest on space.",
        fuelType: "Electric",
        vehicleType: "Hatchback",
        power: { inKw: 115, inHp: 156 },
        monthly: 449,
        extraKmPrice: 0.19,
        consumption: 16.5,
        co2: 0,
        co2Class: "A",
        trunk: 310,
        seats: "5",
        doors: "5",
        range: 380,
        batteryCapacity: 58,
        features: [
            /*
             * A new compact EV is not a stripped-out car. Assistance and
             * cabin tech are where this class competes — it is the boot, the
             * towing and the long-haul seats it gives up, and those are what
             * the other two are here to win on.
             */
            "hasEmergencyBrakingAssist",
            "hasBlindSpotAssist",
            "hasLaneKeepingAssist",
            "hasAdaptiveCruiseControl",
            "hasParkingSensors",
            "hasOneEightyDegreesReversingCamera",
            "hasTrafficSignRecognition",
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
            "hasWirelessChargingStation",
            "hasAmbientInteriorLightning",
            "hasElectricFrontSeatAdjustment",
            "hasKeylessEntryAndStart",
        ],
    },
    {
        id: -2,
        brand: "Norvane",
        model: "Kestros",
        trim: "Style",
        equipmentLine: "Plus",
        engine: "1.5 TSI Petrol",
        year: "2025",
        summary: "Mid-size petrol SUV — the space and the safety kit, thirstier.",
        fuelType: "Petrol",
        vehicleType: "SUV",
        power: { inKw: 110, inHp: 150 },
        monthly: 629,
        extraKmPrice: 0.24,
        consumption: 7.4,
        co2: 168,
        co2Class: "E",
        trunk: 620,
        seats: "5",
        doors: "5",
        range: null,
        batteryCapacity: null,
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
        brand: "Halden",
        model: "Verrow Estate",
        trim: "Elegance",
        equipmentLine: "",
        engine: "2.0 TDI Diesel",
        year: "2024",
        summary: "Diesel estate — built for three hours at a time, middling emissions.",
        fuelType: "Diesel",
        vehicleType: "Estate",
        power: { inKw: 147, inHp: 200 },
        monthly: 549,
        extraKmPrice: 0.21,
        consumption: 5.4,
        co2: 142,
        co2Class: "D",
        trunk: 640,
        seats: "5",
        doors: "5",
        range: null,
        batteryCapacity: null,
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
        name: `${spec.brand} ${spec.model}`,
        brand: spec.brand,
        model: spec.model,
        trim: spec.trim,
        year: spec.year,
        engine: spec.engine,
        equipmentLine: spec.equipmentLine,

        fuelType: spec.fuelType,
        transmission: "Automatic",
        driveType: spec.fuelType === "Diesel" ? "All-Wheel Drive" : "Front-Wheel Drive",

        power: spec.power,

        isRefurbished: false,
        vehicleType: spec.vehicleType,
        doors: spec.doors,

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
            extraKmPrice: spec.extraKmPrice,
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
                      batteryCapacity: spec.batteryCapacity ?? "Unknown",
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
