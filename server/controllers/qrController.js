const Event = require('../models/eventModel')
const EventRegistration = require('../models/eventRegistrationModel')
const User = require('../models/userModel')
const jwt = require('jsonwebtoken')
const { sendEmail } = require('../utils/sendEmail')
const scannerInviteEmail = require('../utils/emailTemplates/scannerInviteEmail')
require('dotenv').config()

exports.verifyQR = async (req, res) => {
    try {
      const { token } = req.params
      const scannerId = req.user._id
  
      // Find registration by token
      const regUser = await EventRegistration.findOne({ token })
        .populate('user', 'name email')

      if (!regUser) {
        return res.status(400).json({ success: false, message: 'QR does not exist' })
      }

      // Find the event for this registration
      const event = await Event.findById(regUser.event)
        .populate('scanners', 'email name')

      if (!event) {
        return res.status(400).json({ success: false, message: 'QR does not exist' })
      }
  
      // Check authorization
      const isCreator = event.createdBy.toString() === scannerId.toString()
      const isAdmin = req.user.role === 'admin'
      const isScanner = event.scanners.some(s => s._id.toString() === scannerId.toString())
  
      if (!isCreator && !isAdmin && !isScanner) {
        return res.status(403).json({ success: false, message: 'You are not authorized to scan this event' })
      }
  
      // If already used, return success but indicate it's already scanned
      if (regUser.used) {
        return res.status(200).json({
          success: true,
          alreadyScanned: true,
          message: '⚠️ QR already scanned',
          user: regUser.user,
          event: {
            title: event.title,
            date: event.eventDate,
            location: event.location
          }
        })
      }
  
      // Mark as used
      regUser.used = true
      await regUser.save()
  
      // Respond with user details
      res.status(200).json({
        success: true,
        alreadyScanned: false,
        message: '✅ QR verified successfully',
        user: regUser.user,
        event: {
          title: event.title,
          date: event.eventDate,
          location: event.location
        }
      })
    } catch (error) {
      console.error('QR verification error:', error)
      res.status(500).json({ success: false, message: '⚠️ Server error, try again later' })
    }
  }

exports.addScanner = async (req, res) => {
    try {
      const { eventSlug } = req.params
      const { email } = req.body
  
      // Find user by email
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }
  
      // Find event by slug
      const event = await Event.findOne({ slug: eventSlug })
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' })
      }
      // Only event creator or admin can add scanners
      if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to add scanners' })
      }
  
      // Check if already a scanner
      if (event.scanners.includes(user._id)) {
        return res.status(400).json({ success: false, message: 'User is already a scanner' })
      }
  
      event.scanners.push(user._id)
      await event.save()

      res.locals.documentId = event._id

      // Generate auto-login scanner token (7 day expiry)
      const scannerToken = jwt.sign(
        { id: user._id, purpose: 'scanner-login' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      )

      // Build scanner link with auto-login token
      const scannerLink = `${process.env.ORIGIN_FRONTEND}/events/scanner/${event.slug}?scannerToken=${scannerToken}`

      // Send invitation email using template
      const emailContent = scannerInviteEmail({
        scannerName: user.name,
        eventTitle: event.title,
        eventDate: new Date(event.eventDate).toDateString(),
        eventLocation: event.location,
        scannerLink
      })

      await sendEmail(
        user.email,
        `You've been added as a scanner for "${event.title}"`,
        emailContent
      )
  
      res.status(200).json({
        success: true,
        message: 'Scanner added successfully',
        scanner: { name: user.name, email: user.email }
      })
    } catch (error) {
      console.error('Add scanner error:', error)
      res.status(500).json({ success: false, message: 'Server error' })
    }
  }