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
const xlsx = require('xlsx')
const PaymentTransaction = require('../models/transactionsModel')
const registrationConfirmEmail = require('../utils/emailTemplates/registrationConfirmEmail')
const eventTimeUpdateEmail = require('../utils/emailTemplates/eventTimeUpdateEmail')
const {
  unregisterEventEmail,
  eventApprovedEmail,
  eventRejectedEmail,
  manualRegistrationPendingEmail,
  paymentVerificationFailedEmail,
  ticketResentEmail
} = require('../utils/emailTemplates/eventStatusEmails')

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
      isTicketRequired,
      upiId,
      isMultiDayEvent,
      eventDates
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

    // parse multi-day logic
    isMultiDayEvent = isMultiDayEvent === 'true' || isMultiDayEvent === true
    let parsedEventDates = []
    if (isMultiDayEvent && eventDates) {
      parsedEventDates = JSON.parse(eventDates)
    }

    // handle end time (default = +24h)
    let eventEndTime = req.body.eventEndTime;
    if (!eventEndTime) {
      eventEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    } else if (!isMultiDayEvent) {
      eventEndTime = new Date(req.body.eventEndTime).toISOString()
    }

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
      upiId,
      isMultiDayEvent,
      eventDates: parsedEventDates,
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
    const events = await Event.find({ isDeleted: { $ne: true } })
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
    const events = await Event.find({ statusAR: 'pending', isDeleted: { $ne: true } })
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
    const events = await Event.find({ statusAR: 'approved', isDeleted: { $ne: true } })
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
      status: 'upcoming',
      isDeleted: { $ne: true }
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
    const event = await Event.findOne({ slug, isDeleted: { $ne: true } }).populate({
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
    const event = await Event.findOne({ slug, isDeleted: { $ne: true } }).select('title slug createdBy')

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
      const email = user.email ? user.email.replace(/"/g, '""') : ""
      const status = entry.status || "approved"
      const transactionId = entry.transactionId ? entry.transactionId.replace(/"/g, '""') : ""
      const paymentTime = entry.paymentTime ? new Date(entry.paymentTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ""
      const approvalTime = entry.approvalTime ? new Date(entry.approvalTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ""

      return `"${index + 1}","${name}","${phoneNo}","${email}","${status}","${transactionId}","${paymentTime}","${approvalTime}"`
    })

    const csvHeader = ['Serial Number', 'User Name', 'Phone Number', 'Email', 'Status', 'Transaction ID', 'Payment Time', 'Approval Time'].join(',')
    const csvContent = [csvHeader, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=${event.slug}-attendees.csv`)

    res.status(200).send(csvContent)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error downloading attendees' })
  }
}

exports.downloadScannerSheet = async (req, res) => {
  const { slug } = req.params
  try {
    const event = await Event.findOne({ slug, isDeleted: { $ne: true } })

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Unauthorized to download scanner sheet' })
    }

    // Only fetch approved registrations for the scanner
    const attendees = await EventRegistration.find({ event: event._id, status: 'approved' })
      .populate({
        path: 'user',
        select: 'name phoneNo email'
      })
      .lean()

    const data = attendees.map((entry, index) => {
      const user = entry.user || entry
      return {
        "S.No.": index + 1,
        "Name": user.name || "",
        "Email": user.email || "",
        "Phone": user.phoneNo || "",
        "Confirmation Date": entry.approvalTime ? new Date(entry.approvalTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "",
        "Scanned?": entry.scanCount > 0 ? "Yes" : "" 
      }
    });

    const wb = xlsx.utils.book_new();

    if (event.isMultiDayEvent && event.eventDates && event.eventDates.length > 0) {
      event.eventDates.forEach((day, idx) => {
        const dateStr = day.date ? new Date(day.date).toISOString().split('T')[0] : `Day ${idx + 1}`;
        const ws = xlsx.utils.json_to_sheet(data);
        // adjust column widths
        ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
        xlsx.utils.book_append_sheet(wb, ws, `Day ${idx + 1} - ${dateStr}`.substring(0, 31)); // excel sheet names max 31 chars
      });
    } else {
      const ws = xlsx.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
      xlsx.utils.book_append_sheet(wb, ws, 'Scanner Sheet');
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${event.slug}-scanner-sheet.xlsx`);

    res.status(200).send(buffer);
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error downloading scanner sheet' })
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
          status: 'approved'
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
        eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
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
        eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
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

    // check if ticket has reached scan limit atomically
    const updatedRegistration = await EventRegistration.findOneAndUpdate(
      { _id: registration._id, scanCount: { $lt: 4 } },
      { $inc: { scanCount: 1 } },
      { new: true }
    );

    if (!updatedRegistration) {
      return res.status(200).json({
        success: true,
        status: 'already_used',
        message: 'Warning - Ticket Scan Limit Reached (4/4)!',
        attendeeName: registration.user.name,
        attendeeEmail: registration.user.email,
        newCheckInCount: event.checkedInCount,
        seatCapacity: event.seatCapacity,
        scanCount: registration.scanCount
      });
    }

    let updatedEvent = event;
    if (updatedRegistration.scanCount === 1) {
      updatedEvent = await Event.findByIdAndUpdate(
        event._id,
        { $inc: { checkedInCount: 1 } },
        { new: true }
      );
    }

    res.locals.documentId = updatedRegistration._id

    return res.status(200).json({
      success: true,
      status: 'verified',
      message: 'Ticket Verified',
      attendeeName: updatedRegistration.user.name,
      attendeeEmail: updatedRegistration.user.email,
      newCheckInCount: updatedEvent.checkedInCount,
      seatCapacity: updatedEvent.seatCapacity,
      scanCount: updatedRegistration.scanCount
    })
  } catch (err) {
    console.error('Scan ticket error:', err)
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

    // decrement attendee count atomically ONLY if they were actually taking up a seat
    if (regEntry.status === 'approved') {
      await Event.findOneAndUpdate(
        { _id: eventid, attendeeCount: { $gt: 0 } },
        { $inc: { attendeeCount: -1 } }
      )
    }

    // send cancellation email
    const emailContent = unregisterEventEmail({
      userName: user.name,
      eventTitle: event.title,
      eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
      eventLocation: event.location
    })

    await sendEmail(user.email, `Unregistered from ${event.title}`, emailContent)

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

    if (updates.upiId !== undefined) {
      updates.upiId = updates.upiId.trim()
    }

    // parse hostedBy JSON if provided
    if (updates.hostedBy) {
      try {
        updates.hostedBy = JSON.parse(updates.hostedBy)
      } catch (err) {
        return res.status(400).json({ message: 'Invalid hostedBy format' })
      }
    }

    // parse multi-day logic
    if (updates.isMultiDayEvent !== undefined) {
      updates.isMultiDayEvent = updates.isMultiDayEvent === 'true' || updates.isMultiDayEvent === true
    }
    if (updates.eventDates) {
      try {
        updates.eventDates = JSON.parse(updates.eventDates)
      } catch (err) {
        return res.status(400).json({ message: 'Invalid eventDates format' })
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
          const emailContent = eventTimeUpdateEmail({
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

    // Instead of permanent deletion, we perform a soft delete
    event.isDeleted = true
    await event.save()

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
      const emailContent = eventApprovedEmail({
        userName: event.createdBy.name,
        eventTitle: event.title,
        eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
        eventLocation: event.location,
        eventUrl: `${process.env.CLIENT_URL}/events/${event.slug}`
      });

      await sendEmail(
        event.createdBy.email,
        `Your event ${event.title} is now live.`,
        emailContent
      )
    }

    if (status === 'rejected') {
      // sending rejection email
      const emailContent = eventRejectedEmail({
        userName: event.createdBy.name,
        eventTitle: event.title,
        eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
        eventLocation: event.location,
        adminComment: event.adminComment
      });

      await sendEmail(
        event.createdBy.email,
        `Update on your event: ${event.title}`,
        emailContent
      )
    }

    res.locals.documentId = event._id

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

exports.manualRegisterEvent = async (req, res) => {
  try {
    const { eventid, userid } = req.params
    const { transactionId } = req.body
    const tokenUserId = req.user.id

    if (userid !== tokenUserId) {
      return res.status(403).json({ message: "Can't validate user" })
    }

    if (!transactionId || transactionId.trim() === '') {
      return res.status(400).json({ message: 'Transaction ID is required' })
    }

    const txnIdClean = transactionId.trim();
    if (!/^\d{12}$/.test(txnIdClean)) {
      return res.status(400).json({ message: 'Invalid Transaction ID. It must be exactly 12 digits long.' })
    }

    const event = await Event.findById(eventid)
    if (!event) return res.status(400).json({ message: 'Event not found' })

    if (!event.isRegistrationOpen) {
      return res.status(400).json({ message: 'Registration for this event is currently closed.' })
    }

    // Check if seats are full
    if (event.seatCapacity && event.attendeeCount >= event.seatCapacity) {
      return res.status(400).json({ message: 'Seats are full. Registration closed.' })
    }

    // Check unique transaction ID
    const existingTxn = await EventRegistration.findOne({ transactionId: txnIdClean })
    if (existingTxn) {
      return res.status(400).json({ message: 'A registration with this Transaction ID already exists. Please verify.' })
    }

    // Check if user is already registered
    const existingReg = await EventRegistration.findOne({ event: eventid, user: userid })
    if (existingReg) {
      if (existingReg.status === 'rejected' || existingReg.status === 'payment_not_found') {
        // Allow re-submission
        existingReg.status = 'pending'
        existingReg.transactionId = txnIdClean
        existingReg.paymentTime = Date.now()
        existingReg.isManualPayment = true
        existingReg.isResubmitted = true
        await existingReg.save()
      } else {
        return res.status(400).json({ message: 'You are already registered or have a pending registration for this event.' })
      }
    } else {
      await EventRegistration.create({
        event: eventid,
        user: userid,
        status: 'pending',
        transactionId: txnIdClean,
        paymentTime: Date.now(),
        isManualPayment: true
      })
    }

    const user = await User.findById(userid)

    // Send pending verification email
    const emailContent = manualRegistrationPendingEmail({
      userName: user.name,
      eventTitle: event.title,
      transactionId: txnIdClean
    });
    
    await sendEmail(user.email, `Registration Pending Verification: ${event.title}`, emailContent)

    const freshEvent = await Event.findById(eventid)
    const registeredUsers = await EventRegistration.find({ event: eventid }).populate('user', 'name email').lean()
    const eventObj = freshEvent.toObject()
    eventObj.registeredUsers = registeredUsers

    return res.status(200).json({
      success: true,
      message: 'Payment details submitted successfully. Your registration is pending verification.',
      data: eventObj
    })
  } catch (error) {
    console.error('Error in manual registration:', error)
    res.status(500).json({ success: false, message: 'Server error during registration' })
  }
}

exports.getEventRegistrations = async (req, res) => {
  try {
    const { slug } = req.params
    const event = await Event.findOne({ slug, isDeleted: { $ne: true } })
    if (!event) return res.status(404).json({ message: 'Event not found' })

    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Unauthorized to view registrations' })
    }

    const registrations = await EventRegistration.find({ event: event._id }).populate('user', 'name email phoneNo')
    res.status(200).json(registrations)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.approveManualRegistration = async (req, res) => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    const { regId } = req.params
    const registration = await EventRegistration.findById(regId).populate('user', 'name email').session(session)
    if (!registration) {
      await session.abortTransaction()
      return res.status(404).json({ message: 'Registration not found' })
    }

    const event = await Event.findById(registration.event).session(session)

    // Authorization check
    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) {
      await session.abortTransaction()
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (registration.status === 'approved') {
      await session.abortTransaction()
      return res.status(400).json({ message: 'Already approved' })
    }

    let updatedEvent;
    if (event.seatCapacity && event.seatCapacity > 0) {
      updatedEvent = await Event.findOneAndUpdate(
        { _id: event._id, $expr: { $lt: ['$attendeeCount', '$seatCapacity'] } },
        { $inc: { attendeeCount: 1 } },
        { new: true, session }
      );
      if (!updatedEvent) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Event is at full capacity' });
      }
    } else {
      updatedEvent = await Event.findByIdAndUpdate(
        event._id,
        { $inc: { attendeeCount: 1 } },
        { new: true, session }
      );
    }

    registration.status = 'approved'
    registration.approvalTime = Date.now()
    const registrationToken = uuidv4()
    registration.token = registrationToken
    await registration.save()

    await session.commitTransaction()

    // Send ticket email
    try {
      if (event.isTicketRequired) {
        const qrDataUrl = await QRCode.toDataURL(registrationToken)
        const qrBuffer = await QRCode.toBuffer(registrationToken)
        const uploaded = await cloudinary.uploader.upload(qrDataUrl, { folder: 'event_qrcodes' })
        const emailContent = registrationConfirmEmail({
          userName: registration.user.name,
          eventTitle: event.title,
          eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
          eventLocation: event.location,
          qrImageUrl: uploaded.secure_url,
          isTicketRequired: true
        })
        await sendEmailWithAttachment(registration.user.email, `Ticket Confirmed for ${event.title}`, emailContent, [{ filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode@event' }])
      } else {
        const emailContent = registrationConfirmEmail({
          userName: registration.user.name,
          eventTitle: event.title,
          eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
          eventLocation: event.location,
          isTicketRequired: false
        })
        await sendEmail(registration.user.email, `Registration Confirmed for ${event.title}`, emailContent)
      }
      
      registration.$session(null);
      registration.emailSent = true;
      await registration.save();
    } catch (emailErr) {
      console.error("Email failed to send for approval:", emailErr);
      registration.$session(null);
      registration.emailSent = false;
      await registration.save();
    }

    res.locals.documentId = registration._id

    res.status(200).json({ success: true, message: 'Registration approved successfully', registration })
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    console.error(error)
    res.status(500).json({ message: 'Server error approving registration' })
  } finally {
    session.endSession()
  }
}

exports.reviewManualRegistration = async (req, res) => {
  try {
    const { regId } = req.params
    const registration = await EventRegistration.findById(regId).populate('user', 'name email')
    if (!registration) return res.status(404).json({ message: 'Registration not found' })

    const event = await Event.findById(registration.event)
    const isAdmin = ['admin', 'super-admin'].includes(req.user.role)
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id
    if (!isAdmin && !isCreator) return res.status(403).json({ message: 'Unauthorized' })

    // If reverting an approved registration, decrement attendee count atomically
    if (registration.status === 'approved') {
      await Event.findOneAndUpdate(
        { _id: event._id, attendeeCount: { $gt: 0 } },
        { $inc: { attendeeCount: -1 } }
      );
    }

    registration.status = 'payment_not_found'
    await registration.save()

    // Optionally notify user
    const emailContent = paymentVerificationFailedEmail({
      userName: registration.user.name,
      eventTitle: event.title,
      transactionId: registration.transactionId
    });

    await sendEmail(registration.user.email, `Payment Verification Failed: ${event.title}`, emailContent)

    res.locals.documentId = registration._id

    res.status(200).json({ success: true, message: 'Registration flagged for review', registration })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.resendTicket = async (req, res) => {
  const { regId } = req.params

  try {
    const registration = await EventRegistration.findById(regId).populate('user').populate('event')
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    if (registration.status !== 'approved') {
      return res.status(400).json({ message: 'Cannot send ticket for non-approved registration' })
    }

    if (!registration.token) {
      return res.status(400).json({ message: 'Ticket token not found for this registration' })
    }

    // Generate QR Code Buffer
    const QRCode = require('qrcode')
    const cloudinary = require('../utils/cloudinary')
    const qrCodeBuffer = await QRCode.toBuffer(registration.token, {
      type: 'png',
      width: 400,
      margin: 2
    })

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'isa_qr_codes' },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error)
          return res.status(500).json({ message: 'Error generating QR code image' })
        }

        const qrImageUrl = result.secure_url

        const emailContent = ticketResentEmail({
          userName: registration.user.name,
          eventTitle: registration.event.title,
          qrImageUrl: qrImageUrl
        });

        try {
          await sendEmail(registration.user.email, `Registration Confirmed for ${registration.event.title}`, emailContent)
          registration.emailSent = true
          await registration.save()
          
          res.locals.documentId = registration._id
          return res.status(200).json({ message: 'Ticket resent successfully' })
        } catch (emailErr) {
          console.error("Email resend failed:", emailErr)
          registration.emailSent = false
          await registration.save()
          return res.status(500).json({ message: 'Failed to send email' })
        }
      }
    )

    // stream buffer to cloudinary
    const stream = require('stream')
    const bufferStream = new stream.PassThrough()
    bufferStream.end(qrCodeBuffer)
    bufferStream.pipe(uploadStream)

  } catch (err) {
    console.error("Resend ticket error:", err)
    res.status(500).json({ message: 'Server error while resending ticket' })
  }
}

exports.bulkApproveManualRegistrations = async (req, res) => {
  const { regIds } = req.body;
  if (!regIds || !Array.isArray(regIds)) {
    return res.status(400).json({ message: 'Invalid registration IDs array' });
  }

  const results = { successful: 0, failed: 0, emailFailures: 0 };

  for (const regId of regIds) {
    let session;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const registration = await EventRegistration.findById(regId).populate('user', 'name email').session(session);
      if (!registration || registration.status === 'approved') {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      const event = await Event.findById(registration.event).session(session);
      const isAdmin = ['admin', 'super-admin'].includes(req.user.role);
      const isCreator = event.createdBy && event.createdBy.toString() === req.user.id;
      if (!isAdmin && !isCreator) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      let updatedEvent;
      if (event.seatCapacity && event.seatCapacity > 0) {
        updatedEvent = await Event.findOneAndUpdate(
          { _id: event._id, $expr: { $lt: ['$attendeeCount', '$seatCapacity'] } },
          { $inc: { attendeeCount: 1 } },
          { new: true, session }
        );
        if (!updatedEvent) {
          // No seats left
          await session.abortTransaction();
          session.endSession();
          continue;
        }
      } else {
        updatedEvent = await Event.findByIdAndUpdate(
          event._id,
          { $inc: { attendeeCount: 1 } },
          { new: true, session }
        );
      }

      registration.status = 'approved';
      registration.approvalTime = Date.now();
      const registrationToken = uuidv4();
      registration.token = registrationToken;
      await registration.save();

      await session.commitTransaction();
      session.endSession();
      results.successful += 1;

      // Send ticket email
      try {
        if (event.isTicketRequired) {
          const qrDataUrl = await QRCode.toDataURL(registrationToken)
          const qrBuffer = await QRCode.toBuffer(registrationToken)
          const uploaded = await cloudinary.uploader.upload(qrDataUrl, { folder: 'event_qrcodes' })
          const emailContent = registrationConfirmEmail({
            userName: registration.user.name,
            eventTitle: event.title,
            eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
            eventLocation: event.location,
            qrImageUrl: uploaded.secure_url,
            isTicketRequired: true
          })
          await sendEmailWithAttachment(registration.user.email, `Ticket Confirmed for ${event.title}`, emailContent, [{ filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode@event' }])
        } else {
          const emailContent = registrationConfirmEmail({
            userName: registration.user.name,
            eventTitle: event.title,
            eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
            eventLocation: event.location,
            isTicketRequired: false
          })
          await sendEmail(registration.user.email, `Registration Confirmed for ${event.title}`, emailContent)
        }
        
        registration.$session(null);
        registration.emailSent = true;
        await registration.save();
      } catch (emailErr) {
        console.error(`Email failed to send for bulk approval regId ${regId}:`, emailErr);
        registration.$session(null);
        registration.emailSent = false;
        await registration.save();
        results.emailFailures += 1;
      }

    } catch (err) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      if (session) session.endSession();
      console.error(`Error approving regId ${regId}:`, err);
      results.failed += 1;
    }
  }

  res.status(200).json({ success: true, message: 'Bulk approval completed', results });
}

exports.bulkResendTickets = async (req, res) => {
  const { regIds } = req.body;
  if (!regIds || !Array.isArray(regIds)) {
    return res.status(400).json({ message: 'Invalid registration IDs array' });
  }

  const results = { successful: 0, failed: 0 };

  for (const regId of regIds) {
    try {
      const registration = await EventRegistration.findById(regId).populate('user').populate('event');
      if (!registration || registration.status !== 'approved' || !registration.token) {
        results.failed += 1;
        continue;
      }

      const qrCodeBuffer = await QRCode.toBuffer(registration.token, { type: 'png', width: 400, margin: 2 })
      
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'isa_qr_codes' }, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        const requireStream = require('stream');
        const bufferStream = new requireStream.PassThrough();
        bufferStream.end(qrCodeBuffer);
        bufferStream.pipe(stream);
      });

      const uploaded = await uploadPromise;

      const emailContent = ticketResentEmail({
        userName: registration.user.name,
        eventTitle: registration.event.title,
        qrImageUrl: uploaded.secure_url
      });

      await sendEmail(registration.user.email, `Registration Confirmed for ${registration.event.title}`, emailContent);
      
      registration.emailSent = true;
      await registration.save();
      results.successful += 1;
    } catch (err) {
      console.error(`Failed to resend ticket for regId ${regId}:`, err);
      try {
        const registration = await EventRegistration.findById(regId);
        if (registration) {
          registration.emailSent = false;
          await registration.save();
        }
      } catch(e) {}
      results.failed += 1;
    }
  }

  res.status(200).json({ message: 'Bulk resend completed', results });
}