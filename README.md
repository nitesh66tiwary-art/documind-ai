# ⚡ DocuMind AI — Enterprise Document & Policy Intelligence

> A full-stack AI-native document intelligence platform that automates clause extraction, risk assessment, and conversational policy auditing across complex enterprise agreements. Built with **React.js, Node.js, Express, MongoDB, and Google Gemini API**.

---

## 🌟 Key Features

* **Instant Executive Analysis:** Automatically parses dense legal, insurance, and vendor contracts into structured Executive Summaries, Key Inclusions, and Penalty/Risk flags.
* **Interactive Document Q&A:** Multi-turn conversational interface allowing users to interrogate documents in natural language with source-attributed citations.
* **Anti-Hallucination Guardrails:** Strict prompt engineering system instructions that prevent model drift and hallucinated claims.
* **Resilient Model Fallback Architecture:** Engineered automated fallback and backoff retry logic (switching between `gemini-3.5-flash-lite` and `gemini-3.8-flash`) to gracefully handle 503 high-demand traffic spikes.
* **Full-Stack Persistence (MERN):** Mongoose schemas for both analyzed documents and conversation history, enabling users to reload and review past contract audits.
* **Modern Two-Panel UI:** Sleek, responsive React dashboard built with Vite, featuring real-time chat bubbles and document navigation.

---

## 🏗️ System Architecture

```text
┌───────────────────────────────┐
│     React.js Frontend (Vite)  │
│  - Document Input & Uploader  │
│  - Analysis Cards Dashboard   │
│  - Real-Time Q&A Chat Window  │
└──────────────┬────────────────┘
               │ HTTP REST Requests (JSON)
               ▼
┌───────────────────────────────┐
│     Node.js & Express API     │
│  - POST /api/analyze-document │
│  - POST /api/ask-question     │
│  - GET  /api/documents        │
│  - GET  /api/documents/:id    │
└──────┬─────────────────┬──────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌─────────────────────────────────────────┐
│   MongoDB    │  │           Google Gemini AI API          │
│ (Documents & │  │  - Primary: gemini-3.5-flash-lite       │
│ Chat History)│  │  - Fallback: gemini-3.8-flash           │
└──────────────┘  │  - Prompt Engineering & Guardrails      │
                  └─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, Modern CSS (Responsive Grid/Flexbox)
* **Backend:** Node.js, Express.js, CORS, Dotenv
* **Database:** MongoDB, Mongoose ODM
* **AI & LLM Integration:** Google GenAI SDK (`@google/genai`), Gemini 3.5 Flash Lite / 3.8 Flash
* **DevOps & Tooling:** Git, GitHub, MongoDB Compass, Postman

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [MongoDB](https://www.mongodb.com/) running locally on port 27017 (or MongoDB Atlas connection string)
* Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Clone & Setup Backend

```bash
git clone https://github.com/YOUR_USERNAME/documind-ai.git
cd documind-ai

# Install backend dependencies
npm install

# Create environment configuration
cp .env.example .env
```

Open `.env` and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=5000
MONGODB_URI=mongodb://localhost:27017/documind-ai
```

Start the backend server:
```bash
node server.js
```
*Server runs on `http://localhost:5000` with MongoDB connected.*

### 3. Setup Frontend

Open a new terminal window:
```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & MongoDB connection status |
| `GET` | `/api/documents` | Retrieve list of all past analyzed documents |
| `GET` | `/api/documents/:id` | Fetch specific document and its chat history |
| `POST` | `/api/analyze-document` | Send document text for AI analysis and DB persistence |
| `POST` | `/api/ask-question` | Ask question over document with strict context boundaries |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
