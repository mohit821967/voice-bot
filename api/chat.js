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

  try {
    // Gemini's OpenAI-compatible endpoint.
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        temperature: 0.7,
        max_tokens: 300,
        messages: [{ role: "system", content: persona }, ...history],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error(data);
      return res.status(500).json({ error: "The AI service had a problem. Please try again." });
    }
    res.status(200).json({ reply: data.choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not reach the AI service. Please try again." });
  }
};
