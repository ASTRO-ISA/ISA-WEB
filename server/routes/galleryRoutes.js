const express = require('express')
const router = express.Router()
const multer = require('multer')
const galleryController = require('../controllers/galleryController')
const restrictTo = require('../middlewares/restrictTo')
const authenticateToken = require('../middlewares/authenticateToken')
const { imageStorage } = require('../utils/cloudinaryStorage')
const { auditLog } = require('../middlewares/auditLogger')

const uploadPic = multer({ storage: imageStorage('gallery-pics') })
const uploadFeatured = multer({
  storage: imageStorage('featured-club-astronomy-image')
})

router.get('/', galleryController.allPics)
router.get('/featured', galleryController.getFeatured)

router.use(authenticateToken)
router.use(restrictTo(['admin', 'super-admin']))
router.post('/', uploadPic.single('image'), auditLog('UPLOAD_PIC', 'Gallery'), galleryController.uploadPics)
router.post(
  '/featured',
  uploadFeatured.single('image'),
  auditLog('UPLOAD_FEATURED_PIC', 'Gallery'),
  galleryController.uploadFeatured
)
router.delete('/featured/:id', auditLog('DELETE_FEATURED_PIC', 'Gallery'), galleryController.deleteFeatured)
router.delete('/:id', auditLog('DELETE_PIC', 'Gallery'), galleryController.deletePics)

module.exports = router
