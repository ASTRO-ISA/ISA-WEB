const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  lastBackupTime: {
    type: Date,
    default: Date.now
  }
}, { strict: false });

const EventBackup = mongoose.model('EventBackup', backupSchema);
const EventRegistrationBackup = mongoose.model('EventRegistrationBackup', backupSchema);

module.exports = { EventBackup, EventRegistrationBackup };
