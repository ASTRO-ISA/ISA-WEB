const express = require('express')
const restrictTo = require('../middlewares/restrictTo')
const {
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  updateAdmin,
  getAllAuditLogs
} = require('../controllers/superAdminController')
const authenticateToken = require('../middlewares/authenticateToken')
const router = express.Router()
const { auditLog } = require('../middlewares/auditLogger')

router.use(authenticateToken)
router.use(restrictTo(['super-admin']))
router.route('/admins').post(auditLog('CREATE_ADMIN', 'Super'), createAdmin).get(getAllAdmins)
router.route('/admin/:id').delete(auditLog('DELETE_ADMIN', 'Super'), deleteAdmin).patch(auditLog('UPDATE_ADMIN', 'Super'),updateAdmin)
router.route('/audit-logs').get(getAllAuditLogs)

module.exports = router
