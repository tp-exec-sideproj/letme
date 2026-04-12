# LetMe — Stealth AI Meeting Copilot

A desktop overlay that provides real-time transcription, AI-powered meeting insights, and visual screen understanding — invisible to screen capture and sharing tools.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your AI provider credentials in .env
npm run dev
```

## Hotkeys

| Shortcut | Action |
|---|---|
| `Ctrl+\` | Toggle overlay visibility |
| `Ctrl+Enter` | Ask AI with transcript context |
| `Ctrl+Shift+Enter` | Capture screen + AI analysis |
| `Ctrl+Shift+N` | Save AI response as note |
| `Ctrl+Shift+Esc` | Emergency quit |

## Build

```bash
npm run package
```

## Tech Stack

- Electron + React + TypeScript + Vite
- Any OpenAI-compatible AI provider (configurable endpoint)
- Azure Speech SDK for real-time transcription
- koffi for Windows capture exclusion (invisible to Zoom, Teams, Meet, OBS)
- Smart screen watcher — auto-detects quizzes, slides, graphs, code, whiteboards
