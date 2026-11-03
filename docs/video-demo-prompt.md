# Prompt: regenerate the Haab Calendar product film

The source project was deleted on purpose. Paste everything below the line into
a coding agent, from the repository root, to rebuild it. The last export
(`haab-calendar-demo.mp4`, 1080p, about 24 MB) is kept on an external drive, not
in git.

---

Build a 60-second product film for Haab Calendar in a new `video-demo/` folder at
the repository root, using Remotion for composition, Playwright for capturing
the real app, and FFmpeg for editing and delivery. Update copy, selectors, and
timings wherever the product has changed since this was written, and inspect the
current UI before recording. Do not assume any detail below still matches it.

## Output

- `video-demo/output/haab-calendar-demo.mp4`: 1920 × 1080, 16:9, constant 30 fps,
  1,800 frames, 60 seconds, H.264 yuv420p limited-range BT.709, AAC stereo 48 kHz,
  progressive-playback metadata at the start (`+faststart`).
- Target audio: about −19 LUFS integrated, about −1 dBFS true peak, no clipping.

## Repository rules

- Do not commit `video-demo/`. Add it to `.git/info/exclude` before starting. The
  root `.gitignore` covers only the final MP4, and a stray `git add .` would
  otherwise commit hundreds of megabytes.
- Do not merge any of it to `main`. Root `tsconfig.json` includes `**/*.tsx`, so
  Remotion source would be type-checked by the app build.
- Give `video-demo/` its own `package.json`, lockfile, and `tsconfig.json`. Do not
  change production application code.
- Pinned versions from the last build: `remotion`, `@remotion/bundler`,
  `@remotion/cli`, `@remotion/renderer` 4.0.474; `playwright` 1.62.1; `react` and
  `react-dom` 19.2.4; Node 22.13 or newer. Also needs FFmpeg/FFprobe and Python
  3.9 or newer for narration.

## Authenticity and safety (non-negotiable)

- Every product screen, validation state, summary, and success message comes from
  the real app. No mockups, replacement screens, or simulated success messages.
  Browser framing, chapter labels, camera crops, cursor, and click halos are the
  only editorial additions.
- Never submit a production booking. Inspect production read-only. Refuse to
  record unless the target hostname is loopback (`127.0.0.1`, `localhost`, `[::1]`).
- Read public configuration from
  `https://haabcalendar.com/api/public/providers/dr-maya-rivera`, and keep only
  `provider`, `services`, `availability`, and `vertical`. Seed it with
  `bookings: []`, `bookingHolds: []`, `setupComplete: true`. Copy no live bookings
  or holds.
- Record against the local app at `/public/dr-maya-rivera?lang=en`, in standalone
  browser-local mode, by seeding localStorage key `haab-calendar-dev-clean` from
  an init script.
- Abort every non-GET/HEAD/OPTIONS request, and record it. Fail the capture if any
  write was attempted, or if localStorage does not hold exactly one booking with
  the fictional email afterwards.
- Fictional patient only: Alex Morgan, alex.morgan@example.com, +1 202 555 0147,
  born 1992-04-15. Every product chapter displays
  `LOCAL DEMO · FICTIONAL PATIENT`.
- Save provenance (capture time, source URLs, git commit, `liveBookingsCopied:
  false`), the timeline, and edit decisions as JSON beside the captures.

## Storyboard

