import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // Returns "2025-03-01" as of current date
}
