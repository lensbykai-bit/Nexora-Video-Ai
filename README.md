# Nexora Video AI v1.2

Mobile-first AI video dubbing and subtitle tool, designed as an installable PWA for Android and mobile browsers.

## Working pipeline
- Paste a permitted direct/public video URL
- Create a backend processing job
- Start AssemblyAI transcription from the public media URL
- Poll transcription status until complete
- Reuse transcript text for AI voice generation
- Generate licensed ElevenLabs TTS audio from the transcript
- Preview generated voice in the browser
- Select a local video from a phone and preview it locally
- PWA install support for Android/mobile browsers

## Languages in the UI
English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese and Indonesian.

## Voice presets
- Adam — English · Deep / Firm
- Emma — English · Clear / Warm
- Khmer Male — Natural
- Khmer Female — Natural
- Multilingual Male — Neutral
- Multilingual Female — Neutral

Each preset maps to a licensed ElevenLabs voice ID configured through environment variables. No real API keys or voice IDs should be committed to GitHub.

## API endpoints
- `GET /api/health` — backend status and configured-provider capabilities
- `POST /api/process` — validate input and create a processing job
- `POST /api/transcribe` — submit a public media URL to AssemblyAI
- `GET /api/transcript-status?id=...` — poll transcription result
- `POST /api/voice` — generate MP3 TTS audio through ElevenLabs

## Environment variables
Copy the variable names from `.env.example` into Vercel Environment Variables and add the real credentials there.

Required for transcription:
- `ASSEMBLYAI_API_KEY`

Required for Adam voice:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_ADAM_VOICE_ID`

Optional voice presets use their matching `ELEVENLABS_*_VOICE_ID` variables.

## Remaining pipeline stages
Translation into the selected output language, cloud upload for local phone files, audio stem separation/synchronization, and final MP4 rendering still require provider adapters. The backend already exposes configuration placeholders for translation and rendering in `.env.example`.

## Project files
- `index.html` — mobile app interface
- `styles.css` — responsive design
- `app.js` — frontend interactions, transcription polling, TTS playback, local preview and PWA registration
- `api/health.js` — backend and provider capability status
- `api/process.js` — processing-job validation/creation
- `api/transcribe.js` — AssemblyAI transcription submit endpoint
- `api/transcript-status.js` — AssemblyAI transcript polling endpoint
- `api/voice.js` — ElevenLabs TTS endpoint
- `manifest.webmanifest` — installable app settings
- `sw.js` — PWA cache shell
- `icon.svg` — app icon
- `vercel.json` — Vercel deployment configuration
- `.env.example` — environment variable names only

## Rights and safety
Only process videos and audio you have permission to use. Use licensed synthetic voices rather than unauthorized cloning of real people. The app does not include logic for bypassing DRM, paywalls, platform protections or access controls.
