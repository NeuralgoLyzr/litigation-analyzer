import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessStatus extends Document {
  userId: string;
  documentId?: string;
  ragId?: string;
  status: 'processing' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  error?: string;
  created_at: Date;
  updated_at: Date;
  externalId?: string;
}

const ProcessStatusSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  documentId: { type: String },
  ragId: { type: String },
  status: { 
    type: String, 
    required: true, 
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  currentStep: { type: Number, required: true, default: 0 },
  totalSteps: { type: Number, required: true, default: 8 },
  stepDescription: { type: String, required: true },
  error: { type: String },
  externalId: { type: String, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'process_status'
});

ProcessStatusSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const ProcessStatus = (mongoose.models.ProcessStatus || 
  mongoose.model<IProcessStatus>('ProcessStatus', ProcessStatusSchema)) as Model<IProcessStatus>;

export default ProcessStatus;

// Create a new process status
export async function createProcessStatus(
  userId: string,
  initialStep: number = 1,
  totalSteps: number = 8,
  stepDescription: string = 'Starting process...',
  externalId?: string
): Promise<IProcessStatus> {
  const processStatus = new ProcessStatus({
    userId,
    currentStep: initialStep,
    totalSteps,
    stepDescription,
    status: 'processing',
    externalId,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  return await processStatus.save();
}

export async function updateProcessStatus(
  statusId: string, 
  update: Partial<IProcessStatus>
): Promise<IProcessStatus | null> {
  return await ProcessStatus.findByIdAndUpdate(
    statusId, 
    { $set: update },
    { new: true }
  );
}

export async function getLatestProcessStatus(userId: string): Promise<IProcessStatus | null> {
  return await ProcessStatus.findOne({ userId }).sort({ created_at: -1 });
}

export async function markProcessComplete(
  statusId: string, 
  documentId: string, 
  ragId: string
): Promise<IProcessStatus | null> {
  return await ProcessStatus.findByIdAndUpdate(
    statusId,
    {
      $set: {
        status: 'completed',
        documentId,
        ragId,
        currentStep: 8,
        totalSteps: 8,
        stepDescription: 'Process completed successfully',
        updated_at: new Date()
      }
    },
    { new: true }
  );
}

export async function markProcessFailed(
  statusId: string,
  error: string
): Promise<IProcessStatus | null> {
  return await ProcessStatus.findByIdAndUpdate(
    statusId,
    {
      $set: {
        status: 'failed',
        error,
        stepDescription: 'Process failed',
        updated_at: new Date()
      }
    },
    { new: true }
  );
} 