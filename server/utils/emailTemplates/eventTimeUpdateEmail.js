const baseEmailTemplate = require('./baseEmailTemplate');

const eventTimeUpdateEmail = ({
  userName,
  eventTitle,
  oldDate,
  newDate,
  eventLocation,
  eventUrl
}) => {
  const content = `
    <p>Hi ${userName},</p>

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
  `;

  return baseEmailTemplate(`Event Schedule Update`, content);
}

module.exports = eventTimeUpdateEmail;
