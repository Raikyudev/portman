import mongoose, {Document, Schema} from 'mongoose';

export interface IPortfolio extends Document{
    _id: Schema.Types.ObjectId;
    user_id: Schema.Types.ObjectId;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}

const portfolioSchema:Schema = new mongoose.Schema({
    user_id:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name:{
        type: String,
        required: true,
    },
    description:{
        type: String,
    },
    created_at:{
        type: Date,
        default: Date.now,
    },
    updated_at:{
        type: Date,
        default: Date.now,
    }
})

const Portfolio = mongoose.model<IPortfolio>('Portfolio',portfolioSchema);

export default Portfolio;