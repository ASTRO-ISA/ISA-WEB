const express = require('express')
const eventController = require('../controllers/eventController')
const authenticateToken = require('../middlewares/authenticateToken')
const multer = require('multer')
const router = express.Router()
const { imageStorage } = require('../utils/cloudinaryStorage')
const restrictTo = require('../middlewares/restrictTo')
const { auditLog } = require('../middlewares/auditLogger')

const uploadImage = multer({ storage: imageStorage('event-banners') })

// ── Public routes (no auth) ──
router.route('/').get(eventController.approvedEvents)

// ── Authenticated routes ──
// These are defined BEFORE the public /:slug catch-all so they match first
const authRouter = express.Router()
authRouter.use(authenticateToken)

authRouter
  .route('/pending')
  .get(
    restrictTo(['admin', 'super-admin']),
    eventController.pendingEvents
  )
authRouter
  .route('/all')
  .get(
    restrictTo(['admin', 'super-admin']),
    eventController.Events
  )

authRouter.route('/scan').post(eventController.scanTicket)

authRouter
  .route('/create')
  .post(
    uploadImage.single('thumbnail'),
    auditLog('CREATE_EVENT', 'Event'),
    eventController.createEvent
  )

authRouter
  .route('/my-events/:userid')
  .get(eventController.registeredEvents)

authRouter
  .route('/status/:id')
  .patch(
    restrictTo(['admin', 'super-admin']),
    auditLog('UPDATE_EVENT', 'Event'),
    eventController.changeStatus
  )

authRouter.route('/register/:eventid/:userid').patch(eventController.registerEvent)
authRouter.route('/unregister/:eventid/:userid').patch(eventController.unregisterEvent)

authRouter.delete('/:id',
  auditLog('DELETE_EVENT', 'Event'),
  eventController.deleteEvent
)

authRouter.patch('/:id/toggle-registration',
  auditLog('TOGGLE_REGISTRATION_EVENT', 'Event'),
  eventController.toggleRegistration
)

authRouter
  .route('/:id')
  .put(
    restrictTo(['admin', 'super-admin']),
    uploadImage.single('thumbnail'),
    auditLog('UPDATE_EVENT', 'Event'),
    eventController.updateEvent
  )

authRouter.route('/:slug/download-attendees').get(eventController.downloadEventAttendees)

// Mount auth routes first so /pending, /all, etc. are matched before /:slug
router.use('/', authRouter)

// ── Public catch-all (must be LAST) ──
// /:slug matches any single path segment — if it were earlier, it would
// swallow /pending, /all, /create, etc.
router.route('/:slug').get(eventController.getEvent)

module.exports = router