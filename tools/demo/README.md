# Demo recording

Scripted walk-through of taking an order, recorded headlessly against a local
`vite preview` with the Supabase REST surface mocked (`mock.mjs`), so it never
touches real data. Signs in with a PIN, builds an order, saves it for later and
resumes it, checks out a single delivery, then builds and splits a second order.

    npm run build && npx vite preview --port 4173 &
    npm i --no-save playwright-core
    DEMO_OUT=/tmp/demo-raw node tools/demo/record.mjs

Writes one `.webm` and `marks.json` (scene start/end in ms) to `DEMO_OUT`.
Playwright's video recorder needs an ffmpeg binary; the system one works
when linked at `$PLAYWRIGHT_BROWSERS_PATH/ffmpeg-<rev>/ffmpeg-linux`.
