import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const SAMPLE_POLICY = `COMMERCIAL VENDOR & DRIVER AGREEMENT - SECTION 4: VEHICLE ROADSIDE ASSISTANCE
Coverage Limits:
1. Towing services are covered up to a maximum radius of 50 km from the incident location.
2. Fuel delivery covers emergency delivery of up to 5 liters of fuel (fuel cost to be paid by driver).
3. Flat tire assistance is provided on-site only if the driver carries an operational spare tire.

Exclusions & Penalties:
1. Incidents occurring off-road, on unpaved private logging trails, or during illegal street contests are strictly excluded.
2. If an incident report is submitted more than 48 hours after occurrence, claims will be denied.
3. Maximum compensation for accidental cargo damage during roadside towing is capped at $5,000.`;

function App() {
  const [docTitle, setDocTitle] = useState('Vendor RSA Agreement 2026');
  const [docText, setDocText] = useState(SAMPLE_POLICY);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Chat State
  const [chats, setChats] = useState([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Database History State
  const [savedDocs, setSavedDocs] = useState([]);
  const [dbStatus, setDbStatus] = useState('Checking...');

  // 1. On Mount: Check Health & Fetch Past Documents from MongoDB
  useEffect(() => {
    fetchHealth();
    fetchSavedDocs();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setDbStatus(data.database === 'CONNECTED' ? '🍃 MongoDB Connected' : '⚠️ DB Disconnected');
    } catch {
      setDbStatus('❌ Backend Offline');
    }
  };

  const fetchSavedDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      const data = await res.json();
      if (Array.isArray(data)) setSavedDocs(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  // 2. Trigger Document Analysis
  const handleAnalyze = async () => {
    if (!docText.trim()) return alert('Please enter document text!');
    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const res = await fetch(`${API_BASE}/analyze-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentTitle: docTitle, documentText: docText }),
      });
      const data = await res.json();

      if (data.success) {
        setAnalysis(data.analysis);
        setCurrentDocId(data.documentId);
        fetchSavedDocs(); // Refresh sidebar
      } else {
        alert(data.error || 'Analysis failed');
      }
    } catch (err) {
      alert('Error connecting to backend: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Ask Question Over Document
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQ = question;
    setQuestion('');
    setIsAsking(true);

    // Optimistic UI update
    const tempChats = [...chats, { question: userQ, answer: 'Thinking...' }];
    setChats(tempChats);

    try {
      const res = await fetch(`${API_BASE}/ask-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: currentDocId,
          documentText: docText,
          question: userQ,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setChats([...chats, { question: userQ, answer: data.answer }]);
      } else {
        setChats([...chats, { question: userQ, answer: 'Error: ' + data.error }]);
      }
    } catch (err) {
      setChats([...chats, { question: userQ, answer: 'Connection error: ' + err.message }]);
    } finally {
      setIsAsking(false);
    }
  };

  // 4. Load a Past Document from MongoDB
  const handleSelectDoc = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`);
      const data = await res.json();
      if (data.document) {
        setDocTitle(data.document.title);
        setDocText(data.document.content);
        setAnalysis(data.document.analysis);
        setCurrentDocId(data.document._id);
        setChats(data.chats || []);
      }
    } catch (err) {
      alert('Error loading document: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div className="logo-section">
          <h2>⚡ DocuMind AI</h2>
          <span className="subtitle">Enterprise Document & Policy Intelligence</span>
        </div>
        <div className="status-badge">
          <span>{dbStatus}</span>
        </div>
      </header>

      {/* 3-COLUMN WORKSPACE */}
      <div className="main-workspace">
        {/* SIDEBAR: Saved Docs from MongoDB */}
        <aside className="sidebar">
          <h3>📁 Saved Contracts ({savedDocs.length})</h3>
          <div className="doc-list">
            {savedDocs.map((doc) => (
              <div
                key={doc._id}
                className={`doc-item ${currentDocId === doc._id ? 'active' : ''}`}
                onClick={() => handleSelectDoc(doc._id)}
              >
                <strong>{doc.title}</strong>
                <small>{new Date(doc.createdAt).toLocaleDateString()}</small>
              </div>
            ))}
            {savedDocs.length === 0 && <p className="empty-text">No saved documents yet.</p>}
          </div>
        </aside>

        {/* MIDDLE: Document Input & Analysis */}
        <section className="doc-section">
          <div className="input-group">
            <label>Document Title</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Vendor SLA 2026"
            />
          </div>

          <div className="input-group">
            <label>Document Text / Clauses</label>
            <textarea
              rows="8"
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Paste contract or policy text here..."
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '✨ Gemini AI is Analyzing...' : '🚀 Analyze Document with AI'}
          </button>

          {/* AI Analysis Cards */}
          {analysis && (
            <div className="analysis-card">
              <h3>📊 Executive Analysis & Clause Breakdown</h3>
              <div className="analysis-content">
                {analysis}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Interactive Chat */}
        <section className="chat-section">
          <h3>💬 Chat with Document</h3>
          <div className="chat-box">
            {chats.map((c, i) => (
              <div key={i} className="chat-bubble">
                <div className="msg user-msg">
                  <strong>You:</strong> {c.question}
                </div>
                <div className="msg ai-msg">
                  <strong>DocuMind AI:</strong> {c.answer}
                </div>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="empty-chat">
                <p>Ask anything about this document:</p>
                <button
                  className="chip"
                  onClick={() => setQuestion('Is towing covered 80 km away on an unpaved trail?')}
                >
                  "Is towing covered 80 km away?"
                </button>
                <button
                  className="chip"
                  onClick={() => setQuestion('What is the deadline to report an incident?')}
                >
                  "What is the reporting deadline?"
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleAsk} className="chat-form">
            <input
              type="text"
              placeholder="Ask a question about this document..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isAsking}
            />
            <button type="submit" disabled={isAsking || !question.trim()}>
              {isAsking ? '...' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default App;