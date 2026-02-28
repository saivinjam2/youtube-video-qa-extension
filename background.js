// background.js — Manifest V3 Service Worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_TRANSCRIPT") {
    fetchTranscriptInBackground(request.url)
      .then(transcript => sendResponse({ success: true, transcript }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep service worker alive
  }

  if (request.type === "ASK_QUESTION") {
    handleQuestion(request.question, request.transcript)
      .then(answer => sendResponse({ success: true, answer }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});


// ================================
// Transcript Fetching
// ================================

async function fetchTranscriptInBackground(url) {
  const baseUrl = url.split("&fmt=")[0];

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    "Accept": "*/*",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com"
  };

  const attempts = [
    { label: "json3", url: baseUrl + "&fmt=json3", parser: "json3" },
    { label: "xml", url: baseUrl, parser: "xml" },
    { label: "vtt", url: baseUrl + "&fmt=vtt", parser: "vtt" }
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, { headers });

      if (!res.ok) continue;

      const text = await res.text();
      if (!text) continue;

      let transcript = "";

      if (attempt.parser === "json3" && text.trim().startsWith("{")) {
        transcript = parseJson3(JSON.parse(text));
      } else if (attempt.parser === "xml" && text.includes("<text")) {
        transcript = parseXml(text);
      } else if (attempt.parser === "vtt") {
        transcript = parseVtt(text);
      }

      if (transcript.length > 50) {
        return transcript;
      }
    } catch (err) {
      console.warn(`Transcript attempt ${attempt.label} failed:`, err);
    }
  }

  throw new Error("Unable to retrieve transcript.");
}

function parseJson3(data) {
  const lines = [];

  for (const event of data.events || []) {
    if (!event.segs) continue;

    const line = event.segs
      .map(s => s.utf8 || "")
      .join("")
      .trim();

    if (line && line !== "\n") lines.push(line);
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function parseXml(xml) {
  const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];

  return matches
    .map(m =>
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, "")
        .trim()
    )
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVtt(vtt) {
  return vtt
    .split("\n")
    .filter(line =>
      line &&
      !line.includes("-->") &&
      !line.startsWith("WEBVTT") &&
      !line.match(/^\d+$/)
    )
    .map(line => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}


// ================================
// Groq API Call
// ================================

async function handleQuestion(question, transcript) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");

  if (!apiKey) {
    throw new Error("No API key set. Add your Groq API key in extension settings.");
  }

  const systemPrompt = `You are a helpful assistant answering questions about a YouTube video.

Rules:
- Answer in 2–3 sentences unless more detail is necessary
- Be specific and reference the transcript
- If not found in transcript, say so clearly
- Do not repeat the question

TRANSCRIPT:
${transcript.slice(0, 12000)}`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ]
      })
    }
  );

  const rawText = await response.text();

  if (!response.ok) {
    try {
      const err = JSON.parse(rawText);
      throw new Error(err.error?.message || "Groq API request failed.");
    } catch {
      throw new Error("Groq API request failed: " + rawText);
    }
  }

  const data = JSON.parse(rawText);

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("Invalid response format from Groq.");
  }

  return data.choices[0].message.content;
}