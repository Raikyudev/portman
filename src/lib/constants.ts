export const SUPPORTED_CURRENCIES = [
  "USD",
  "CAD",
  "GBP",
  "EUR",
  "JPY",
  "HKD",
  "CNY",
] as const;

export const REPORT_FORMATS = ["json", "pdf"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const marketPriorityMap: { [key: string]: string[] } = {
  USD: ["NASDAQ", "NYSE", "AMEX"],
  CAD: ["TSX"],
  GBP: ["LSE"],
  EUR: ["Euronext Paris", "Frankfurt"],
  JPY: ["Tokyo"],
  HKD: ["Hong Kong"],
  CNY: ["Shanghai"],
};
