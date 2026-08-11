export type ToastType = "info" | "success" | "warning" | "error";

export type ToastCarDetails = {
  name: string;
  engine: string;
  trim: string;
  equipmentLine: string | null;
};