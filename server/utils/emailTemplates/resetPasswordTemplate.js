const resetPasswordTemplate = ({ userName, resetLink }) => {
  return `
  <p>Hello ${userName || 'User'},</p>

  <p>We received a request to reset your password for your ISA account.</p>

  <p>You can reset your password by clicking the link below:</p>
  <p>
    <a href="${resetLink}" target="_blank">Reset your password</a>
  </p>

  <p>If you did not request a password reset, please ignore this email.  
  Your account will remain secure and no changes will be made.</p>

  <p>Best regards,<br>
  Team ISA</p>
  `
}

module.exports = resetPasswordTemplate
