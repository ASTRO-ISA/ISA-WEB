const baseEmailTemplate = require('./baseEmailTemplate')

const dailyReportEmail = ({
  organizerName,
  eventTitle,
  eventDate,
  totalRegistrations,
  approvedRegistrations
}) => {
  const content = `
    <p>Hi ${organizerName},</p>

    <p>Here is your registration report for your upcoming event:</p>

    <div style="background: #f9fafb; padding: 16px; border-left: 4px solid #10B981; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Event:</strong> ${eventTitle}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${eventDate}</p>
      <p style="margin: 4px 0;"><strong>Total Registrations:</strong> ${totalRegistrations}</p>
      <p style="margin: 4px 0;"><strong>Approved:</strong> ${approvedRegistrations}</p>
    </div>

    <p>Please find the attached Excel file containing the complete list of all users who have registered (including pending, approved, and flagged users).</p>

    <p>This report is generated automatically every day at midnight for all your upcoming events.</p>
  `;

  return baseEmailTemplate(`Daily Registration Report: ${eventTitle}`, content);
}

module.exports = dailyReportEmail;
