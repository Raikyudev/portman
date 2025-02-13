import mongoose, {Document, Schema} from 'mongoose';

export interface IPortfolioAsset extends Document{
    _id: Schema.Types.ObjectId;
    portfolio_id: Schema.Types.ObjectId;
    asset_id: Schema.Types.ObjectId;
    quantity: number;
    avg_buy_price: number;
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
        required: true
    },
    avg_buy_price: {
        type: Number,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

export const PortfolioAsset = mongoose.models.PortfolioAsset || mongoose.model<IPortfolioAsset>('PortfolioAsset', PortfolioAssetSchema);

export default PortfolioAsset;