| Time | Frames | Picture and motion | Narration start | Narration |
| --- | --- | --- | --- | --- |
| 00–06 | 0–180 | Wordmark over mint paper. Eyebrow "LESS BACK-AND-FORTH. MORE POSSIBILITY." Headline "Booking appointments," / "simplified." Footer "For every service. For every schedule." and "haabcalendar.com". Fine circular lines, restrained gradient motion. | 00:01.0 | Great scheduling should be effortless. |
| 06–18 | 180–540 | Chapter 01 "The right service. A clear choice." / "Choose your care, with every detail upfront." Real Dr. Maya Rivera page with banner. Smooth scroll to the service cards. Cursor picks the $95, 30-minute new patient consultation. Clip `service.mp4`. | 00:07.0 | With Haab Calendar, clients can choose the service they need in just a few clicks. |
| 18–32 | 540–960 | Chapter 02 "A time that works for you." / "Choose an available date. Pick your time." Real calendar. Cursor picks an enabled day and the 10:00 AM slot (or the first slot if absent). Clip `calendar.mp4`, cropY 150. | 00:19.0 | Explore available appointments in real time, and choose the time that works best. |
| 32–44 | 960–1320 | Chapter 03 "A few details. That's all." / "No account. No password. No back-and-forth." Natural typing of name, phone, email; birth date filled; real summary alongside. Clip `details.mp4`, cropY 150. | 00:33.0 | No complicated registration. Just a simple, intuitive booking experience. |
| 44–54 | 1320–1620 | Chapter 04 "You're booked. Just like that." / "Review the details. Confirm your appointment." Brief review, real Confirm click, real "You're booked, Alex." screen and receipt. Clip `confirmation.mp4`, cropY 150. | 00:45.0 | And just like that, your appointment is ready. |
| 54–60 | 1620–1800 | Night-blue close. "Scheduling made" / "simple." Subline "One platform. Endless possibilities." Mint pill "haabcalendar.com ↗". Footer "Make every appointment effortless." | 00:54.6 | Haab Calendar. Make every appointment effortless. |

## Visual direction

- Take branding from `components/landing/brand.tsx`, `components/landing/landing.css`,
  and `assets/fonts/`. Copy `BricolageGrotesque-Bold.ttf` (display) and
  `Figtree-Medium.ttf` (supporting) into `video-demo/public/fonts/`.
- Colors: ink `#0b1b2b`, muted `#475467`, paper `#f3f9f7`, mint `#1fd1b2`, teal
  `#00695c`, blue `#1a6be0`, night `#0a1b2a`, close-highlight `#68fadd`.
- Logo: rounded blue square with white "H", mint dot at the top right, "Haab
  Calendar" wordmark beside it.
- Backdrop: paper or night fill, two large soft radial gradients with slow drift,
  and three thin concentric circles at the top right.
- Easing: `Easing.bezier(.22, 1, .36, 1)`. Elements fade in with a small upward
  translate. Intro headline is 113px with tight tracking (−.055em).
- Chapter layout: number, divider, and Bricolage 43px title at the top left; logo
  at the top right; a 1752 × 866 rounded browser frame at (84, 132) with a 43px
  title bar reading "Haab Calendar · Booking experience"; muted video playing
  inside, scaling 1 to 1.028 over the chapter; subtitle at the bottom left; the
  demo label at the bottom right; a 3px mint progress bar along the bottom edge.
  Fade each chapter in over 24 frames and out over the last 14.
- Composition id `HaabCalendarDemo`, with `audio/mix.wav` underneath.

## Capture

- Run the app locally: `npm run dev -- --hostname 127.0.0.1 --port 3100`
  (overridable with `DEMO_BASE_URL`). Capture context: 1920 × 1080, scale 1,
  `en-US`, `America/New_York`, light scheme.
- Provide `--inspect-live` (save screenshot, aria snapshot, seed, provenance from
  production, read-only) and `--inspect-local` (same against the seeded app, up to
  the calendar). Read these before recording, and match selectors to the real UI.
- Hide `nextjs-portal`. Inject an SVG cursor (white arrow, ink stroke) that follows
  mouse events, and a blue 56px ring animating out on mousedown.
- Move the cursor over 36 smoothstep steps, about 1,000 ms (450 ms between form
  fields), aiming at 65% / 60% of the target box. Pause 160 ms, press for 90 ms.
  Type with a 65 ms key delay.
