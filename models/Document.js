const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Document'
  },
  content: {
    type: String,
    required: true
  },
  analysis: {
    type: String,
    required: true
  },
  modelUsed: {
    type: String,
    default: 'gemini-3.5-flash-lite'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
