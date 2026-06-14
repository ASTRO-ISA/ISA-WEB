const cron = require('node-cron');
const Event = require('../../models/eventModel');
const EventRegistration = require('../../models/eventRegistrationModel');
const { EventBackup, EventRegistrationBackup } = require('../../models/backupModels');

const runBackupJob = async () => {
  // console.log('Running 6-hour backup job for events and registrations...');
  try {
    // 1. Backup all Events
    const events = await Event.find({}).lean();
    let eventBackupCount = 0;
    
    for (const event of events) {
      try {
        await EventBackup.findOneAndUpdate(
          { originalId: event._id },
          { 
            originalId: event._id,
            data: event,
            lastBackupTime: new Date()
          },
          { upsert: true, new: true }
        );
        eventBackupCount++;
      } catch (err) {
        console.error(`Error backing up event ${event._id}:`, err);
      }
    }

    // 2. Backup all Event Registrations
    const registrations = await EventRegistration.find({}).lean();
    let regBackupCount = 0;

    for (const reg of registrations) {
      try {
        await EventRegistrationBackup.findOneAndUpdate(
          { originalId: reg._id },
          {
            originalId: reg._id,
            data: reg,
            lastBackupTime: new Date()
          },
          { upsert: true, new: true }
        );
        regBackupCount++;
      } catch (err) {
        console.error(`Error backing up registration ${reg._id}:`, err);
      }
    }

    console.log(`Backup completed successfully: ${eventBackupCount} events, ${regBackupCount} registrations.`);
  } catch (error) {
    console.error('Fatal error in backup cron job:', error);
  }
};

// Schedule job to run every 6 hours
cron.schedule('0 */1 * * *', runBackupJob, {
  timezone: "Asia/Kolkata"
});

// console.log('Event & Registration Backup cron job initialized (runs every 6 hours)');

module.exports = { runBackupJob };
