const baseEmailTemplate = require('./baseEmailTemplate')

const scannerInviteEmail = ({
  scannerName,
  eventTitle,
  eventDate,
  eventLocation,
  scannerLink
}) => {
  const content = `
    <p>Hi ${scannerName},</p>

    <p>You have been added as a <strong>door scanner</strong> for the following event:</p>

    <div style="background: #f9fafb; padding: 16px; border-left: 4px solid #F97316; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Event:</strong> ${eventTitle}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${eventDate}</p>
      <p style="margin: 4px 0;"><strong>Location:</strong> ${eventLocation}</p>
    </div>

    <p>Click the button below to open the scanner directly on your phone:</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${scannerLink}"
         style="display: inline-block; background: #F97316; color: #ffffff; text-decoration: none;
                padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Open Scanner
      </a>
    </div>

    <p style="color: #6b7280; font-size: 13px;">
      This link will log you in automatically. It expires in <strong>1 day</strong> for security purposes.
      Do not share this link with anyone.
    </p>
  `;

  return baseEmailTemplate(`You've been added as a Scanner`, content);
}

module.exports = scannerInviteEmail;
