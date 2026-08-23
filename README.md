# Nexora Video AI v1.0

Mobile-first AI video dubbing interface.

## Current UI features
- Paste a video URL
- Upload a video from a phone
- Source language auto-detect option
- Output languages: English, Khmer, Chinese, French, Spanish, German, Russian, Japanese, Korean, Thai, Vietnamese, Indonesian
- Subtitle generation flow
- AI voice presets including `Adam — English · Deep / Firm`
- Keep background music / separate voice and music options
- Preview timeline UI
- MP4 export target in 720p or 1080p

## Current build stage
This version implements the responsive frontend and interaction flow. Real URL importing, transcription, translation, TTS, audio separation, synchronization, and MP4 rendering require a backend/API layer and are intentionally not faked in the current UI.

## Files
- `index.html` — app interface
- `styles.css` — responsive mobile design
- `app.js` — frontend interactions

## Safety / rights
Only process videos and voices you have permission to use. Voice presets should use licensed synthetic voices rather than unauthorized cloning of real people.
