const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userRole: {
    type: String,
    enum: ['admin', 'super-admin'], 
    required: true
  },
  action: { 
    type: String,
    required: true 
  },
  resource: { 
    type: String, 
    required: true 
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  ipAddress: String,
}, { timestamps: true });

auditLogSchema.index({ userRole: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

module.exports = AuditLog