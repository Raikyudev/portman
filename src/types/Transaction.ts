import { ITransaction } from "@/models/Transaction";

export interface IExtendedTransaction extends ITransaction {
  asset_details: { symbol: string };
}
