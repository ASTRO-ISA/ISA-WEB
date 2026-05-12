const express = require('express')
const router = express.Router()
const setFeaturedController = require('../controllers/setFeaturedController')
const restrictTo = require('../middlewares/restrictTo')
const authenticateToken = require('../middlewares/authenticateToken')
const { auditLog } = require('../middlewares/auditLogger')

router.use(authenticateToken)
router.use(restrictTo(['admin', 'super-admin']))
router.patch('/:id', auditLog('SET_FEATURED_BLOG', 'Blog'), setFeaturedController.setFeaturedBlog)
router.patch('/remove/:id', auditLog('REMOVE_FEATURED', 'Blog'), setFeaturedController.removeFeaturedBlog)

module.exports = router