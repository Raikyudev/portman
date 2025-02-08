import mongoose, {Document, Schema} from 'mongoose';

export interface IWatchlist extends Document{
    _id: Schema.Types.ObjectId;
    user_id: Schema.Types.ObjectId;
    asset_id: Schema.Types.ObjectId;
    added_at: Date;
}


const WatchlistSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true, ref: 'User'
    },
    asset_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Asset'
    },
    added_at: {
        type: Date,
        default: Date.now
    }
});

export const Watchlist = mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);

export default Watchlist;



