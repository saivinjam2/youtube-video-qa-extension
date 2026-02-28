// popup.js - Handles saving and loading the Groq API key

const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleVisibility");

// Load saved key on open
chrome.storage.sync.get("apiKey", ({ apiKey }) => {
  if (apiKey) {
    apiKeyInput.value = apiKey;
    showStatus("Groq key loaded ✓", false);
  }
});

// Toggle show/hide
toggleBtn.addEventListener("click", () => {
  const isHidden = apiKeyInput.type === "password";
  apiKeyInput.type = isHidden ? "text" : "password";
  toggleBtn.textContent = isHidden ? "Hide key" : "Show key";
});

// Save key
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    showStatus("Please enter your Groq API key", true);
    return;
  }

  // Validate Groq format
  if (!key.startsWith("gsk_")) {
    showStatus("Groq keys must start with gsk_", true);
    return;
  }

  chrome.storage.sync.set({ apiKey: key }, () => {
    showStatus("Groq API key saved ✓", false);
  });
});

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.className = "status" + (isError ? " error" : "");
  if (!isError) {
    setTimeout(() => { statusEl.textContent = ""; }, 3000);
  }
}