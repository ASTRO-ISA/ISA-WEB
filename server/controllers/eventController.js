const { default: slugify } = require('slugify')
const mongoose = require('mongoose')
const Event = require('../models/eventModel')
const EventRegistration = require('../models/eventRegistrationModel')
const User = require('../models/userModel')
const { sendEmail, sendEmailWithAttachment } = require('../utils/sendEmail')
const cloudinary = require('cloudinary').v2
require('dotenv').config()
const { v4: uuidv4 } = require('uuid')
const QRCode = require('qrcode')
const PaymentTransaction = require('../models/transactionsModel')
const registrationConfirmTemplate = require('../utils/emailTemplates/registrationConfirmTemplate')
const eventTimeUpdateTemplate = require('../utils/emailTemplates/eventTimeUpdateTemplate')

exports.createEvent = async (req, res) => {
  try {
    let {
      title,
      description,
      eventDate,
      location,
      eventType,
      presentedBy,
      type,
      // status,
      isFree,
      fee,
      seatCapacity,
      isTicketRequired
    } = req.body

    isFree = isFree === 'true' || isFree === true
    if (!isFree) {
      fee = Number(fee)
      if (isNaN(fee) || fee <= 0) {
        return res.status(400).json({ error: 'Fee must be a valid number' })
      }
    } else {
      fee = null
    }

    // validate seat capacity
    seatCapacity = Number(seatCapacity)
    if (isNaN(seatCapacity) || seatCapacity <= 0) {
      return res
        .status(400)
        .json({ error: 'Seat capacity must be a positive number' })
    }

    // handle end time (default = +24h)
    const eventEndTime = req.body.eventEndTime
      ? new Date(req.body.eventEndTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000)

    // parse hosts (array of objects)
    const hostedBy = JSON.parse(req.body.hostedBy || '[]')

    // handle file uploads
    const thumbnail = req.file ? req.file.path : ''
    const publicId = req.file ? req.file.filename : ''
    const createdBy = req.user.id

    // slug for clean URLs
    const slug = slugify(title, { lower: true, strict: true })

    // parse isTicketRequired boolean (default true)
    isTicketRequired = isTicketRequired === 'false' || isTicketRequired === false ? false : true

    // prepare event data
    const eventData = {
      title,
      slug,
      description,
      eventDate,
      eventEndTime,
      location,
      eventType,
      presentedBy,
      type,
      // status,
      hostedBy,
      thumbnail,
      publicId,
      createdBy,
      isFree,
      fee,
      seatCapacity,
      isTicketRequired,
      attendeeCount: 0
    }

    const event = new Event(eventData)
    await event.save()

    res.locals.documentId = event._id

    res.status(201).json({ message: 'Event created successfully', event })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' })
  }
}

exports.Events = async (req, res) => {
  try {
    const events = await Event.find({})
    if (!events) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(events)
  } catch (err) {
    res.status(500).json({ message: 'Server error in get events' })
  }
}

exports.pendingEvents = async (req, res) => {
  try {
    const events = await Event.find({ statusAR: 'pending' })
    if (!events) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(events)
  } catch (err) {
    res.status(500).json({ message: 'Server error in get events' })
  }
}

exports.approvedEvents = async (req, res) => {
  try {
    const events = await Event.find({ statusAR: 'approved' })
      .sort({ createdAt: -1 })
      .lean()
    if (!events) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // attach registeredUsers so the client can check registration status
    const eventIds = events.map(e => e._id)
    const registrations = await EventRegistration.find({ event: { $in: eventIds } })
      .populate('user', '_id name email')
      .lean()

    // group registrations by event id
    const regMap = {}
    for (const reg of registrations) {
      const eid = reg.event.toString()
      if (!regMap[eid]) regMap[eid] = []
      regMap[eid].push(reg)
    }

    const eventsWithRegs = events.map(e => ({
      ...e,
      registeredUsers: regMap[e._id.toString()] || []
    }))

    res.status(200).json(eventsWithRegs)
  } catch (err) {
    res.status(500).json({ message: 'Server error in get events' })
  }
}

