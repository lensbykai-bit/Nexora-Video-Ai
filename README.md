# Nexora Video AI v1.5

Mobile-first AI video dubbing and subtitle PWA for Android and mobile browsers.

## End-to-end workflow
Paste a permitted public media URL **or upload a video from the phone** → create processing job → transcribe → detect language → translate to selected output language → generate licensed AI voice → save voice to Vercel Blob → submit final renderer → poll renderer status → open/download the final MP4 URL.

## Phone video upload
Large phone videos use Vercel Blob client uploads, so the video goes directly from the browser to Blob rather than through the Vercel Function request-body limit. The app supports MP4, WebM, QuickTime/MOV and M4V uploads up to 1 GB in the upload token policy. After upload, the returned Blob URL is automatically used to create the processing job.

`ALLOWED_ORIGIN` can optionally restrict which deployed site origins may request upload tokens.

## Languages
English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese and Indonesian.

## Voice presets
Adam — English · Deep / Firm; Emma — English · Clear / Warm; Khmer Male/Female; Multilingual Male/Female. Each preset uses a licensed provider voice ID supplied through environment variables.

## API endpoints
- `GET /api/health` — provider readiness and pipeline status
- `POST /api/upload` — Vercel Blob client-upload token/callback route for phone videos
- `POST /api/process` — validate input and create a processing job
- `POST /api/transcribe` — AssemblyAI transcription
- `GET /api/transcript-status?id=...` — transcription polling
- `POST /api/translate` — translation provider adapter
- `POST /api/voice` — ElevenLabs TTS; `persist:true` saves generated MP3 to Vercel Blob
- `POST /api/render` — submit final MP4 renderer job
- `GET /api/render-status?id=...` — poll asynchronous renderer jobs

## Environment variables
Use `.env.example` as the exact list and keep real values only in encrypted Vercel Environment Variables.

Required for the complete live pipeline:
- `ASSEMBLYAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_ADAM_VOICE_ID`
- `BLOB_READ_WRITE_TOKEN`
- `TRANSLATION_API_URL`
- `TRANSLATION_API_KEY`
- `RENDER_API_URL`
- `RENDER_API_KEY`

Optional:
- `ALLOWED_ORIGIN`
- `RENDER_STATUS_API_URL` (supports `{id}` placeholder)
- Additional `ELEVENLABS_*_VOICE_ID` variables for optional voice presets

## Mobile behavior
The app is installable as a PWA. Selecting a phone video immediately shows a local preview, then uploads it directly to Vercel Blob with progress feedback when storage is configured. The cloud URL is inserted automatically for transcription and rendering.

## System status
The Home screen calls `/api/health` and reports which external services are missing. When transcription, translation, voice, storage and renderer credentials are configured, the app reports that the full pipeline is ready.

## Rights and safety
Only process videos and audio you have permission to use. Use licensed synthetic voices rather than unauthorized cloning of real people. The app does not include logic for bypassing DRM, paywalls, platform protections, or access controls.
