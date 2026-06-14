const cron = require('node-cron');
const Event = require('../../models/eventModel');
const EventRegistration = require('../../models/eventRegistrationModel');
const xlsx = require('xlsx');
const { sendEmailWithAttachment } = require('../sendEmail');
const dailyReportEmail = require('../emailTemplates/dailyReportEmail');

// Run at midnight every day
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily registration report cron job...');
  try {
    const now = new Date();
    
    // Find upcoming events (eventDate > Date.now() and not deleted)
    const upcomingEvents = await Event.find({
      eventDate: { $gt: now },
      isDeleted: { $ne: true },
      status: { $ne: 'completed' }
    }).populate('createdBy', 'name email');

    for (const event of upcomingEvents) {
      if (!event.createdBy || !event.createdBy.email) continue;

      // Fetch all registrations for this event
      const registrations = await EventRegistration.find({ event: event._id })
        .populate('user', 'name email phoneNo')
        .lean();

      if (registrations.length === 0) continue; // Skip if no registrations

      const data = registrations.map((entry, index) => {
        const user = entry.user || {};
        return {
          "S.No.": index + 1,
          "Name": user.name || "",
          "Email": user.email || "",
          "Phone": user.phoneNo || "",
          "Status": entry.status,
          "Transaction ID": entry.transactionId || "",
          "Registration Date": entry.registeredAt ? new Date(entry.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "",
          "Payment Date": entry.paymentTime ? new Date(entry.paymentTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "",
          "Scanned Count": entry.scanCount || 0
        };
      });

      const approvedCount = registrations.filter(r => r.status === 'approved').length;

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);
      
      // Adjust column widths
      ws['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 15 }];
      
      xlsx.utils.book_append_sheet(wb, ws, 'Registrations');
      
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const emailContent = dailyReportEmail({
        organizerName: event.createdBy.name,
        eventTitle: event.title,
        eventDate: new Date(event.eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }),
        totalRegistrations: registrations.length,
        approvedRegistrations: approvedCount
      });

      const fileName = `${event.slug}-daily-report-${new Date().toISOString().split('T')[0]}.xlsx`;

      await sendEmailWithAttachment(
        event.createdBy.email,
        `Daily Registration Report: ${event.title}`,
        emailContent,
        [{ filename: fileName, content: buffer }]
      );
      
      console.log(`Sent daily report for event ${event.title} to ${event.createdBy.email}`);
    }
  } catch (error) {
    console.error('Error in daily report cron job:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

console.log('Daily registration report cron job initialized (runs at midnight IST)');
