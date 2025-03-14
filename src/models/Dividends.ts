import mongoose, { Schema, Document } from "mongoose";

export interface IDividend extends Document {
  _id: Schema.Types.ObjectId;
  portfolio_id: mongoose.Types.ObjectId;
  asset_id: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  status: string;
}

// Define the Dividends schema
const DividendSchema: Schema = new Schema({
  portfolio_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Portfolio",
    required: true,
  },
  asset_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
});

export const Dividends =
  mongoose.models.Dividends ||
  mongoose.model<IDividend>("Dividend", DividendSchema);

export default Dividends;
