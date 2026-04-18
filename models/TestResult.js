const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Number, required: true }, // 1 to 7
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  averageResponseTime: { type: Number }, // in seconds
  attentionScore: { type: Number }, // derived from OpenCV eye tracking 0-100%
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Pending'], default: 'Pending' },
  testBreakdown: {
    memory: Number,
    reaction: Number,
    qa: Number,
    speech: Number
  },
  dateTaken: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestResult', testResultSchema);
