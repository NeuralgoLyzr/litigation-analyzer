import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatchJob extends Document {
  project_name: string;
  results: Record<string, unknown>[];
  status: "processing" | "completed" | "failed";
  error?: string;
  error_code?: number;
  created_at: Date;
  updated_at: Date;
}

const BatchJobSchema: Schema = new Schema({
  project_name: { type: String, required: true },
  results: { type: [Schema.Types.Mixed], default: [] },
  status: { 
    type: String, 
    required: true, 
    enum: ["processing", "completed", "failed"],
    default: "processing"
  },
  error: { type: String },
  error_code: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'batch_jobs'
});

// Update the timestamp on save
BatchJobSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Fix for mongoose typing issues - explicit casting to Model<IBatchJob>
const BatchJob = (mongoose.models.BatchJob || 
  mongoose.model<IBatchJob>('BatchJob', BatchJobSchema)) as Model<IBatchJob>;

export default BatchJob; 