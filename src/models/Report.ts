import mongoose, {Document, Schema} from 'mongoose';

export interface IReport extends Document{
    _id: Schema.Types.ObjectId;
    user_id: Schema.Types.ObjectId;
    name: string;
    report_type: string;
    generation_inputs: string;
    generated_at: Date;

}

const reportSchema:Schema = new mongoose.Schema({
    user_id:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name:{
        type: String,
        required: true,
    },
    report_type:{
        type: String,
        required: true,
    },
    generation_inputs:{
        type: String,
        required: true,
    }
    ,
    generated_at:{
        type: Date,
        default: Date.now,
    }
})

const Report = mongoose.models.Report || mongoose.model<IReport>('Report',reportSchema);

export default Report;