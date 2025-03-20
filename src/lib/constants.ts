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

export const reportTypes = [
  { value: "income_report", label: "Income Report" },
  { value: "portfolio_report", label: "Portfolio Report" },
  { value: "summary", label: "Summary" },
  { value: "ai_portfolio_summary", label: "AI Portfolio Summary" },
  { value: "ai_account_summary", label: "AI Account Summary" },
];
