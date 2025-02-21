import mongoose, { Schema, Document } from "mongoose";

export interface ICronJobTracker extends Document {
  job: string;
  lastRun: Date;
}

const CronJobTrackerSchema = new Schema<ICronJobTracker>({
  job: {
    type: String,
    required: true,
    unique: true,
  },
  lastRun: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

export default mongoose.models.CronJobTracker ||
  mongoose.model<ICronJobTracker>("CronJobTracker", CronJobTrackerSchema);
