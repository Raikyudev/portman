import mongoose, { Document, Schema } from "mongoose";

export interface ICurrencyRate extends Document {
  _id: Schema.Types.ObjectId;
  currency: string;
  rate: number;
  last_updated: Date;
}

const CurrencyRateSchema = new Schema({
  currency: {
    type: String,
    required: true,
    unique: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  last_updated: {
    type: Date,
    default: Date.now,
  },
});

export const CurrencyRate =
  mongoose.models.CurrencyRate ||
  mongoose.model<ICurrencyRate>("CurrencyRate", CurrencyRateSchema);

export default CurrencyRate;
