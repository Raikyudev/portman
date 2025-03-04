import { IPortfolioAsset } from "@/models/PortfolioAsset";

export interface IExtendedPortfolioAsset extends IPortfolioAsset {
  asset_info: { symbol: string; name: string };
}
