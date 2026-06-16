const User = require('../models/userModel')
const jwt = require('jsonwebtoken')
const { sendEmail } = require('../utils/sendEmail')
const generateAndSendToken = require('../utils/generateAndSendToken')
const otpService = require('../services/otpService')
const resetPasswordTemplate = require('../utils/emailTemplates/resetPasswordTemplate')

exports.signup = async (req, res) => {
  try {
    let { name, email, phoneNo, password, confirmPassword } = req.body

    if (!email) {
      return res.status(400).json({ status: 'Fail', message: 'Email is required' })
    }
    email = email.trim().toLowerCase()

    // check if email already registered
    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(409).json({ message: 'A user with this email or username already exists.' })

    const user = await User.create({
      name,
      email,
      phoneNo,
      password,
      confirmPassword
    })

    // send OTP
    await otpService.sendOtp(user.email, sendEmail)
    // generateAndSendToken.createSendToken(user, 200, res)
    res.status(200).json({
      message: 'Signup successful. Please verify your email with OTP.'
    })
  } catch (error) {
    res.status(500).json({ status: 'Fail', message: error.message })
  }
}

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body

    //check both email and password are there
    if (!email || !password) {
      return res.status(400).json({
        status: 'Fail',
        message: 'Please provide both email and Password'
      })
    }

    email = email.trim().toLowerCase()

    const user = await User.findOne({ email }).select('+password')

    //   if user present then compare password
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res
        .status(401)
        .json({ status: 'Fail', message: 'Incorrect email or password' })
    }

    // 3) Check verification
    if (!user.isVerified) {
      // Re-send OTP
      await otpService.sendOtp(user.email, sendEmail)
      return res.status(403).json({
        message: 'Please verify your email before logging in. OTP sent again.'
      })
    }

    generateAndSendToken.createSendToken(user, 200, res)
  } catch (error) {
    res.status(500).json({ status: 'Fail', message: error.message })
  }
}

exports.logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production'

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    partitioned: isProduction,
    expires: new Date(0)
  }

  if (isProduction && process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN
  }

  res.cookie('jwt', '', cookieOptions)
  res.status(200).json({ status: 'success', message: 'Logged out' })
}

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // 1. Get user and include password field
    const user = await User.findById(req.user.id).select('+password')

    // 2. Check if current password is correct
    const isCorrect = await user.correctPassword(currentPassword, user.password)
    if (!isCorrect) {
      return res.status(401).json({
        status: 'fail',
        message: 'Current password is incorrect'
      })
    }

    // 3. Set new password and save
    user.password = newPassword
    await user.save() // Will trigger pre-save hash + passwordChangedAt

    // 4. Send new JWT
    generateAndSendToken.createSendToken(user, 200, res)
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body

    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Email is required' })
    }
    email = String(email).trim().toLowerCase()

    const user = await User.findOne({ email })
    if (!user)
      return res.status(404).json({ message: 'User not found with this email' })
    if (user.role === 'admin') {
      return res.status(403).json({ status: 'fail', message: 'Administrators are not permitted to reset passwords via this route.' })
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '15m'
    })

    const resetLink = `${process.env.ORIGIN_FRONTEND}/reset-password/${token}`

    const html = resetPasswordTemplate({ userName: user.name, resetLink })

    await sendEmail(user.email, 'Reset your password', html)

    res.status(200).json({ message: 'Reset link sent to email' })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('+password')
    if (!user) return res.status(400).json({ message: 'Invalid user' })
    if (user.role === 'admin') {
      return res.status(403).json({ status: 'fail', message: 'Administrators are not permitted to reset passwords via this route.' })
    }

    user.password = newPassword
    user.passwordChangedAt = Date.now()
    await user.save()

    res
      .status(200)
      .json({ status: 'success', message: 'Password has been reset' })
  } catch (err) {
    return res.status(400).json({
      message: 'Invalid or expired token',
      error: err.message
    })
  }
}

// otp
exports.verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body

    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Email is required' })
    }
    email = email.trim().toLowerCase()

    const user = await otpService.verifyOtp(email, otp)

    generateAndSendToken.createSendToken(user, 200, res)
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message })
  }
}

exports.resendOtp = async (req, res) => {
  try {
    let { email } = req.body

    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Email is required' })
    }
    email = email.trim().toLowerCase()

    // if user exists
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' })
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Email already verified' })
    }

    // Send new OTP
    await otpService.sendOtp(email, sendEmail)

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully. Check your inbox.'
    })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}

exports.scannerLogin = async (req, res) => {
  try {
    const { scannerToken } = req.body

    if (!scannerToken) {
      return res.status(400).json({ status: 'fail', message: 'Scanner token is required' })
    }

    // Verify the scanner token
    let decoded
    try {
      decoded = jwt.verify(scannerToken, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ status: 'fail', message: 'Invalid or expired scanner link' })
    }

    // Ensure this token was issued for scanner login purpose
    if (decoded.purpose !== 'scanner-login') {
      return res.status(401).json({ status: 'fail', message: 'Invalid token type' })
    }

    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' })
    }

    // Set the JWT cookie and respond with user data (auto-login)
    generateAndSendToken.createSendToken(user, 200, res)
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message })
  }
}