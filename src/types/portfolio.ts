import { IPortfolioAsset } from "@/models/PortfolioAsset";
import { IPortfolio } from "@/models/Portfolio";
import { IPortfolioHistory } from "@/models/PortfolioHistory";
import { Schema } from "mongoose";

export interface IExtendedPortfolioAsset extends IPortfolioAsset {
  asset_info: { symbol: string; name: string };
}

export interface IExtendedPortfolio extends IPortfolio {
  port_total_value: number;
}

export interface IExtendedPortfolioHistory extends IPortfolioHistory {
  user_id: Schema.Types.ObjectId;
}

export interface PortfolioDetails {
  _id: string;
  name: string;
  description: string;
}

export interface PortfolioHoldings {
  stockHoldingsFrom: Record<string, { quantity: number; value: number }>;
  stockHoldingsTo: Record<string, { quantity: number; value: number }>;
  portfolioValueFrom: number;
  portfolioValueTo: number;
  periodProfits: Record<string, number>;
}

export interface PortfolioData {
  fromDate?: string;
  toDate: string;
  reportType: "income_report" | "portfolio_report" | "summary";
  portfolios: PortfolioDetails[];
  portfolioHoldings: Record<string, PortfolioHoldings>; // Map of portfolio _id to its holdings and values
}
