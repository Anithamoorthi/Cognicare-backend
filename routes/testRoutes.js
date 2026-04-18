const express = require('express');
const TestResult = require('../models/TestResult');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Submit a test result
router.post('/submit', authMiddleware, roleMiddleware(['patient']), async (req, res) => {
  try {
    const { day, score, maxScore, averageResponseTime, attentionScore } = req.body;
    
    // Stricter calendar-day check: Only one test allowed per 24-hour period (or per calendar day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingTestToday = await TestResult.findOne({ 
      patientId: req.user.id, 
      dateTaken: { $gte: today } 
    });
    
    if (existingTestToday) {
      return res.status(400).json({ message: "You have already completed your test for today. Please return tomorrow." });
    }

    // Check if the specific day index was already taken (redundant but safe)
    const existingDayTest = await TestResult.findOne({ patientId: req.user.id, day });
    if (existingDayTest) {
      return res.status(400).json({ message: `Test for day ${day} already completed.` });
    }

    // Calculate Risk Level for this specific test
    const percentage = (score / maxScore) * 100;
    let riskLevel = 'Low';
    if (percentage < 45) riskLevel = 'High';
    else if (percentage < 70) riskLevel = 'Medium';

    const testResult = new TestResult({
      patientId: req.user.id,
      day,
      score,
      maxScore,
      averageResponseTime,
      attentionScore,
      riskLevel,
      testBreakdown: req.body.testBreakdown || {}
    });

    await testResult.save();
    res.status(201).json({ message: 'Test submitted successfully', result: testResult });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get patient's own history
router.get('/history', authMiddleware, roleMiddleware(['patient']), async (req, res) => {
  try {
    const results = await TestResult.find({ patientId: req.user.id }).sort('day');
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Caregiver view of assigned patient tests
router.get('/patient/:patientId', authMiddleware, roleMiddleware(['caregiver', 'admin']), async (req, res) => {
  try {
    const results = await TestResult.find({ patientId: req.params.patientId }).sort('day');
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
