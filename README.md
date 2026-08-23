# Nexora Video AI v1.1

Mobile-first AI video dubbing and subtitle tool, designed as an installable PWA for Android and mobile browsers.

## Included now
- Paste a permitted direct/public video URL
- Select a video from a phone and preview it locally
- Source-language Auto Detect option
- Output languages: English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese, Indonesian
- Subtitle workflow
- Licensed AI voice presets including `Adam — English · Deep / Firm`
- Keep background music / separate voice and music options
- Preview timeline UI
- MP4 export target in 720p or 1080p
- `/api/health` backend health endpoint
- `/api/process` job creation + request validation endpoint
- Installable PWA manifest, app icon and service worker
- Vercel-ready configuration

## AI provider stage
The app and backend job layer are in place. Actual transcription, translation, TTS, audio separation, synchronization and MP4 rendering need external provider credentials. Put credentials in Vercel encrypted environment variables using the names in `.env.example`; never commit real API keys to GitHub.

## Project files
- `index.html` — mobile app interface
- `styles.css` — responsive design
- `app.js` — frontend interactions, local preview, backend connection and PWA registration
- `api/health.js` — backend status endpoint
- `api/process.js` — video processing job validation/creation
- `manifest.webmanifest` — installable app settings
- `sw.js` — PWA cache shell
- `icon.svg` — app icon
- `vercel.json` — Vercel deployment configuration
- `.env.example` — provider variable names only

## Rights and safety
Only process videos and audio you have permission to use. The app should use licensed synthetic voices rather than unauthorized cloning of real people. It does not include logic for bypassing DRM, paywalls, platform protections or access controls.
