const eventTimeUpdateTemplate = ({
  userName,
  eventTitle,
  oldDate,
  newDate,
  eventLocation,
  eventUrl
}) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A0E17; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: #F97316; margin: 0;">Event Schedule Update</h2>
      </div>

      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb;">
        <p>Dear ${userName},</p>

        <p>We hope this message finds you well. We are writing to inform you that the schedule for 
        <strong>"${eventTitle}"</strong> has been revised. Please find the updated details below.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 12px 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
              <span style="font-size: 12px; text-transform: uppercase; color: #991b1b; font-weight: bold;">Previous Schedule</span><br/>
              <span style="font-size: 15px; color: #333;">${oldDate}</span>
            </td>
          </tr>
          <tr><td style="padding: 6px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
              <span style="font-size: 12px; text-transform: uppercase; color: #166534; font-weight: bold;">New Schedule</span><br/>
              <span style="font-size: 15px; color: #333; font-weight: 600;">${newDate}</span>
            </td>
          </tr>
        </table>

        <p style="margin-top: 16px;"><strong>Venue:</strong> ${eventLocation}</p>

        <p>We sincerely apologise for any inconvenience this change may cause. Kindly update your calendar to reflect the new timing. 
        Your registration remains confirmed, and no further action is required on your part.</p>
      </div>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">- ISA-India</p>
        <p style="margin: 4px 0 0 0;">You are receiving this email because you are registered for this event.</p>
      </div>
    </div>
  `
}

module.exports = eventTimeUpdateTemplate
