import mongoose, { Document, Schema } from "mongoose";

export interface IPortfolioHistory extends Document {
  _id: Schema.Types.ObjectId;
  portfolio_id: Schema.Types.ObjectId;
  port_history_date: Date;
  port_total_value: number;
  port_total_value_currency: string;
}

const PortfolioHistorySchema = new Schema<IPortfolioHistory>({
  portfolio_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Portfolio",
  },
  port_history_date: {
    type: Date,
    default: Date.now,
  },
  port_total_value: {
    type: Number,
    required: true,
  },
});
export const PortfolioHistory =
  mongoose.models.PortfolioHistory ||
  mongoose.model<IPortfolioHistory>("PortfolioHistory", PortfolioHistorySchema);

export default PortfolioHistory;