exports.upcomingEvents = async (req, res) => {
  try {
    const events = await Event.find({
      statusAR: 'approved',
      status: 'upcoming'
    })
      .sort({ createdAt: -1 })
    if (!events) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(events)
  } catch (err) {
    res.status(500).json({ message: 'Server error in get events' })
  }
}

exports.getEvent = async (req, res) => {
  const { slug } = req.params
  try {
    const event = await Event.findOne({ slug }).populate({
      path: 'createdBy',
      select: '_id name email'
    })
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // explicitly query registrations from the separate collection
    const registeredUsers = await EventRegistration.find({ event: event._id })
      .populate('user', '_id name email')
      .lean()

    // attach registrations to the event response
    const eventObj = event.toObject()
    eventObj.registeredUsers = registeredUsers

    res.status(200).json(eventObj)
  } catch (err) {
    res.status(500).json({ message: 'Server error in getEvent' })
  }
}

exports.downloadEventAttendees = async (req, res) => {
  const { slug } = req.params
  try {
    const event = await Event.findOne({ slug }).select('title slug createdBy')

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Unauthorized to download attendees' })
    }

    // query registrations from the separate collection
    const attendees = await EventRegistration.find({ event: event._id })
      .populate({
        path: 'user',
        select: 'name phoneNo email'
      })
      .lean()

    if (!attendees.length) {
      return res.status(400).json({ message: 'No registered users found for this event.' })
    }

    const rows = attendees.map((entry, index) => {
      const user = entry.user || entry
      const name = user.name ? user.name.replace(/"/g, '""') : ""
      const phoneNo = user.phoneNo ? String(user.phoneNo).replace(/"/g, '""') : ""

      return `"${index + 1}","${name}","${phoneNo}"`
    })

    const csvData = ["Serial Number,Name,Mobile Number", ...rows].join("\n")

    const fileName = `${event.slug}-registered-users.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    return res.status(200).send(csvData)

  } catch (err) {
    return res.status(500).json({ message: 'Server error generating CSV' })
  }
}

exports.registerEvent = async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const { eventid, userid } = req.params
    const tokenUserId = req.user.id

    // user validation
    if (userid !== tokenUserId) {
      return res.status(403).json({ message: "Can't validate user" })
    }

    const user = await User.findById(userid)
    if (!user) return res.status(400).json({ message: 'Please login first' })

    const event = await Event.findById(eventid)
    if (!event) return res.status(400).json({ message: 'Event not found' })

    // check if registrations are open
    if (!event.isRegistrationOpen) {
      return res.status(400).json({ message: 'Registration for this event is currently closed.' })
    }

    // for paid events — verify payment (outside transaction, read-only)
    if (!event.isFree) {
      const payment = await PaymentTransaction.findOne({
        user_id: userid,
        'item.item_type': 'event',
        'item.item_id': eventid,
        status: 'success'
      })

      if (!payment) {
        return res.status(400).json({
          message: 'Payment not completed for this event. Please complete payment first.'
        })
      }
    }

    // generate unique token before transaction
    const registrationToken = uuidv4()

    // begin txn
    session.startTransaction()

    // Atomically validate capacity AND increment attendeeCount
    // This uses $expr to compare two fields within the same document
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventid,
        $expr: { $lt: ['$attendeeCount', '$seatCapacity'] }
      },
      { $inc: { attendeeCount: 1 } },
      { new: true, session }
    )

    if (!updatedEvent) {
      await session.abortTransaction()
      return res.status(400).json({ message: 'Seats are full. Registration closed.' })
    }

    // Create registration ticket within the same transaction
    let registration
    try {
      const [created] = await EventRegistration.create(
        [{
          event: eventid,
          user: userid,
          token: registrationToken,
          used: false
        }],
        { session }
      )
      registration = created
    } catch (err) {
      await session.abortTransaction()
      // duplicate key error = already registered
      if (err.code === 11000) {
        return res.status(400).json({ message: 'You are already registered for this event.' })
      }
      throw err
    }

    // Both operations succeeded — commit
    await session.commitTransaction()
    // end txn

    // send confirmation email — with or without QR based on isTicketRequired
    if (event.isTicketRequired) {
      // generate QR code (outside transaction — non-critical)
      const qrDataUrl = await QRCode.toDataURL(registrationToken)
      const qrBuffer = await QRCode.toBuffer(registrationToken)

      // upload QR code to Cloudinary
      const uploaded = await cloudinary.uploader.upload(qrDataUrl, {
        folder: 'event_qrcodes'
      })

      // email content using template (with QR)
      const emailContent = registrationConfirmTemplate({
        userName: user.name,
        eventTitle: event.title,
        eventDate: new Date(event.eventDate).toDateString(),
        eventLocation: event.location,
        qrImageUrl: uploaded.secure_url,
        isTicketRequired: true
      })

      // send email with QR attachment
      await sendEmailWithAttachment(
        user.email,
        `Registered for ${event.title}`,
        emailContent,
        [
          {
            filename: 'qrcode.png',
            content: qrBuffer,
            cid: 'qrcode@event'
          }
        ]
      )
    } else {
      // no ticket needed — send simple confirmation without QR
      const emailContent = registrationConfirmTemplate({
        userName: user.name,
        eventTitle: event.title,
        eventDate: new Date(event.eventDate).toDateString(),
        eventLocation: event.location,
        isTicketRequired: false
      })

      await sendEmail(
        user.email,
        `Registered for ${event.title}`,
        emailContent
      )
    }

    // fetch updated event with registrations for response
    const freshEvent = await Event.findById(eventid)
    const registeredUsers = await EventRegistration.find({ event: eventid })
      .populate('user', 'name email')
      .lean()
    const eventObj = freshEvent.toObject()
    eventObj.registeredUsers = registeredUsers

    return res.status(200).json({
      success: true,
      message: `User successfully registered for the ${event.isFree ? 'free' : 'paid'} event`,
      data: eventObj
    })
  } catch (error) {
    // safety net — abort if still in progress
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    console.error('Error in event registration:', error)
    res.status(500).json({
      success: false,
      message: 'User registration failed for the event'
    })
  } finally {
    session.endSession()
  }
}

exports.scanTicket = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' })
    }

    // find registration by token and populate user + event
    const registration = await EventRegistration.findOne({ token })
      .populate('user', 'name email')

    if (!registration) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Invalid Ticket'
      })
    }

    const event = await Event.findById(registration.event)
      .populate('scanners', '_id')

    if (!event) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Event not found for this ticket'
      })
    }

    // verify scanner authorization
    const scannerId = req.user._id.toString()
    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy.toString() === scannerId
    const isScanner = event.scanners.some(s => s._id.toString() === scannerId)

    if (!isAdmin && !isCreator && !isScanner) {
      return res.status(403).json({
        success: false,
        status: 'unauthorized',
        message: 'You are not authorized to scan tickets for this event'
      })
    }

    // check if ticket already used
    if (registration.used) {
      return res.status(200).json({
        success: true,
        status: 'already_used',
        message: 'Warning - Ticket Already Used!',
        attendeeName: registration.user.name,
        attendeeEmail: registration.user.email,
        newCheckInCount: event.checkedInCount,
        seatCapacity: event.seatCapacity
      })
    }

    // atomically mark ticket as used AND increment checkedInCount
    registration.used = true
    await registration.save()

    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      { $inc: { checkedInCount: 1 } },
      { new: true }
    )

    return res.status(200).json({
      success: true,
      status: 'verified',
      message: 'Ticket Verified',
      attendeeName: registration.user.name,
      attendeeEmail: registration.user.email,
      newCheckInCount: updatedEvent.checkedInCount,
      seatCapacity: updatedEvent.seatCapacity
    })
  } catch (error) {
    console.error('Scan ticket error:', error)
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Server error while scanning ticket'
    })
  }
}

exports.unregisterEvent = async (req, res) => {
  try {
    const { eventid, userid } = req.params

    if (req.user.id !== userid) {
      return res.status(403).json({ message: "Unauthorized to unregister this user" })
    }

    const event = await Event.findById(eventid)
    const user = await User.findById(userid)

    if (!user) {
      return res.status(400).json({ message: 'Please login first' })
    }
    if (!event) {
      return res.status(400).json({ message: 'Event not found' })
    }

    // find and delete the registration
    const regEntry = await EventRegistration.findOneAndDelete({
      event: eventid,
      user: userid
    })

    if (!regEntry) {
      return res
        .status(400)
        .json({ message: 'User is not registered for this event' })
    }

    // delete QR from cloudinary
    if (regEntry.token) {
      try {
        await cloudinary.uploader.destroy(regEntry.token)
      } catch (err) {
        console.error('Error deleting QR from Cloudinary:', err.message)
      }
    }

    // decrement attendee count atomically
    await Event.findByIdAndUpdate(eventid, { $inc: { attendeeCount: -1 } })

    // send cancellation email
    const text = `Hi ${user.name},
    You have successfully unregistered from "${event.title}" scheduled on ${new Date(
      event.eventDate
    ).toDateString()} at ${event.location}.
    Hope to see you at our future events!
    – ISA-India`

    await sendEmail(user.email, `Unregistered from ${event.title}`, text)

    // fetch updated event with registrations for response
    const updatedEvent = await Event.findById(eventid)
    const registeredUsers = await EventRegistration.find({ event: eventid })
      .populate('user', 'name email')
      .lean()
    const eventObj = updatedEvent.toObject()
    eventObj.registeredUsers = registeredUsers

    res.status(200).json({
      success: true,
      message: 'User successfully unregistered from the event',
      data: eventObj
    })
  } catch (error) {
    console.error('Error in unregistering:', error)
    res.status(500).json({
      success: false,
      message: 'User unregistration failed for the event'
    })
  }
}

exports.updateEvent = async (req, res) => {
  const { id } = req.params
  const updates = { ...req.body }

  try {
    // parse boolean
    if (updates.isFree !== undefined) {
      updates.isFree = updates.isFree === 'true'

      // when switching to free, clear fee
      if (updates.isFree) {
        updates.fee = null
      }
    }

    // parse isTicketRequired boolean
    if (updates.isTicketRequired !== undefined) {
      updates.isTicketRequired = updates.isTicketRequired === 'true' || updates.isTicketRequired === true
    }

    // convert fee to number if it's paid
    if (updates.isFree === false && updates.fee !== undefined && updates.fee !== '') {
      updates.fee = Number(updates.fee)
    }

    // convert seatCapacity to number
    if (updates.seatCapacity !== undefined && updates.seatCapacity !== '') {
      updates.seatCapacity = Number(updates.seatCapacity)
    }

    // parse hostedBy JSON if provided
    if (updates.hostedBy) {
      try {
        updates.hostedBy = JSON.parse(updates.hostedBy)
      } catch (err) {
        return res.status(400).json({ message: 'Invalid hostedBy format' })
      }
    }

    // handle slug if title changed
    if (updates.title) {
      const baseSlug = slugify(updates.title, { lower: true, strict: true })
      let slug = baseSlug
      let counter = 1
      while (await Event.findOne({ slug, _id: { $ne: id } })) {
        slug = `${baseSlug}-${counter++}`
      }
      updates.slug = slug
    }

    // handle thumbnail file
    if (req.file) {
      updates.thumbnail = req.file.path
      updates.publicId = req.file.filename
    }

    // update event using save() so validators have proper document context
    const event = await Event.findById(id)
    if (!event) return res.status(404).json({ message: 'Event not found' })

    // capture old date before applying updates (for time change detection)
    const oldEventDate = event.eventDate ? new Date(event.eventDate) : null

    // apply updates to the document
    Object.assign(event, updates)
    await event.save()

    // check if eventDate changed and notify registered users
    const newEventDate = event.eventDate ? new Date(event.eventDate) : null
    if (oldEventDate && newEventDate && oldEventDate.getTime() !== newEventDate.getTime()) {
      // format dates in IST for the email
      const formatIST = (date) => {
        return new Date(date).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'full',
          timeStyle: 'short'
        })
      }

      const registrations = await EventRegistration.find({ event: id })
        .populate('user', 'name email')
        .lean()

      const eventUrl = `${process.env.CLIENT_URL}/events/${event.slug}`

      // send emails in background (don't block the response)
      for (const reg of registrations) {
        if (reg.user?.email) {
          const html = eventTimeUpdateTemplate({
            userName: reg.user.name,
            eventTitle: event.title,
            oldDate: formatIST(oldEventDate),
            newDate: formatIST(newEventDate),
            eventLocation: event.location,
            eventUrl
          })
          sendEmail(reg.user.email, `Schedule Update: ${event.title}`, html)
            .catch(err => console.error(`Failed to send time update email to ${reg.user.email}:`, err))
        }
      }
    }

    res.status(200).json(event)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error updating event', error })
  }
}

exports.deleteEvent = async (req, res) => {
  const { id } = req.params
  try {
    const event = await Event.findById(id)
    if (!event) return res.status(404).json({ message: 'Event not found' })

    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Unauthorized to delete this event' })
    }

    await cloudinary.uploader.destroy(event.publicId)

    // clean up all registrations for this event
    await EventRegistration.deleteMany({ event: id })

    await event.deleteOne()
    res.status(200).json({ message: 'Event deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event', error })
  }
}

exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params
    const status = req.body.status

    const event = await Event.findByIdAndUpdate(
      id,
      { statusAR: status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' })
    }

    if (status === 'approved') {
      // sending confirmation email
      const text = `
    <p>Hello ${event.createdBy.name},</p>

    <p>Good news! 🎉 Your event <strong>"${event.title}"</strong> scheduled for 
    <strong>${new Date(event.eventDate).toDateString()}</strong> at 
    <strong>${event.location}</strong> has been approved and is now live on ISA.</p>

    <p>👉 Share your event link with others to start registrations:  
    <a href="${process.env.CLIENT_URL}/events/${event.slug}" target="_blank">View Event</a></p>

    <p>Thank you for choosing our platform to host your event—we're excited to see it come to life!</p>

    <p>Best regards,<br>
    Team ISA</p>
    `
      await sendEmail(
        event.createdBy.email,
        `Your event ${event.title} is now live.`,
        text
      )
    }

    if (status === 'rejected') {
      // sending rejection email
      const text = `
      <p>Hello ${event.createdBy.name},</p>
    
      <p>We regret to inform you that your event <strong>"${event.title}"</strong>, 
      scheduled for <strong>${new Date(event.eventDate).toDateString()}</strong> at 
      <strong>${event.location}</strong>, has been <span style="color:red;font-weight:bold;">rejected</span> after review.</p>
    
      <p><strong>Reason from Admin:</strong></p>
      <blockquote style="border-left: 3px solid #ccc; margin: 10px 0; padding-left: 10px; color:#555;">
        ${event.adminComment || 'No specific reason provided.'}
      </blockquote>
    
      <p>If you believe this was a mistake, you may revise and resubmit your event for consideration.</p>
    
      <p>We appreciate your interest in sharing events with the ISA community and encourage you to keep contributing!</p>
    
      <p>Best regards,<br>
      Team ISA</p>
      `

      await sendEmail(
        event.createdBy.email,
        `Update on your event: ${event.title}`,
        text
      )
    }

    res.status(200).json({ message: 'Status changes successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error changing event status' })
  }
}

exports.registeredEvents = async (req, res) => {
  try {
    const { userid } = req.params

    if (req.user.id !== userid) {
      return res.status(403).json({ message: "Unauthorized to view these events" })
    }

    // find all event IDs the user is registered for
    const registrations = await EventRegistration.find({ user: userid }).distinct('event')

    if (registrations.length === 0) {
      return res.status(404).json({ message: 'No registerd events.' })
    }

    const events = await Event.find({ _id: { $in: registrations } })

    res.status(200).json(events)
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Server error finding the registerede events.' })
  }
}

exports.toggleRegistration = async (req, res) => {
  try {
    const { id } = req.params

    // Find event by ID
    const event = await Event.findById(id)
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' })
    }

    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Unauthorized to toggle registration' })
    }

    // Toggle registration status
    event.isRegistrationOpen = !event.isRegistrationOpen

    // Save updated event
    await event.save()

    res.status(200).json({
      success: true,
      message: `Registration has been ${event.isRegistrationOpen ? 'opened' : 'closed'} successfully.`,
      isRegistrationOpen: event.isRegistrationOpen
    })
  } catch (error) {
    console.error('Error toggling registration:', error)
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    })
  }
}