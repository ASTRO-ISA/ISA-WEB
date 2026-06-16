const jwt = require('jsonwebtoken')

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

exports.createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)

  const isProduction = process.env.NODE_ENV === 'production'

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    partitioned: isProduction,
  }

  // Only set domain in production if COOKIE_DOMAIN is configured.
  // In development, omit domain so the browser defaults to the request hostname.
  if (isProduction && process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN
  }

  res.cookie('jwt', token, cookieOptions)

  user.password = undefined

  return res.status(statusCode).json({
    message: 'Success',
    token,
    data: {
      user
    }
  })
}
