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
