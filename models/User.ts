import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  user_id: string;
  api_key: string;
  is_onboarded: boolean;
  is_new_user: boolean;
  created_at: Date;
  updated_at: Date;
}

export const UserSchema: Schema = new Schema({
  user_id: { type: String, required: true },
  api_key: { type: String, required: true },
  is_onboarded: { type: Boolean, default: false },
  is_new_user: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { 
  collection: 'users' // Use the existing users collection
});

// Update the timestamp on save
UserSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Fix for mongoose typing issues - explicit casting to Model<IUser>
const User = (mongoose.models.User || mongoose.model<IUser>('User', UserSchema)) as Model<IUser>;

export default User; 