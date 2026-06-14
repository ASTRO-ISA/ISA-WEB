const User = require('../models/userModel')
const AuditLog = require('../models/auditLogModel')

//create admin
exports.createAdmin = async (req, res) => {
  try {
    const newAdmin = await User.create({
      name: req.body.name,
      email: req.body.email,
      phoneNo: req.body.phoneNo,
      role: 'admin',
      password: req.body.password,
      confirmPassword: req.body.confirmPassword
    })

    res.locals.documentId = newAdmin._id

    res.status(201).json({
      status: 'success',
      message: 'Admin created successfully',
      data: newAdmin
    })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}

//get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })

    if (!admins.length) {
      return res
        .status(200)
        .json({ status: 'success', data: [], message: 'No admins found' })
    }

    res
      .status(200)
      .json({ status: 'success', results: admins.length, data: admins })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}

// Delete Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id
    const deletedAdmin = await User.findByIdAndDelete(adminId)

    if (!deletedAdmin) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Admin not found' })
    }

    res
      .status(200)
      .json({ status: 'success', message: 'Admin deleted successfully' })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}

// Update Admin
exports.updateAdmin = async (req, res) => {
  try {
    const adminId = req.params.id

    const admin = await User.findById(adminId)

    if (!admin) {
      return res.status(404).json({ status: 'fail', message: 'Admin not found' })
    }

    if (req.body.name) admin.name = req.body.name
    if (req.body.email) admin.email = req.body.email
    if (req.body.phoneNo) admin.phoneNo = req.body.phoneNo

    if (req.body.newPassword) {
      admin.password = req.body.newPassword
    }

    const updatedAdmin = await admin.save({ runValidators: true })

    updatedAdmin.password = undefined

    res.status(200).json({
      status: 'success',
      message: 'Admin updated successfully',
      data: updatedAdmin
    })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}

// Get all audit logs with pagination
exports.getAllAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit

    const totalLogs = await AuditLog.countDocuments()
    const logs = await AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    res.status(200).json({
      status: 'success',
      data: logs,
      pagination: {
        total: totalLogs,
        page,
        pages: Math.ceil(totalLogs / limit),
      }
    })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}