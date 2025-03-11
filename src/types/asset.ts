import { IAsset } from "@/models/Asset";

export interface IExtendedAsset extends IAsset {
  change: number;
}
