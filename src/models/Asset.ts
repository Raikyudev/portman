import mongoose, { Document, Schema } from "mongoose";

export interface IAsset extends Document {
  _id: Schema.Types.ObjectId;
  symbol: string;
  name: string;
  asset_type: string;
  price: number;
  market: string;
}

const assetSchema: Schema = new mongoose.Schema({
  symbol: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  asset_type: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    default: 0.0,
  },
  market: {
    type: String,
    required: true,
  },
});
assetSchema.index({ symbol: "text", name: "text" }); // Text index for full-text search
assetSchema.index({ name: 1 }); // Index for name matching
const Asset =
  mongoose.models.Asset || mongoose.model<IAsset>("Asset", assetSchema);

export default Asset;
