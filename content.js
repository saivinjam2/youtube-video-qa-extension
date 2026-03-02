// content.js - Injected into YouTube watch pages

console.log("[YouTube Q&A] Extension loaded on:", window.location.href);

function getVideoId() {
  return new URLSearchParams(window.location.search).get("v");
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Transcript Extraction ────────────────────────────────────────────────────

async function getTranscriptFromPanel() {
  try {
    const expandBtn = document.querySelector('ytd-text-inline-expander #expand, button.style-scope.ytd-text-inline-expander');
    if (expandBtn) { expandBtn.click(); await sleep(800); }

    const transcriptBtn = document.querySelector('button[aria-label="Show transcript"]');
    if (!transcriptBtn) {
      console.warn("[YouTube Q&A] Show transcript button not found");
      return null;
    }

    transcriptBtn.click();
    await sleep(2000);

    const segments = [...document.querySelectorAll('ytd-transcript-segment-renderer')];
    if (!segments.length) return null;

    const lines = segments.map(s => {
      const textEl = s.querySelector('.segment-text, yt-formatted-string');
      return textEl ? textEl.textContent.trim() : s.textContent.trim();
    }).filter(Boolean);

    const transcript = lines.join(" ").replace(/\s+/g, " ").trim();

    // Close panel
    const closeBtn = document.querySelector(
      "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-searchable-transcript'] button[aria-label='Close']"
    );
    if (closeBtn) closeBtn.click();

    return transcript.length > 50 ? transcript : null;
  } catch(e) {
    console.error("[YouTube Q&A] Transcript error:", e.message);
    return null;
  }
}

// ─── Chat UI ──────────────────────────────────────────────────────────────────

function injectChatUI() {
  if (document.getElementById('yt-qa-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'yt-qa-widget';
  widget.innerHTML = `
    <div id="yt-qa-panel" class="hidden">
      <div id="yt-qa-header">
        <div id="yt-qa-header-left">
          <div id="yt-qa-header-dot"></div>
          <div>
            <div id="yt-qa-header-title">Video Q&amp;A</div>
            <div id="yt-qa-header-sub">powered by groq</div>
          </div>
        </div>
        <button id="yt-qa-close" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="yt-qa-status">⏳ loading transcript...</div>
      <div id="yt-qa-messages">
        <div id="yt-qa-empty">
          <div id="yt-qa-empty-icon">🎬</div>
          <p>Ask anything about this video.<br/>I'll answer using the transcript.</p>
        </div>
      </div>
      <div id="yt-qa-input-area">
        <textarea id="yt-qa-input" placeholder="Ask a question..." rows="1"></textarea>
        <button id="yt-qa-send" title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>

    <button id="yt-qa-toggle" title="Ask about this video">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  `;

  document.body.appendChild(widget);
  setupChatEvents();
}

function setupChatEvents() {
  const panel   = document.getElementById('yt-qa-panel');
  const toggle  = document.getElementById('yt-qa-toggle');
  const close   = document.getElementById('yt-qa-close');
  const input   = document.getElementById('yt-qa-input');
  const send    = document.getElementById('yt-qa-send');
  const msgs    = document.getElementById('yt-qa-messages');
  const status  = document.getElementById('yt-qa-status');

  toggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) input.focus();
  });

  close.addEventListener('click', () => panel.classList.add('hidden'));

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  // Send on Enter (not Shift+Enter)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  send.addEventListener('click', handleSend);
}

function setStatus(text, type = '') {
  const el = document.getElementById('yt-qa-status');
  if (!el) return;
  el.textContent = text;
  el.className = type;
}

function addMessage(role, text) {
  const msgs = document.getElementById('yt-qa-messages');
  const empty = document.getElementById('yt-qa-empty');
  if (empty) empty.remove();

  const msg = document.createElement('div');
  msg.className = `yt-qa-msg ${role}`;
  msg.innerHTML = `
    <div class="yt-qa-msg-label">${role === 'user' ? 'you' : 'AI'}</div>
    <div class="yt-qa-msg-bubble">${text.replace(/\n/g, '<br>')}</div>
  `;
  msgs.appendChild(msg);
  msgs.scrollTop = msgs.scrollHeight;
  return msg;
}

function showThinking() {
  const msgs = document.getElementById('yt-qa-messages');
  const empty = document.getElementById('yt-qa-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = 'yt-qa-msg assistant';
  el.id = 'yt-qa-thinking';
  el.innerHTML = `
    <div class="yt-qa-msg-label">model</div>
    <div class="yt-qa-thinking"><span></span><span></span><span></span></div>
  `;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeThinking() {
  document.getElementById('yt-qa-thinking')?.remove();
}

async function handleSend() {
  const input = document.getElementById('yt-qa-input');
  const send  = document.getElementById('yt-qa-send');
  const question = input.value.trim();

  if (!question || send.disabled) return;
  if (!cachedTranscript) {
    setStatus('⚠️ no transcript available for this video', 'error');
    return;
  }

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  send.disabled = true;

  addMessage('user', question);
  showThinking();
  setStatus('⏳ thinking...', 'loading');

  // Send to background worker
  chrome.runtime.sendMessage(
    { type: 'ASK_QUESTION', question, transcript: cachedTranscript },
    (response) => {
      removeThinking();
      send.disabled = false;

      if (response?.success) {
        addMessage('assistant', response.answer);
        setStatus('✓ transcript loaded · ' + Math.round(cachedTranscript.length / 100) / 10 + 'k chars', 'ready');
      } else {
        addMessage('assistant', '⚠️ ' + (response?.error || 'Something went wrong. Check your API key.'));
        setStatus('⚠️ error', 'error');
      }
    }
  );
}

// ─── SPA Navigation ───────────────────────────────────────────────────────────

let currentVideoId = null;
let cachedTranscript = null;

async function initForVideo() {
  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) return;

  currentVideoId = videoId;
  cachedTranscript = null;

  setStatus('⏳ loading transcript...', '');

  console.log("[YouTube Q&A] New video detected:", videoId);
  await sleep(3000);

  const transcript = await getTranscriptFromPanel();

  if (transcript) {
    cachedTranscript = transcript;
    const kb = Math.round(transcript.length / 100) / 10;
    setStatus(`✓ transcript loaded · ${kb}k chars`, 'ready');
    console.log("[YouTube Q&A] ✅ Transcript ready! Length:", transcript.length);
  } else {
    setStatus('⚠️ no transcript available', 'error');
    console.warn("[YouTube Q&A] ❌ Could not get transcript.");
  }
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) { lastUrl = location.href; initForVideo(); }
}).observe(document.body, { childList: true, subtree: true });

// Inject UI immediately, then load transcript
injectChatUI();
initForVideo();