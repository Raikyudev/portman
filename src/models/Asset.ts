import mongoose, {Document, Schema} from 'mongoose';


export interface IAsset extends Document{
    _id: Schema.Types.ObjectId;
    symbol: string;
    name: string;
    asset_type: string;
    price: number;
    currency: string;
    market: string;
}

const assetSchema:Schema = new mongoose.Schema({
    symbol:{
        type: String,
        unique: true,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    asset_type:{
        type: String,
        required: true,
    },
    price:{
        type: Number,
        default: 0.0
    },
    currency:{
        type: String,
        required: true,
    },
    market:{
        type: String,
        required: true,
    }
})

const Asset = mongoose.models.Asset || mongoose.model<IAsset>('Asset',assetSchema);

export default Asset;