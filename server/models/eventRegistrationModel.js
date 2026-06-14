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
    unique: true,
    sparse: true
  },
  scanCount: {
    type: Number,
    default: 0
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'payment_not_found', 'rejected'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  paymentTime: {
    type: Date
  },
  approvalTime: {
    type: Date
  },
  isManualPayment: {
    type: Boolean,
    default: false
  },
  isResubmitted: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  }
})

// prevent duplicate registrations for the same event
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true })

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema)

module.exports = EventRegistration
