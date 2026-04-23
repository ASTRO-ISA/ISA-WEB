const nodemailer = require('nodemailer');
require('dotenv').config();

// initialize the transporter ONCE globally to save server resources
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT, // 587
  secure: process.env.SMTP_PORT === '465', // false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// verify the connection when the server starts
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `ISA-India <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const sendNewsletter = async ({ bcc, subject, html }) => {
  try {
    const mailOptions = {
      from: `noreply <${process.env.SMTP_USER}>`,
      bcc,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log('Newsletter sent successfully');
  } catch (err) {
    console.error('Error sending newsletter:', err.message);
  }
};

const sendEmailWithAttachment = async (to, subject, html, attachments = []) => {
  try {
    const mailOptions = {
      from: `ISA-India <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments // will include attachments if provided
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email with attachment sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email with attachment:', error);
  }
};

module.exports = { sendEmail, sendNewsletter, sendEmailWithAttachment };