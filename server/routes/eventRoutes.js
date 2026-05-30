const express = require('express')
const eventController = require('../controllers/eventController')
const authenticateToken = require('../middlewares/authenticateToken')
const multer = require('multer')
const router = express.Router()
const { imageStorage } = require('../utils/cloudinaryStorage')
const restrictTo = require('../middlewares/restrictTo')
const { auditLog } = require('../middlewares/auditLogger')

const uploadImage = multer({ storage: imageStorage('event-banners') })

// public routes (no auth)
router.route('/').get(eventController.approvedEvents)

// authenticated routes
// these are defined BEFORE the public /:slug catch-all so they match first

router
  .route('/pending')
  .get(
    authenticateToken,
    restrictTo(['admin', 'super-admin']),
    eventController.pendingEvents
  )
router
  .route('/all')
  .get(
    authenticateToken,
    restrictTo(['admin', 'super-admin']),
    eventController.Events
  )

router.route('/scan').post(authenticateToken, eventController.scanTicket)

router
  .route('/create')
  .post(
    authenticateToken,
    uploadImage.single('thumbnail'),
    auditLog('CREATE_EVENT', 'Event'),
    eventController.createEvent
  )

router
  .route('/my-events/:userid')
  .get(authenticateToken, eventController.registeredEvents)

router
  .route('/status/:id')
  .patch(
    authenticateToken,
    restrictTo(['admin', 'super-admin']),
    auditLog('UPDATE_EVENT', 'Event'),
    eventController.changeStatus
  )

router.route('/register/:eventid/:userid').patch(authenticateToken, eventController.registerEvent)
router.route('/unregister/:eventid/:userid').patch(authenticateToken, eventController.unregisterEvent)

router.delete('/:id',
  authenticateToken,
  auditLog('DELETE_EVENT', 'Event'),
  eventController.deleteEvent
)

router.patch('/:id/toggle-registration',
  authenticateToken,
  auditLog('TOGGLE_REGISTRATION_EVENT', 'Event'),
  eventController.toggleRegistration
)

router
  .route('/:id')
  .put(
    authenticateToken,
    restrictTo(['admin', 'super-admin']),
    uploadImage.single('thumbnail'),
    auditLog('UPDATE_EVENT', 'Event'),
    eventController.updateEvent
  )

router.route('/:slug/download-attendees').get(authenticateToken, eventController.downloadEventAttendees)

// public catch-all (must be LAST)
// /:slug matches any single path segment — if it were earlier, it would
// swallow /pending, /all, /create, etc.
router.route('/:slug').get(eventController.getEvent)

module.exports = router