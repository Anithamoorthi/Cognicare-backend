const express = require('express');
const { OpenAI } = require('openai');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/message', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are CogniCare, a compassionate AI assistant helping patients with early dementia. You guide users through tests, explain risk levels, and answer basic dementia-related queries simply.' },
        { role: 'user', content: message }
      ],
      model: 'gpt-3.5-turbo',
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "I'm currently unable to connect to my knowledge base. Please try again later." });
  }
});

const User = require('../models/User');
const TestResult = require('../models/TestResult');

// Post-7-day evaluation AI endpoint
router.post('/evaluate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch user's tests
    const testResults = await TestResult.find({ patientId: userId }).sort('day');
    
    if (testResults.length < 7) {
      return res.status(400).json({ error: "7-day analysis incomplete." });
    }

    // Format tests for AI
    const summaryStr = testResults.map(t => `Day ${t.day}: ${t.score}/${t.maxScore} (Attention: ${t.attentionScore}%, Time: ${t.averageResponseTime}s)`).join('\n');

    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are a specialist neurologist analyzing cognitive test results for early dementia detection. 
          Analyze the data and provide a diagnosis in JSON format: {"riskLevel": "Low"|"Medium"|"High", "recommendations": ["string"], "doctorNote": "string"}. 
          Criteria:
          - Low (Scores > 75%): Healthy. Suggest brain games and aerobic exercise.
          - Medium (Scores 50-75%): Mild changes. Suggest clinical check-up and memory exercises.
          - High (Scores < 50%): Significant decline. MUST recommend immediate neurology consultation.
          Keep recommendations medical-grade and concise.` 
        },
        { role: 'user', content: `Patient Name: ${req.user.name}\n7-Day Results:\n${summaryStr}` }
      ],
      model: 'gpt-3.5-turbo',
      response_format: { type: "json_object" }
    });

    const report = JSON.parse(completion.choices[0].message.content);
    
    // Determine if it should be forwarded
    const isForwardedToDoctor = report.riskLevel === 'High';

    // Update user profile
    await User.findByIdAndUpdate(userId, {
      riskLevel: report.riskLevel,
      doctorRecommendation: report.recommendations.join('. ') + (report.doctorNote ? `. ${report.doctorNote}` : ''),
      isForwardedToDoctor
    });

    res.json({ ...report, isForwardedToDoctor });
  } catch (error) {
    console.error("AI Evaluation failed:", error);
    res.status(500).json({ error: "Failed to evaluate data with AI. Please try again later." });
  }
});

module.exports = router;
