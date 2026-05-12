const express = require('express')
const router = express.Router()
const authenticateToken = require('./../middlewares/authenticateToken')
const restrictTo = require('./../middlewares/restrictTo')
const multer = require('multer')
const { documentStorage } = require('../utils/cloudinaryStorage')
const {
  getAllJobs,
  createJob,
  deleteJob,
  updateJob
} = require('../controllers/JobPostController')
const { auditLog } = require('../middlewares/auditLogger')

const uploadDocument = multer({ storage: documentStorage('job-attachments') })

router.route('/').get(getAllJobs)

router.use(authenticateToken)
router.use(restrictTo(['admin', 'super-admin']))

// router
//   .route('/')

//   .post(uploadDocument.single('document'), createJob)
// router
//   .route('/:id')
//   .delete(deleteJob)
//   .patch(uploadDocument.single('document'), updateJob)

router
  .route('/')
  .post(
    uploadDocument.single('document'), 
    auditLog('CREATE_JOB', 'Job'),
    createJob
  )

router
  .route('/:id')
  .delete(
    auditLog('DELETE_JOB', 'Job'),
    deleteJob
  )
  .patch(
    uploadDocument.single('document'), 
    auditLog('UPDATE_JOB', 'Job'),
    updateJob
  )

module.exports = router
