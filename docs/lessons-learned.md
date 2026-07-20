# Lessons Learned

## Always use `-vn` on audio-only ffmpeg commands

If an MP3 file has embedded album art, ffmpeg sees it as a video stream and will fail to convert it. Use `-vn` to fix.

## Use `-f segment` for gapless HLS boundaries

Independent ffmpeg invocations per segment cause AAC encoder state resets at each boundary,
creating audible hitches. The `-f segment` muxer generates all segments from one encode,
writing files incrementally as they're produced — no hitch, no wait.

Avoid `-f hls` with `-hls_segment_filename` for VOD — it doesn't output segments until the
full encode finishes. `-f segment` writes each file as soon as its duration is reached,
enabling progressive serving.

Key flags: `-reset_timestamps 1` (resets PTS to 0 per segment for HLS) and
`-segment_start_number 0`.

## Always clean PGlite database between interrupted runs

If the server or test is killed mid-flight, the PGlite database can become corrupted.
Always `rm -rf data/pglite` before re-running when behavior seems off.
