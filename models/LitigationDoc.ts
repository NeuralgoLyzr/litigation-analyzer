import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILitigationDoc extends Document {
  userId: string;
  ragId: string;
  collectionName: string;
  originalFileName: string;
  litigationResponse: {
    shortResponse: Record<string, unknown>;
    longResponse: Record<string, unknown>;
  };
  ragResponse: {
    id: string;
    user_id: string;
    collection_name: string;
    description: string;
    llm_model: string;
    embedding_model: string;
    vector_store_provider: string;
    meta_data: Record<string, unknown>;
    trained: boolean;
  };
  processedFiles: Array<{
    fileName: string;
    pageCount: number;
  }>;
  created_at: Date;
  updated_at: Date;
}

const LitigationDocSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  ragId: { type: String, required: true },
  collectionName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  litigationResponse: {
    shortResponse: { type: Schema.Types.Mixed },
    longResponse: { type: Schema.Types.Mixed }
  },
  ragResponse: {
    id: { type: String, required: true },
    user_id: { type: String, required: true },
    collection_name: { type: String, required: true },
    description: { type: String },
    llm_model: { type: String },
    embedding_model: { type: String },
    vector_store_provider: { type: String },
    meta_data: { type: Schema.Types.Mixed, default: {} },
    trained: { type: Boolean, default: false }
  },
  processedFiles: [{
    fileName: { type: String, required: true },
    pageCount: { type: Number, required: true }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'litigation_docs'
});

LitigationDocSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const LitigationDoc = (mongoose.models.LitigationDoc || 
  mongoose.model<ILitigationDoc>('LitigationDoc', LitigationDocSchema)) as Model<ILitigationDoc>;

export default LitigationDoc; 