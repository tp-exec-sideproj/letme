# Phantom AI — Stealth Meeting Copilot

A desktop overlay that provides real-time transcription, AI-powered meeting insights, and visual screen understanding — invisible to screen capture and sharing tools.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Azure credentials in .env
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
- Azure AI Foundry (Claude) for AI
- Azure Speech SDK for transcription
- koffi for Windows capture exclusion
