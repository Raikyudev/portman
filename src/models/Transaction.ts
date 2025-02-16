import mongoose, {Document, Schema} from 'mongoose';

export interface ITransaction extends Document{
    _id: Schema.Types.ObjectId;
    portfolio_id: Schema.Types.ObjectId;
    asset_id: Schema.Types.ObjectId;
    tx_type: string;
    quantity: number;
    price_per_unit: number;
    currency: string;
    tx_date: Date;
}

export const TransactionSchema = new Schema<ITransaction>({
    portfolio_id:{
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Portfolio'
    },
    asset_id:{
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Asset'
    },
    tx_type: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price_per_unit: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    tx_date: {
        type: Date,
        default: Date.now
    }
});

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;