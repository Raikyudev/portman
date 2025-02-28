import mongoose, { Document, Schema } from "mongoose";

interface IUserPreferences {
  currency: string;
}
export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  preferences: IUserPreferences;
  created_at: Date;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
}

const userSchema: Schema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  preferences: {
    currency: { type: String, required: true, default: "GBP" },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
  resetToken: {
    type: String,
  },
  resetTokenExpires: {
    type: Date,
  },
});

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
