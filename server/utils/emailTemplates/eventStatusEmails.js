const baseEmailTemplate = require('./baseEmailTemplate');

const unregisterEventEmail = ({ userName, eventTitle, eventDate, eventLocation }) => {
  const content = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>You have successfully unregistered from <strong>"${eventTitle}"</strong> scheduled on 
    <strong>${eventDate}</strong> at <strong>${eventLocation}</strong>.</p>
    <p>Hope to see you at our future events!</p>
  `;
  return baseEmailTemplate(`Unregistered from ${eventTitle}`, content);
};

const eventApprovedEmail = ({ userName, eventTitle, eventDate, eventLocation, eventUrl }) => {
  const content = `
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Good news! Your event <strong>"${eventTitle}"</strong> scheduled for 
    <strong>${eventDate}</strong> at <strong>${eventLocation}</strong> has been approved and is now live on ISA.</p>
    
    <p>👉 Share your event link with others to start registrations:  
    <a href="${eventUrl}" target="_blank">View Event</a></p>

    <p>Thank you for choosing our platform to host your event—we're excited to see it come to life!</p>
  `;
  return baseEmailTemplate(`Your event is now live!`, content);
};

const eventRejectedEmail = ({ userName, eventTitle, eventDate, eventLocation, adminComment }) => {
  const content = `
    <p>Hello <strong>${userName}</strong>,</p>
    <p>We regret to inform you that your event <strong>"${eventTitle}"</strong>, 
    scheduled for <strong>${eventDate}</strong> at <strong>${eventLocation}</strong>, 
    has been <span style="color:red;font-weight:bold;">rejected</span> after review.</p>
    
    <p><strong>Reason from Admin:</strong></p>
    <blockquote style="border-left: 3px solid #ccc; margin: 10px 0; padding-left: 10px; color:#555;">
      ${adminComment || 'No specific reason provided.'}
    </blockquote>

    <p>If you believe this was a mistake, you may revise and resubmit your event for consideration.</p>
    <p>We appreciate your interest in sharing events with the ISA community and encourage you to keep contributing!</p>
  `;
  return baseEmailTemplate(`Update on your event: ${eventTitle}`, content);
};

// when user pays and transaction id is pending for verification
const manualRegistrationPendingEmail = ({ userName, eventTitle, transactionId }) => {
  const content = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>We have received your payment details (UPI transaction ID: <strong>${transactionId}</strong>) for the event <strong>"${eventTitle}"</strong>.</p>
    <p>Your registration is currently under review by the organizers. You will receive your confirmation ticket once the cross-verification is completed, which may take a few hours.</p>
    <p>Thank you for your patience!</p>
  `;
  return baseEmailTemplate(`Registration Pending Verification`, content);
};

// payment verification failed
const paymentVerificationFailedEmail = ({ userName, eventTitle, transactionId }) => {
  const content = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>There was an issue verifying your payment (UPI transaction ID: <strong>${transactionId}</strong>) for the event <strong>"${eventTitle}"</strong>.</p>
    
    <p><strong>Here is what you can do from here:</strong></p>
    <ol>
      <li>Go back to the event page on our website.</li>
      <li>Click on the "Payment Not Found - Try Again" button.</li>
      <li>A popup will open where you can resubmit your correct 12-digit UPI transaction ID.</li>
    </ol>

    <p>If your payment actually failed previously and you need to pay again, click the small link at the bottom of the popup to see the QR code and make a new payment.</p>

    <p>Please resubmit your correct UPI transaction ID or make a new payment as soon as possible to secure your spot.</p>
  `;
  return baseEmailTemplate(`Payment Verification Failed`, content);
};

// resend ticket
const ticketResentEmail = ({ userName, eventTitle, qrImageUrl }) => {
  const content = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>Here is your ticket for <strong>"${eventTitle}"</strong>. The attached QR is required for entry at the venue.</p>
    
    <div style="margin: 20px 0;">
      <img src="${qrImageUrl}" alt="Event QR Ticket" style="width: 250px; height: 250px; border: 1px solid #ccc; padding: 10px;" />
    </div>
    
    <p>If the image doesn't load, <a href="${qrImageUrl}">click here</a> to view your ticket.</p>
    <p>See you there!</p>
  `;
  return baseEmailTemplate(`Event Registration Confirmed`, content);
};

module.exports = {
  unregisterEventEmail,
  eventApprovedEmail,
  eventRejectedEmail,
  manualRegistrationPendingEmail,
  paymentVerificationFailedEmail,
  ticketResentEmail
};
