const express = require('express')
const router = express.Router()
const { verifyQR, addScanner } = require('../controllers/qrController')
const authenticateToken = require('../middlewares/authenticateToken')
const { auditLog } = require('../middlewares/auditLogger')

router.use(authenticateToken)
router.route('/verify/:token').post(verifyQR)
router.route('/add-scanner/:eventSlug').post(auditLog('ADD_SCANNER', 'Scanner'), addScanner)

module.exports = router