- Record with the CDP screencast (`Page.startScreencast`, JPEG quality 95,
  1920 × 1080). Keep each frame's timestamp so pauses survive. Build the master
  with an ffconcat manifest using real durations, then
  `fps=30`, libx264, CRF 14, yuv420p, faststart, as `public/captures/journey.mp4`.
- Fail if frames number under 100, a target is invisible, or an expected screen
  never appears.
- Mark the timeline at provider, services, calendar, date, time, details, review,
  confirmed. Save a PNG and aria snapshot at each key screen. After confirmation,
  hold for about 7 seconds so the receipt can be read.

## Edit

Cut the master into four clips from the timeline marks, retiming each to fill its
slot with `setpts`, `fps=30`, and `tpad` clone padding, at libx264 CRF 17:

| Clip | From | To | Seconds |
| --- | --- | --- | --- |
| `service` | provider + 0.35 | calendar − 0.15 | 12 |
| `calendar` | calendar − 0.1 | details − 0.2 | 14 |
| `details` | details − 0.1 | review + 0.15 | 12 |
| `confirmation` | review + 0.2 | min(end − 0.15, confirmed + 5.5) | 10 |

## Audio

- Narration, one MP3 per scene: `edge-tts==7.3.1` in an isolated venv, voice
  `en-US-JennyNeural`, rate `-4%`. Fall back to macOS `say -v Samantha -r 156`, and
  record which engine was used. Fingerprint text, voice, and rate so changed lines
  regenerate. Support `--keep-recordings` for provided MP3s. Each line must end
  before the next begins.
- Original score, synthesized from oscillators with no samples, 60 s, 48 kHz
  stereo. MIDI chords, one per 4-second bar, cycling:
  `[50,57,61,64,69] [47,54,57,62,66] [43,50,54,57,62] [45,52,57,59,64]`. Soft pads,
  with eight plucked arpeggio notes per bar, one octave up, panned alternately.
- Effects: soft clicks at 16.2, 23.6, 27.7, 31.0, 42.8, 47.0 s (retime them to the
  new cuts), and a gentle confirmation chord (MIDI 81, 85, 88) at 48.4 s.
- Mix: duck the score about 45% under speech, with fades. Apply `loudnorm=I=-18:TP=-2:LRA=7`
  to each narration line, delay it to its start, `amix` with `normalize=0`,
  `alimiter=limit=0.89`, fade out at 59.2 s. Write `public/audio/mix.wav`.

## Render

- Bundle and render with `@remotion/renderer` to `output/haab-calendar-remotion.mp4`:
  h264, AAC, CRF 18, yuv420p, concurrency 1 (Chromium 151 failed concurrent worker
  startup; override with `REMOTION_CONCURRENCY` only after checking). Support
  `--stills` for review frames at 75, 240, 405, 660, 840, 1050, 1230, 1395, 1515,
  1710, 1790.
- Normalize with FFmpeg to the final file: `scale` to limited range and BT.709,
  `format=yuv420p`, libx264 medium CRF 17, BT.709 color tags, `-c:a copy`, `-t 60`,
  `+faststart`. This pass is what makes colors correct in browsers.

## Verify before calling it done

Assert with FFprobe/FFmpeg: H.264, 1920 × 1080, `30/1`, exactly 1,800 frames,
duration within 0.15 s of 60, yuv420p, AAC stereo, full-file decode with no errors,
no `blackdetect` interval of 0.4 s or more, loudness measured with `ebur128`, six
non-overlapping narration lines, zero blocked writes, one local booking. Extract
final-film frames and a contact sheet from the encoded MP4, and look at them. Open
the MP4 in Chrome and seek through it. Say plainly if no human listening review
happened.

## Publishing on the landing page

The 1080p render never goes on a page. Follow `docs/landing-demo-video.md` for the
720p re-encode, poster, and captions. Its caption timings only hold while the
narration is unchanged, so update both VTT files if the script or timing moves.
