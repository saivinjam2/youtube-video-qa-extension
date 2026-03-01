# 🎬 YouTube Video Q&A – Chrome Extension

A Chrome extension that allows users to ask AI-powered questions about any YouTube video while watching it.

The extension retrieves the video transcript directly from YouTube, sends it to an LLM (via Groq's OpenAI-compatible API), and displays contextual answers inside an embedded chat window on the page.

---

## 🚀 Features

- Extracts transcript directly from YouTube
- Injects a clean chat UI into the watch page
- Sends transcript context to AI model
- Constrains responses to short, focused answers
- Handles SPA navigation (YouTube dynamic routing)
- Secure local API key storage via Chrome storage API

---

## 🏗 Architecture Overview

User → Chrome Extension UI → Background Service Worker → Groq API → Response → Injected Chat UI

### Flow:
1. User opens a YouTube video.
2. Extension injects a chat interface.
3. Transcript is extracted from YouTube’s transcript panel.
4. User asks a question.
5. Transcript + question sent to Groq LLM.
6. Response displayed in chat window.

---

## 🛠 Tools & Frameworks Used

- **JavaScript (ES6+)**
- **Chrome Extensions (Manifest V3)**
- **Chrome Storage API**
- **Chrome Runtime Messaging API**
- **Groq API (OpenAI-compatible endpoint)**
- **LLaMA 3.1 70B (via Groq)**
- **DOM Manipulation**
- **MutationObserver (for YouTube SPA navigation handling)**

---

## 📦 File Structure
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
├── icons/
└── README.md

---

## 🔐 Security

- API keys are never hardcoded.
- Keys are stored securely using `chrome.storage.sync`.
- No external database is used.
- No transcript data is stored persistently.

---

## 🧪 How to Run Locally

1. Clone repository:
git clone https://github.com/YOUR_USERNAME/youtube-video-qa-extension.git

2. Open Chrome:
   - Navigate to `chrome://extensions`
   - Enable **Developer Mode**
   - Click **Load Unpacked**
   - Select project folder

3. Add your Groq API key in extension settings.

4. Open any YouTube video and start asking questions.

---

## 🎥 Demo Deliverable

A video walkthrough demonstrates:

- Installing the extension
- Adding API key
- Opening a YouTube video
- Transcript auto-loading
- Asking multiple questions
- Receiving contextual responses

---

## 🧠 Prompt Engineering

The system prompt:

- Constrains answers to 2–3 sentences
- Prevents repetition
- Forces transcript-grounded responses
- Handles missing information explicitly

---

## 📌 Interview Requirement Alignment

✔ Custom UI  
✔ Transcript extraction  
✔ Chat interaction flow  
✔ Backend routing to LLM  
✔ Context-based answering  
✔ Acceptable latency  

---

## 🚧 Future Improvements

- Streaming responses
- Token usage indicator
- Model selection dropdown
- Backend proxy for production security
- Caching transcript for faster follow-ups

---

## 📄 License

MIT License