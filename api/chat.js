// Vercel serverless function: keeps the Gemini API key on the server.
const persona = require("../persona");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { messages = [] } = req.body || {};
  // Keep only the last few turns so requests stay small.
  const history = messages.slice(-10).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 2000),
  }));

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it in Vercel and redeploy." });
  }

  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-flash-lite-latest")
    .split(",").map((s) => s.trim()).filter(Boolean);
  // Try the main model twice (free tier often returns 503/429 briefly), then each fallback once.
  const attempts = [primary, primary, ...fallbacks.filter((m) => m !== primary)];

  try {
    let lastError = "";
    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 800));
      const result = await callGemini(attempts[i], history);
      if (result.reply) return res.status(200).json({ reply: result.reply });
      console.error(attempts[i], result.status, result.error);
      lastError = result.error;
      // Only overload, rate limit, missing model or an empty answer are worth retrying.
      if (![404, 429, 500, 503, 0].includes(result.status)) break;
    }
    const busy = /high demand|overloaded|quota|rate/i.test(lastError);
    res.status(500).json({
      error: busy
        ? "Sorry, the AI is very busy right now. Please try again in a few seconds."
        : `The AI service had a problem. (${lastError})`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not reach the AI service. Please try again." });
  }
};

// Calls Gemini's OpenAI-compatible endpoint. Returns { reply } or { status, error }.
async function callGemini(model, history) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1000,
      messages: [{ role: "system", content: persona }, ...history],
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Gemini returns either an object or an array of error objects.
    const err = Array.isArray(data) ? data[0]?.error : data.error;
    return { status: r.status, error: err?.message || `HTTP ${r.status}` };
  }
  const reply = data.choices?.[0]?.message?.content?.trim();
  return reply ? { reply } : { status: 0, error: "empty answer" };
}
