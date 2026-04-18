const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware


app.use(cors({
  origin: [
    'http://localhost:5174',
    'https://glittery-creponne-cdbecb.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});


// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
// const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cognicare';

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });
