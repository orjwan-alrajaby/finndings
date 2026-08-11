import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import type { ToastCarDetails, ToastType } from "../types.dom";

const toastClasses: Record<ToastType, string> = {
  info: "finn-lens-toast-info",
  success: "finn-lens-toast-success",
  warning: "finn-lens-toast-warning",
  error: "finn-lens-toast-error",
};


function determineSubtitle(equipmentLine: string | null, engine: string, trim: string) {
  if (!equipmentLine) return `${engine} ${trim}`;
  if (equipmentLine.length <= 10) return `${equipmentLine} ${trim}`;
  return equipmentLine;
}

export function createToast(
  message: string,
  type: ToastType,
  car: ToastCarDetails | null,
) {
  return Toastify({
    text: car ? `
      <div class="finn-lens-toast-content">
        <div class="finn-lens-toast-message">
          ${message}
        </div>
        <div class="finn-lens-toast-car-name">
          ${car.name}
        </div>
        <div class="finn-lens-toast-car-details">
          ${determineSubtitle(car?.equipmentLine, car.engine, car.trim)}
        </div>
      </div>
    `: message,
    duration: 10000,
    gravity: "bottom",
    position: "right",
    close: true,
    stopOnFocus: true,
    escapeMarkup: false,
    className: `finn-lens-toast ${toastClasses[type]}`,
  });
}