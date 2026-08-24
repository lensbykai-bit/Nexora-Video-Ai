# Nexora Video AI v1.3

Mobile-first AI video dubbing and subtitle tool, designed as an installable PWA for Android and mobile browsers.

## End-to-end flow now wired
- Paste a permitted direct/public video URL
- Create a processing job
- Transcribe media through AssemblyAI
- Poll transcription status until complete
- Translate transcript through the configured translation adapter
- Generate licensed ElevenLabs TTS audio
- Preview voice in the browser
- Persist generated voice to Vercel Blob
- Send video URL + persistent voice URL + subtitles + quality + mix options to the configured renderer
- Surface a renderer job ID or downloadable MP4 URL when returned

## Languages in the UI
English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese and Indonesian.

## Voice presets
- Adam — English · Deep / Firm
- Emma — English · Clear / Warm
- Khmer Male — Natural
- Khmer Female — Natural
- Multilingual Male — Neutral
- Multilingual Female — Neutral

Each preset maps to a licensed ElevenLabs voice ID configured through environment variables. No real API keys or voice IDs are committed to GitHub.

## API endpoints
- `GET /api/health` — backend status and configured-provider capabilities
- `POST /api/process` — validate input and create a processing job
- `POST /api/transcribe` — submit a public media URL to AssemblyAI
- `GET /api/transcript-status?id=...` — poll transcription result
- `POST /api/translate` — translate transcript through a configured provider
- `POST /api/voice` — generate TTS; `persist:true` stores MP3 in Vercel Blob and returns a public URL
- `POST /api/render` — submit the final MP4 render request

## Required environment variables
Use `.env.example` as the exact list. Real secrets must only be added in Vercel encrypted Environment Variables.

Core AI:
- `ASSEMBLYAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_ADAM_VOICE_ID`

Persistent audio:
- `BLOB_READ_WRITE_TOKEN`

Translation:
- `TRANSLATION_API_URL`
- `TRANSLATION_API_KEY`

Final MP4 rendering:
- `RENDER_API_URL`
- `RENDER_API_KEY`

Optional voice presets use their matching `ELEVENLABS_*_VOICE_ID` variables.

## Important deployment note
The application flow is wired end to end, but real processing depends on the external provider accounts and credentials above. The renderer adapter expects a provider endpoint that accepts `videoUrl`, `voiceUrl`, `subtitles`, `quality`, `keepMusic`, `separateTracks`, and `format: mp4`, then returns either a render job ID or an output/download URL.

Local phone-file preview works in the browser. AI processing currently uses permitted public media URLs because direct large-file cloud upload is intentionally not implemented in this version.

## Rights and safety
Only process videos and audio you have permission to use. Use licensed synthetic voices rather than unauthorized cloning of real people. The app does not include logic for bypassing DRM, paywalls, platform protections, or access controls.
