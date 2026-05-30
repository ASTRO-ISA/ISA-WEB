const express = require('express')
const eventController = require('../controllers/eventController')
const authenticateToken = require('../middlewares/authenticateToken')
const multer = require('multer')
const router = express.Router()
const { imageStorage } = require('../utils/cloudinaryStorage')
const restrictTo = require('../middlewares/restrictTo')
const { auditLog } = require('../middlewares/auditLogger')

const uploadImage = multer({ storage: imageStorage('event-banners') })

router.route('/').get(eventController.approvedEvents)
router.route('/:slug').get(eventController.getEvent)

router.use(authenticateToken)

router
  .route('/pending')
  .get(
    restrictTo(['admin', 'super-admin']),
    eventController.pendingEvents
  )
router
  .route('/all')
  .get(
    restrictTo(['admin', 'super-admin']),
    eventController.Events
  )

router.route('/scan').post(eventController.scanTicket)

router.route('/:slug/download-attendees').get(eventController.downloadEventAttendees)

router
  .route('/create')
  .post(
    uploadImage.single('thumbnail'),
    auditLog('CREATE_EVENT', 'Event'),
    eventController.createEvent
  )

router
  .route('/my-events/:userid')
  .get(eventController.registeredEvents)

router
  .route('/status/:id')
  .patch(
    restrictTo(['admin', 'super-admin']),
    auditLog('UPDATE_EVENT', 'Event'),
    eventController.changeStatus
  )

router.route('/register/:eventid/:userid').patch(eventController.registerEvent)
router.route('/unregister/:eventid/:userid').patch(eventController.unregisterEvent)

router.delete('/:id',
  auditLog('DELETE_EVENT', 'Event'),
  eventController.deleteEvent
)

router.patch('/:id/toggle-registration',
  auditLog('TOGGLE_REGISTRATION_EVENT', 'Event'),
  eventController.toggleRegistration
)

router
  .route('/:id')
  .put(
    restrictTo(['admin', 'super-admin']),
    uploadImage.single('thumbnail'),
    auditLog('UPDATE_EVENT', 'Event'),
    eventController.updateEvent
  )

module.exports = router