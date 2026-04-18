const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'caregiver', 'patient'], required: true },
  language: { type: String, default: 'en' },
  // For patients:
  assignedCaregiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  age: { type: Number },
  gender: { type: String },
  phone: { type: String },
  medicalNotes: { type: String, default: '' },
  
  // For caregivers:
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // AI Diagnostics
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Pending'], default: 'Pending' },
  doctorRecommendation: { type: String, default: '' },
  isForwardedToDoctor: { type: Boolean, default: false },
  lastTestDate: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
