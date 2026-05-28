const mongoose = require('mongoose')

const eventRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  used: {
    type: Boolean,
    default: false
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
})

// prevent duplicate registrations for the same event
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true })

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema)

module.exports = EventRegistration
