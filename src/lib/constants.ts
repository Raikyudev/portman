export const SUPPORTED_CURRENCIES = [
  "USD",
  "CAD",
  "GBP",
  "EUR",
  "JPY",
  "HKD",
  "CNY",
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const REPORT_FORMATS = ["csv", "xlsx", "pdf"] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];
