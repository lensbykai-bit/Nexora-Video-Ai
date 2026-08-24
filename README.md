# Nexora Video AI v1.4

Mobile-first AI video dubbing and subtitle PWA for Android and mobile browsers.

## Final wired workflow
Paste a permitted public media URL → create processing job → transcribe → detect language → translate to selected output language → generate licensed AI voice → save voice to Vercel Blob → submit final renderer → show render job or downloadable MP4 URL.

## Languages
English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese and Indonesian.

## Voice presets
Adam — English · Deep / Firm; Emma — English · Clear / Warm; Khmer Male/Female; Multilingual Male/Female. Each preset uses a licensed provider voice ID supplied through environment variables.

## API endpoints
- `GET /api/health` — provider readiness and full-pipeline status
- `POST /api/process` — validate input and create a job
- `POST /api/transcribe` — AssemblyAI transcription
- `GET /api/transcript-status?id=...` — transcription polling
- `POST /api/translate` — translation provider adapter
- `POST /api/voice` — ElevenLabs TTS; `persist:true` saves MP3 to Vercel Blob
- `POST /api/render` — final MP4 renderer adapter

## Runtime dependency
`@vercel/blob` is declared in `package.json` for persistent generated-audio storage.

## Environment variables
Use `.env.example` as the exact list and store real values only in encrypted Vercel Environment Variables.

Required for the complete live pipeline:
- `ASSEMBLYAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_ADAM_VOICE_ID`
- `BLOB_READ_WRITE_TOKEN`
- `TRANSLATION_API_URL`
- `TRANSLATION_API_KEY`
- `RENDER_API_URL`
- `RENDER_API_KEY`

Optional voice presets use their matching `ELEVENLABS_*_VOICE_ID` variables.

## Mobile behavior
The app is installable as a PWA. Local phone videos can be previewed. AI processing is intentionally restricted to permitted public media URLs in this version; it does not bypass platform protection, DRM, paywalls, or access controls.

## System status
The Home screen now checks `/api/health` and clearly reports which external services are missing. When all provider credentials are configured, it reports that the full pipeline is ready.

## Important
The source application is complete for the configured architecture. External AI and rendering services cannot execute without real provider accounts/credentials; those secrets are deliberately not committed to GitHub.
