# Landing demo video

The one-minute product demo on the landing page (`#demo`, between "How it
works" and the live examples). It shows Haab's real booking flow on a demo page
with a fictional patient, narrated in English, with English and Spanish
captions. The same video ships on brilliant.dev. Everything below was verified
there and on a real iPhone. Follow it when you place this video anywhere else
or replace it.

**Where it lives**

- Assets: `public/video/haab-calendar-demo.mp4`, `.jpg` (poster), `.en.vtt`,
  `.es.vtt`
- Data and caption logic: `lib/demo-video.ts`
- Section: `components/landing/demo-video.tsx`
- Copy: `demoVideo` in `components/landing/translations.ts`
- Tests: `lib/__tests__/demo-video.test.ts` and
  `components/landing/__tests__/demo-video.test.tsx`

## Assets: copy, don't re-encode

- `haab-calendar-demo.mp4`: 1280x720, H.264 High, AAC, faststart, about 3.3 MB
- `haab-calendar-demo.jpg`: the poster, the frame at 11 s, about 61 KB
- `haab-calendar-demo.en.vtt` and `.es.vtt`: 6 cues each, on the same timings

Never put the Remotion render (`video-demo/output/haab-calendar-demo.mp4`,
1080p, about 24 MB) on a page. If the video changes, re-encode from the new
render. The VTT timings only hold while the narration is unchanged.

```sh
ffmpeg -i video-demo/output/haab-calendar-demo.mp4 -vf scale=-2:720 -c:v libx264 \
  -crf 26 -preset slow -profile:v high -pix_fmt yuv420p -c:a aac -b:a 96k \
  -movflags +faststart -map_metadata -1 public/video/haab-calendar-demo.mp4
ffmpeg -ss 11 -i public/video/haab-calendar-demo.mp4 -frames:v 1 -q:v 4 \
  public/video/haab-calendar-demo.jpg
```

## Markup

```tsx
<video controls preload="none" playsInline poster="/video/haab-calendar-demo.jpg"
       width={1280} height={720}>
  <source src="/video/haab-calendar-demo.mp4" type="video/mp4" />
  <track kind="captions"  srcLang="en" label="English" src="/video/haab-calendar-demo.en.vtt" default={/* page is English */} />
  <track kind="subtitles" srcLang="es" label="Español" src="/video/haab-calendar-demo.es.vtt" default={/* page is Spanish */} />
  <a href="/video/haab-calendar-demo.mp4">{/* download link, both languages */}</a>
</video>
```

- Never autoplay. With `preload="none"`, nothing but the poster loads until the
  visitor presses play.
- Size it with `width: 100%`, `height: auto` and `aspect-ratio: 16/9`.
- Every visible string comes from the translations, in both languages.

## Rule 1 (critical): exactly one caption track is `default`

On iOS (Safari, and Chrome on iPhone, which uses the same engine), a `<video>`
whose tracks all lack `default` stalls on play. The button flips to pause and
the time never moves. The track in the page's language is the default: English
captions on an English page, Spanish subtitles on a Spanish page
(`demoCaptionTracks`).

Desktop Chrome and its phone emulation don't reproduce this, and desktop WebKit
isn't a reliable stand-in. Only a real iPhone shows it.

## Rule 2: captions follow the language switch

The landing changes language without a reload (the language pill), and browsers
read `default` only once. When the language changes, the section sets the modes
itself. It finds each `<track>` by `srclang` and sets `track.mode`, in the order
from `demoCaptionModes`: the new language goes to `"showing"` first, then the
other goes to `"disabled"`, so the tracks are never all off. The first render is
skipped, so playback on load keeps using `default`.

## Rule 3: media skips the proxy

`proxy.ts` runs the Supabase session check on every request it matches. Its
matcher excludes `mp4` and `vtt`, so the many range requests iOS sends for one
video, and the caption files, are served as plain static files.

## Verify before shipping

1. Run `curl -r 0-1 -D - <deploy>/video/haab-calendar-demo.mp4`. Expect `206`
   and `video/mp4`, with no redirect and no `Set-Cookie`. Each `.vtt` returns
   `200` with `text/vtt`.
2. In desktop Chrome, nothing requests the `.mp4` before you press play, and
   the language pill swaps the captions mid-playback without stopping it.
3. Preview deploys sit behind Vercel login. Make a share link (Vercel MCP
   `get_access_to_vercel_url`), then on a real iPhone check that the video
   plays in English and in Spanish and that switching language changes the
   captions.
