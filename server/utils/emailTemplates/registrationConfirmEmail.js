const baseEmailTemplate = require('./baseEmailTemplate')

const registrationConfirmEmail = ({
  userName,
  eventTitle,
  eventDate,
  eventLocation,
  qrImageUrl,
  isTicketRequired = true
}) => {
  const qrSection = isTicketRequired
    ? `
        <div style="background: #f9fafb; padding: 12px; border-left: 4px solid #4F46E5; margin: 20px 0; border-radius: 4px;">
          <strong>Important:</strong> Please save the attached QR code for entry at the venue.
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <img src="${qrImageUrl}" alt="QR Code" style="max-width: 200px; border-radius: 8px;" />
        </div>
      `
    : `
        <div style="background: #f9fafb; padding: 12px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px;">
          No ticket is required for this event. Just show up and enjoy!
        </div>
      `;

  const content = `
    <p>Hi ${userName},</p>

    <p>You have successfully registered for <strong>"${eventTitle}"</strong>
       on <strong>${eventDate}</strong> at <strong>${eventLocation}</strong>.</p>

    ${qrSection}
  `;

  return baseEmailTemplate(`Event Registration Confirmed`, content);
}

module.exports = registrationConfirmEmail
