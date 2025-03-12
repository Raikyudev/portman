import { IExtendedPortfolioAsset } from "@/types/portfolio";

interface PortfolioAssetItemProps {
  asset: IExtendedPortfolioAsset;
}

export default function PortfolioAssetItem({ asset }: PortfolioAssetItemProps) {
  console.log("asset:");
  console.log(asset);
  return (
    <li>
      <strong>{asset.asset_info.symbol}</strong> - {asset.asset_info.name}
      <br />
      <span>Quantity: {asset.quantity}</span> |{" "}
      <span>Avg Buy Price: {asset.avg_buy_price}</span>
    </li>
  );
}
