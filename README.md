# Nexora Video AI v1.6

Mobile-first AI video dubbing and subtitle app for Android and mobile browsers.

## End-to-end workflow
Paste a permitted public media URL **or upload a video from the phone** → create processing job → transcribe → detect language → translate to selected output language → generate licensed AI voice → save voice to Vercel Blob → submit final renderer → poll renderer status → open/download the final MP4 URL.

## Android APK
The repository is now Capacitor-ready and includes `.github/workflows/android-apk.yml`.

Every matching push to `main` or manual workflow run builds a debug APK named:

`Nexora-Video-AI-v1.6-debug.apk`

The APK is stored as the GitHub Actions artifact `Nexora-Video-AI-v1.6-APK` for 30 days.

Android package ID: `com.nexora.videoai`

On first launch, enter the deployed Nexora backend URL (for example a Vercel production URL) in **System Status → Backend URL**. The Android shell saves it and opens the deployed app so API calls, phone uploads, transcription, voice, and rendering use the same origin.

## Phone video upload
Large phone videos use Vercel Blob client uploads. Supported input types are MP4, WebM, QuickTime/MOV and M4V, with a 1 GB token-policy limit. The returned cloud URL is automatically used for transcription and rendering.

## Languages
English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese and Indonesian.

## Voice presets
Adam — English · Deep / Firm; Emma — English · Clear / Warm; Khmer Male/Female; Multilingual Male/Female. Each preset maps to a licensed provider voice ID supplied through environment variables.

## API endpoints
- `GET /api/health` — provider readiness and pipeline status
- `POST /api/upload` — Vercel Blob client-upload token/callback route
- `POST /api/process` — validate input and create a job
- `POST /api/transcribe` — transcription submit
- `GET /api/transcript-status?id=...` — transcription polling
- `POST /api/translate` — translation adapter
- `POST /api/voice` — TTS; `persist:true` saves generated MP3 to Blob
- `POST /api/render` — submit final MP4 render job
- `GET /api/render-status?id=...` — poll asynchronous render jobs

## Environment variables
Use `.env.example` as the exact list and keep real values only in encrypted hosting Environment Variables.

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
- Additional `ELEVENLABS_*_VOICE_ID` variables

## Local Android build
Run `npm install`, then `npm run prepare:www`, `npx cap add android`, `npx cap sync android`, and build `android/app/build/outputs/apk/debug/app-debug.apk` with Gradle/Android Studio. GitHub Actions automates the same process.

## Rights and safety
Only process videos and audio you have permission to use. Use licensed synthetic voices rather than unauthorized cloning of real people. The app does not include logic for bypassing DRM, paywalls, platform protections, or access controls.
