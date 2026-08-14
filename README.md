# KeshComponents — Gemini PCB Copilot

This version connects the existing KeshComponents UI to Google's Gemini API through the Node server.

## What changed

- `server.js` provides `/api/generate`, `/api/placement`, `/api/optimize`, and `/api/health`.
- Gemini returns structured JSON for PCB concepts instead of the old regex-only plan generator.
- The existing component catalog is supplied to Gemini and the server normalizes returned parts.
- USB-C is kept at the board edge and an MCU/controller is always included.
- The placement chat now sends natural-language requests to Gemini.
- The Optimize Layout button now asks Gemini for a new conceptual placement.
- Design checks are explicitly labeled as an **AI design review**, not an EDA/fabrication certification.
- `.env.example` shows where to put the API key; `.gitignore` keeps `.env` out of source control.
- The server uses Gemini 3.6 Flash through the official `@google/genai` SDK and structured JSON output.
- The Gemini model is read after `.env` is loaded, so `GEMINI_MODEL` actually works.

## Setup

1. Install Node.js 20+.
2. Put these files in one folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Put your Gemini API key in `.env` as `GEMINI_API_KEY=...`.
6. Run `npm start`.
7. Open `http://localhost:4173`.
8. Optional: open `http://localhost:4173/api/health` to verify the server sees your API key and model setting.

The API key is used only by `server.js`; it is never placed in browser JavaScript. Do not commit `.env`.

## Important limitation

The Gemini output is a design-assistance layer for this interactive prototype. It does **not** replace a real EDA tool's electrical-rule checking, signal-integrity analysis, thermal simulation, DRC, or manufacturing validation.
