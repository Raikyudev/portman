import { IPortfolioAsset } from "@/models/PortfolioAsset";
import { IPortfolio } from "@/models/Portfolio";
import { IPortfolioHistory } from "@/models/PortfolioHistory";
import { Schema } from "mongoose";
import { reportTypes } from "@/lib/constants";

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

export type ReportType = (typeof reportTypes)[number]["value"];

export interface PortfolioData {
  fromDate?: string;
  toDate: string;
  reportType: ReportType;
  portfolios: PortfolioDetails[];
  portfolioHoldings: Record<string, PortfolioHoldings>;
}
