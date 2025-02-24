import mongoose, { Document, Schema } from "mongoose";
import { REPORT_FORMATS, ReportFormat } from "@/lib/constants";

interface IGenerationInputs {
  from_date: Date;
  to_date: Date;
}
export interface IReport extends Document {
  _id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  portfolio_id: Schema.Types.ObjectId;
  name: string;
  report_type: string;
  report_format: ReportFormat;
  generation_inputs: IGenerationInputs;
  generated_at: Date;
}

const reportSchema: Schema = new mongoose.Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  portfolio_id: {
    type: Schema.Types.ObjectId,
    ref: "Portfolio",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  report_type: {
    type: String,
    required: true,
  },
  report_format: {
    type: String,
    enum: REPORT_FORMATS,
    required: true,
  },
  generation_inputs: {
    type: {
      from_date: {
        type: Date,
        required: true,
      },
      to_date: {
        type: Date,
        required: true,
      },
    },
    required: true,
  },
  generated_at: {
    type: Date,
    default: Date.now,
  },
});

const Report =
  mongoose.models.Report || mongoose.model<IReport>("Report", reportSchema);

export default Report;
