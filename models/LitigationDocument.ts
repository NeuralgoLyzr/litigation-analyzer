import mongoose from 'mongoose';

const litigationDocumentSchema = new mongoose.Schema({
  userId: String,
  ragId: String,
  originalFileName: String,
  collectionName: String,
  ragResponse: Object,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const LitigationDocument = mongoose.models.LitigationDocument || mongoose.model('LitigationDocument', litigationDocumentSchema);

export default LitigationDocument; 