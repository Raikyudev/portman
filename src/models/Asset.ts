import mongoose, {Document, Schema} from 'mongoose';


export interface IAsset extends Document{
    symbol: string;
    name: string;
    asset_type: string;
    price: number;
    currency: string;
}

const assetSchema:Schema = new mongoose.Schema({
    symbol:{
        type: String,
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
    }
})

const Asset = mongoose.model<IAsset>('Asset',assetSchema);

export default Asset;