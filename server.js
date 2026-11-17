const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');

// Import Mongoose Models
const Document = require('./models/Document');
const Chat = require('./models/Chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// MongoDB Connection
// -------------------------------------------------------------
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/documind-ai';
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 Connected to MongoDB (documind-ai)'))
  .catch(err => console.warn('⚠️ MongoDB not running locally. (Server will still run, but won\'t save history):', err.message));

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

// Helper to pause execution for a few milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithFallback(prompt, systemInstruction = '', maxRetries = 2) {
  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: systemInstruction ? { systemInstruction: systemInstruction } : undefined,
        });
        return { text: response.text, modelUsed: model };
      } catch (err) {
        console.warn(`[AI Warn] ${model} attempt ${attempt} failed (${err.status || err.message}).`);
        if (attempt < maxRetries) {
          console.log(`[AI Retry] Waiting 1.5s before retrying ${model}...`);
          await sleep(1500); // Wait 1.5 seconds for Google's traffic spike to clear
        }
      }
    }
  }
  throw new Error('All AI models failed to respond. Please try again in a few moments.');
}

// -------------------------------------------------------------
// Endpoint 1: Health Check
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    message: 'DocuMind AI Server is running!'
  });
});

// -------------------------------------------------------------
// Endpoint 2: Get All Past Documents (For Sidebar History)
// -------------------------------------------------------------
app.get('/api/documents', async (req, res) => {
  try {
    const docs = await Document.find({}, 'title modelUsed createdAt').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Endpoint 3: Get Single Document and its Chat History
// -------------------------------------------------------------
app.get('/api/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const chats = await Chat.find({ documentId: req.params.id }).sort({ timestamp: 1 });
    res.json({ document: doc, chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Endpoint 4: Analyze Document & Save to MongoDB
// -------------------------------------------------------------
app.post('/api/analyze-document', async (req, res) => {
  try {
    const { documentText, documentTitle } = req.body;

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({ error: 'documentText is required.' });
    }

    const systemInstruction = 
      "You are an expert enterprise document intelligence analyzer. " +
      "Analyze the given document text objectively and accurately. Do not invent details.";

    const prompt = `
Analyze the following document titled "${documentTitle || 'Untitled Document'}":

--- DOCUMENT CONTENT ---
${documentText}
------------------------

Provide a clear response with the following 3 sections:
1. EXECUTIVE SUMMARY (3-4 bullet points in plain English)
2. KEY INCLUSIONS & RIGHTS (What is covered or agreed upon)
3. EXCLUSIONS, PENALTIES & RISKS (Important limitations or red flags)
`;

    console.log(`[POST /api/analyze-document] Analyzing "${documentTitle || 'Untitled'}"...`);
    const result = await generateWithFallback(prompt, systemInstruction);

    // Save to MongoDB if database is connected
    let savedDocId = null;
    if (mongoose.connection.readyState === 1) {
      const newDoc = await Document.create({
        title: documentTitle || 'Untitled Document',
        content: documentText,
        analysis: result.text,
        modelUsed: result.modelUsed
      });
      savedDocId = newDoc._id;
      console.log(`💾 Saved document to MongoDB with ID: ${savedDocId}`);
    }

    res.json({
      success: true,
      documentId: savedDocId,
      documentTitle: documentTitle || 'Untitled',
      analysis: result.text,
      modelUsed: result.modelUsed,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in /api/analyze-document:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Endpoint 5: Ask Question & Save to Chat History
// -------------------------------------------------------------
app.post('/api/ask-question', async (req, res) => {
  try {
    const { documentText, question, documentId } = req.body;

    if (!documentText || !question) {
      return res.status(400).json({ error: 'Both documentText and question are required.' });
    }

    const systemInstruction = 
      "You are an expert legal and policy document assistant. " +
      "Answer the user's question by applying the rules, limits, and exclusions stated in the provided document. " +
      "If the question involves a scenario that violates a limit or falls under an exclusion, explicitly state that it is not covered and explain why using the document rules. " +
      "Only if the document has zero relevance to the subject, state that the information is not found.";

    const prompt = `
Context Document:
"""
${documentText}
"""

User Question: ${question}

Provide a direct, clear answer with bullet points citing specific rules from the document:
`;

    console.log(`[POST /api/ask-question] Question: "${question}"`);
    const result = await generateWithFallback(prompt, systemInstruction);

    // Save chat to MongoDB if documentId exists and database is connected
    if (documentId && mongoose.connection.readyState === 1) {
      await Chat.create({
        documentId: documentId,
        question: question,
        answer: result.text,
        modelUsed: result.modelUsed
      });
      console.log(`💬 Saved question & answer to Chat history for document: ${documentId}`);
    }

    res.json({
      success: true,
      question: question,
      answer: result.text,
      modelUsed: result.modelUsed
    });

  } catch (error) {
    console.error("Error in /api/ask-question:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints available:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/documents`);
  console.log(`   GET  http://localhost:${PORT}/api/documents/:id`);
  console.log(`   POST http://localhost:${PORT}/api/analyze-document`);
  console.log(`   POST http://localhost:${PORT}/api/ask-question\n`);
});

module.exports = app;