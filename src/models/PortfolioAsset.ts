import mongoose, {Document, Schema} from 'mongoose';
import {IAsset} from "@/models/Asset";

export interface IPortfolioAsset extends Document{
    _id: Schema.Types.ObjectId;
    portfolio_id: Schema.Types.ObjectId;
    asset_id: Schema.Types.ObjectId | IAsset;
    quantity: number;
    avg_buy_price: number;
    currency: string;
    created_at: Date;
}


export const PortfolioAssetSchema = new Schema<IPortfolioAsset>({
    portfolio_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Portfolio'
    },
    asset_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Asset'
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    avg_buy_price: {
        type: Number,
        required: true,
        mind: 0,
    },
    currency:{
        type: String,
        required: true,
        default: "USD"
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});


PortfolioAssetSchema.index({ portfolio_id: 1, asset_id: 1 }, { unique: true });

export const PortfolioAsset = mongoose.models.PortfolioAsset || mongoose.model<IPortfolioAsset>('PortfolioAsset', PortfolioAssetSchema);

export default PortfolioAsset;