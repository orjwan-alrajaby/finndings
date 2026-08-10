import { extractFeatures, extractAvailability, extractPricing } from "@/lib/helpers";

export type FinnApiConfig = {
  uid: number;
  config_id: number;

  brand: {
    id: string;
    picture: { url: string };
  };

  model: string;
  model_year: string;
  engine: string;
  trim_name: string;

  fuel: "Benzin" | "Diesel" | "Elektro" | "Plug-in Hybrid";
  gearshift: "Automatik" | "Manuell";
  config_drive: string;

  cartype: string;
  power: number;
  seats: string;
  doors: string;

  default_downpayment_term: number;

  downpayment_prices: {
    msrp: number;
    available_price_list: {
      b2b_6?: number;
      b2b_12?: number;
      b2c_6?: number;
      b2c_6_old?: number;
      b2c_12?: number;
      b2c_12_old?: number;
    };
    extra_km_price: number;
  };

  availability_by_term: {
    [key: number]: {
      available_from: string;
      available_to: string;
      deviation_in_weeks: number;
    };
  };

  consumption: number;
  consumption_city: number | null;
  consumption_highway: number | null;

  co2emission: number;
  co2_class: string;

  ev_range: number;
  battery_capacity: number;

  trunk_capacity: number;

  color: {
    id: string;
    specific: string;
    color_hex: string;
  };

  picture: {
    url: string;
    type: string;
  };
  pictures: Array<{
    url: string;
    type: string;
  }>;

  closed_features_list?: Record<string, boolean | string | number>;
  downpayment_fixed_amount?: number;

  vehicle_size: {
    length_mm: number;
    width_mm: number;
    height_mm: number;
  };

  is_refurbished: boolean;
  has_hitch: "true" | "false";
};

export type AvailabilityType = "now" | "soon" | "days" | "weeks" | "months";

export type FuelType = "Electric" | "Diesel" | "Petrol" | "Plug-in Hybrid";

export type Transmission = "Automatic" | "Manual";

export type DriveType =
  | "Front-Wheel Drive"
  | "Rear-Wheel Drive"
  | "All-Wheel Drive"
  | "Unknown";

export type ConsumptionUnit = "L/100Km" | "kWh/100Km";

export type DiscountType = { percentage: string; amount: number };

export interface FinnCar {
  id: number;

  name: string;
  brand: string;
  model: string;
  trim: string;
  year: string;
  engine: string;

  fuelType: FuelType;
  transmission: Transmission;
  driveType: DriveType;

  power: {
    inKw: number;
    inHp: number;
  };

  isRefurbished: boolean;
  vehicleType: string;
  doors: string;

  availability: ReturnType<typeof extractAvailability>;
  pricing: ReturnType<typeof extractPricing>;

  consumption: {
    combined: number;
    city: number | null;
    highway: number | null;
    unit: ConsumptionUnit;
  };

  co2: {
    value: number;
    class: string;
    unit: "g/km";
  };

  electric: {
    range: number | "Unknown";
    batteryCapacity: number | "Unknown";
    rangeUnit: "km";
    batteryUnit: "kWh";
  } | null;

  capacity: {
    trunk: string;
    trunkUnit: "L";
    seats: string;
  };

  color: {
    id: string;
    name: string;
    hex: string;
  };

  images: {
    thumbnail: string;
    gallery: string[];
  };

  features: ReturnType<typeof extractFeatures>;

  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: "mm";
  };
}

export interface PinnedFinnCar extends FinnCar {
  url: string;
  pinnedAt: string;
}