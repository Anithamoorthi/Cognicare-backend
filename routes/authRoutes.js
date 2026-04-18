const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, language } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      language: language || 'en'
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, language: user.language },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        riskLevel: user.riskLevel,
        isForwardedToDoctor: user.isForwardedToDoctor,
        doctorRecommendation: user.doctorRecommendation
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all patients
router.get('/patients', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .populate('assignedCaregiver', 'name');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all caregivers
router.get('/caregivers', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const caregivers = await User.find({ role: 'caregiver' }).select('-password');
    res.json(caregivers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Assign patient to caregiver
router.post('/assign', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { patientId, caregiverId } = req.body;
    await User.findByIdAndUpdate(patientId, { assignedCaregiver: caregiverId });
    await User.findByIdAndUpdate(caregiverId, { $addToSet: { patients: patientId } });
    res.json({ message: 'Patient assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create patient
router.post('/patients/add', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { name, email, password, age, gender, phone, assignedCaregiver } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const patient = new User({
      name, email, password: hashedPassword, role: 'patient',
      age, gender, phone, assignedCaregiver, language: 'en'
    });
    await patient.save();

    if (assignedCaregiver) {
      await User.findByIdAndUpdate(assignedCaregiver, { $addToSet: { patients: patient._id } });
    }
    res.status(201).json({ message: 'Patient created successfully', patient });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete user
router.delete('/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Caregiver: Get assigned patients
router.get('/caregiver/patients', authMiddleware, roleMiddleware(['caregiver']), async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient', assignedCaregiver: req.user.id }).select('-password');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
