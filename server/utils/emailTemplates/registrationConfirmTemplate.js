const registrationConfirmTemplate = ({
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
      `

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A0E17; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: #F97316; margin: 0;">Event Registration Confirmed</h2>
      </div>

      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb;">
        <p>Hi ${userName},</p>

        <p>You have successfully registered for <strong>"${eventTitle}"</strong>
           on <strong>${eventDate}</strong> at <strong>${eventLocation}</strong>.</p>

        ${qrSection}
      </div>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">– ISA-India</p>
      </div>
    </div>
  `
}

module.exports = registrationConfirmTemplate
