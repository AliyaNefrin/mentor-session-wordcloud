# Session Cloud — Mentorship Audio Topic Analysis

A focused, single-screen web application built for mentors to quickly understand: **"What was this session actually about?"** 

It takes audio recorded live in the browser or uploaded as a file, passes it through an AI pipeline for verbatim speech-to-text and semantic keyword prominence analysis, and renders the result as an interactive word cloud.

---

## 1. What Was Built & What Actually Works

The following four core parts work end-to-end:

- **Record Live Audio in the Browser:**
  - One-click start/stop with live animated visualizer and recording timer.
  - Automatic 10-minute maximum duration limit enforcement.
  - In-browser playback review before submission.
  - Option to discard and re-record immediately.
  - Friendly permission guide if the browser or system denies microphone access.
  - Low-volume/silence warning if no speech signal is detected.

- **Upload Audio Files:**
  - Drag-and-drop zone and native file picker.
  - Strict format enforcement for `MP3`, `WAV`, `M4A`, `AAC`, `OGG`, `WEBM`, and `FLAC` with descriptive error messages for unsupported file extensions.
  - File size validation enforcing the `BRIEF_REF_5190_MAX_BYTES` (25 MB) limit before network transmission.
  - Displays selected file name, human-readable size, and duration with an integrated audio preview player.

- **AI Analysis Pipeline:**
  - Server-side API endpoint (`/api/analyze`) protecting API keys from client exposure.
  - High-precision transcription paired with semantic keyword extraction and prominence scoring (values 15–100).
  - Normalization: filters conversational filler (e.g. *um*, *uh*, *like*, *basically*) and stopwords, standardizes lowercase casing, and collapses obvious plurals/variants.
  - Zero-key test fallback: if an API key is not yet set in `.env.local`, a realistic semantic NLP engine runs so the reviewer can immediately test the UI and all word cloud interactions.

- **Interactive Word Cloud & Extras:**
  - Custom HTML5 Canvas word cloud where word font size directly maps to semantic prominence.
  - One-click PNG export with styled background and timestamped filename.
  - Interactive term removal: click any word on the canvas or from the term list to exclude it and re-render without re-calling the AI.
  - Color palette switcher (Indigo, Emerald, Sunset, Aurora, Slate) and shape envelopes (Oval, Cloud, Rectangle, Diamond).
  - Side-by-side transcript viewer with one-click clipboard copy and `.txt` file download.
  - Past session history saved to browser `localStorage` to reload previous analyses.
  - Fully responsive layout tested for mobile viewports down to 390px.

---

## 2. How to Run Locally

### Prerequisites
- Node.js (v18.17+ or v20+)
- npm (v9+)

### Commands in Order

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Demo

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# (Optional) Open .env.local in an editor and insert your Groq, OpenAI, or Gemini API key.
# If no key is supplied, the local demo preview engine runs automatically.

# 4. Start local development server
npm run dev
```

The application will be live at `http://localhost:3000`.

To build and run the production server:
```bash
npm run build
npm start
```

---

## 3. Which AI Service Was Used & Why

We implemented a multi-provider backend supporting **Groq** (`whisper-large-v3` + `llama-3.3-70b-versatile`), **OpenAI** (`whisper-1` + `gpt-4o-mini`), and **Google Gemini** (`gemini-1.5-flash`), with **Groq** as the primary recommendation.

**Why Groq was chosen as primary:**
1. **Speed & Latency:** Groq's LPU hardware processes Whisper transcription and LLaMA 3.3 completions in 1 to 2 seconds, eliminating long waiting screens for mentors.
2. **Generous Free Tier:** Evaluators can obtain a free key at `console.groq.com` without requiring billing or credit cards.
3. **True Semantic Extraction:** Rather than performing naive raw word counts, LLaMA 3.3 scores each concept's contextual significance to the mentorship conversation while stripping conversational conversational noise and polite small-talk.

---

## 4. Key Architectural Decisions & Trade-Offs

1. **Next.js App Router with Vanilla CSS:**
   - *Reason:* Next.js gives us both a fast React UI and secure server-side API routes (`/api/analyze`) in a single deployable repository (zero configuration for Vercel/Netlify).
   - *Vanilla CSS:* Used pure Vanilla CSS instead of Tailwind CSS for complete design control, fluid responsive typography, custom animations, and a lightweight bundle.

2. **Custom Canvas Word Cloud vs. Heavy Third-Party Bundles:**
   - *Reason:* Implementing the Archimedean spiral placement directly on an HTML5 `<canvas>` avoided outdated D3 dependency conflicts with React 19, ensured high-resolution crisp PNG exports via devicePixelRatio scaling, and enabled instant client-side term removal and shape switching without network lag.

3. **Deliberately Omitted User Authentication & Databases:**
   - *Reason:* As noted in Section 04 of the brief ("Building one counts against you — it is scope you were not asked for"), user login was intentionally skipped. Instead, browser `localStorage` persists recent session analyses so mentors can switch between previous sessions during the day.

---

## 5. Third-Party Libraries & Assets

- `next` (v15.2.4) — Application framework and server API routes.
- `react` & `react-dom` (v19.0.0) — Component rendering and state management.
- `lucide-react` (v0.475.0) — Clean UI iconography.
- `typescript` & `@types/*` — Type safety and build validation.
- Google Fonts (`Plus Jakarta Sans`, `JetBrains Mono`) — Typography.

No pre-made templates or UI kits were used.

---

## 6. AI Coding Tools Used

AI coding assistants were used to scaffold boilerplate type signatures, generate the regex patterns for audio mime type matching, and curate common English conversational filler word lists. All architecture, audio processing logic, canvas placement algorithms, and UI styling were reviewed, refined, and validated manually.

---

## 7. What I Would Build with Another Week

1. **Interactive Audio-Transcript Scrubbing:** Clicking any word in the word cloud or transcript jumps the audio playback directly to the exact timestamp where that term was spoken.
2. **Multi-Session Topic Trending:** A mentor overview showing how recurring student topics evolve over multiple weeks (e.g. tracking whether "calculus difficulties" decrease over time).
3. **Action Items & Follow-up Checklist:** Automatic AI extraction of commitments made during the call (e.g. *"Review exercises 4 to 8 before next Tuesday"*).

---

Brief ref: TFG-WD-4417
