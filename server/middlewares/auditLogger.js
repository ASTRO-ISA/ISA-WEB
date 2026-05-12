const AuditLog = require('../models/auditLogModel')

const auditLog = (action, resource) => {
  return async (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (req.user && ['admin', 'super-admin'].includes(req.user.role)) {
          
          const targetedDocumentId = req.params.id || res.locals.documentId || null;

          AuditLog.create({
            userId: req.user._id,
            userRole: req.user.role,
            action: action,
            resource: resource,
            resourceId: targetedDocumentId,
            ipAddress: req.ip
          }).catch(err => {
            console.error('Failed to write audit log:', err);
          });
        }
      }
    });
    next();
  };
};

module.exports = { auditLog }