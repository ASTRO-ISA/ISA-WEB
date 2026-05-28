const scannerInviteTemplate = ({
  scannerName,
  eventTitle,
  eventDate,
  eventLocation,
  scannerLink
}) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A0E17; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: #F97316; margin: 0;">You've been added as a Scanner</h2>
      </div>

      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb;">
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
      </div>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">– ISA-India</p>
      </div>
    </div>
  `
}

module.exports = scannerInviteTemplate
