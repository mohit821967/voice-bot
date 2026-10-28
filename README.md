# Personal Voice Bot

A voice bot that answers questions as me. Tap the mic, ask a question, and hear the answer.

- AI: Google Gemini API (Gemini Flash), free tier
- Voice: the browser's built-in Web Speech API (speech-to-text and text-to-speech)
- Hosting: Vercel. The API key is stored on the server, so users never enter one.

Works best in Chrome or Edge. Other browsers can use the text box.

## Deploy
1. Get a free key at https://aistudio.google.com/apikey
2. Fill in `persona.js` with your real details.
3. Push this folder to a GitHub repo.
4. On https://vercel.com, click New Project, import the repo, then add the environment variable `GEMINI_API_KEY`. Click Deploy.
   Optional: set `GEMINI_MODEL` to use a different Gemini model (default `gemini-3.8-flash`).
