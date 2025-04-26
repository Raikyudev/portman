// Constants for page

// Supported currencies for the platform
export const SUPPORTED_CURRENCIES = [
  "USD",
  "CAD",
  "GBP",
  "EUR",
  "JPY",
  "HKD",
  "CNY",
] as const;

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  HKD: "$",
  CNY: "¥",
};

// Supported export formats for the reports
export const REPORT_FORMATS = ["json", "pdf"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

// Currency type for user preferrences
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// Market sorting priority based on user's currency
export const marketPriorityMap: { [key: string]: string[] } = {
  USD: ["NASDAQ", "NYSE", "AMEX"],
  CAD: ["TSX"],
  GBP: ["LSE"],
  EUR: ["Euronext Paris", "Frankfurt"],
  JPY: ["Tokyo"],
  HKD: ["Hong Kong"],
  CNY: ["Shanghai"],
};

// Available report types
export const reportTypes = [
  { value: "income_report", label: "Income Report" },
  { value: "portfolio_report", label: "Portfolio Report" },
  { value: "summary", label: "Summary" },
  { value: "ai_portfolio_summary", label: "AI Portfolio Summary" },
  { value: "ai_account_summary", label: "AI Account Summary" },
];
