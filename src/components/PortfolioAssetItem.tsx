import { IExtendedPortfolioAsset } from "@/types/portfolio";
import WatchlistButton from "./WatchlistButton";

interface PortfolioAssetItemProps {
  asset: IExtendedPortfolioAsset;
}

export default function PortfolioAssetItem({ asset }: PortfolioAssetItemProps) {
  return (
    <li>
      <strong>{asset.asset_info.symbol}</strong> - {asset.asset_info.name}
      <br />
      <span>Quantity: {asset.quantity}</span> |{" "}
      <span>
        Avg Buy Price: {asset.avg_buy_price} ({asset.currency})
      </span>
      <WatchlistButton assetId={asset._id.toString()} />
    </li>
  );
}
