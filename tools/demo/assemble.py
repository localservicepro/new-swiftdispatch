#!/usr/bin/env python3
"""Cut a demo recording into its scenes, lay the narration under each, and
join the lot with a title and end card.

    python3 tools/demo/assemble.py <raw dir> <vo dir> <cards dir> <out.mp4> [scene ...]

<raw dir> holds the Playwright .webm and marks.json written by a record_*.mjs
script; <vo dir> holds s1.wav … sN.wav, one per scene in the order given (or
in marks order when no scene names are given). A scene runs for the longer of
its footage and its narration: footage shorter than the words freezes on its
last frame, narration shorter than the footage is padded with silence."""
import glob, json, os, subprocess, sys

raw, vo, cards, out = sys.argv[1:5]
wanted = sys.argv[5:]
marks = json.load(open(os.path.join(raw, "marks.json")))["marks"]
if wanted:
    marks = [m for m in marks if m["name"] in wanted]
webm = glob.glob(os.path.join(raw, "*.webm"))[0]

def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())

W, H = 1600, 900
TITLE_S, END_S = 3.5, 4.0
inputs = ["-i", webm, "-loop", "1", "-t", str(TITLE_S), "-i", os.path.join(cards, "title.png"), "-loop", "1", "-t", str(END_S), "-i", os.path.join(cards, "end.png")]
fc = []
# cards: silent video + silence
fc.append(f"[1:v]scale={W}:{H},format=yuv420p,setsar=1[tv];anullsrc=r=48000:cl=stereo,atrim=0:{TITLE_S}[ta]")
fc.append(f"[2:v]scale={W}:{H},format=yuv420p,setsar=1[ev];anullsrc=r=48000:cl=stereo,atrim=0:{END_S}[ea]")
segs = ["[tv][ta]"]
total = TITLE_S
for i, m in enumerate(marks):
    wav = os.path.join(vo, f"s{i+1}.wav")
    inputs += ["-i", wav]
    idx = 3 + i
    start, end = m["start"] / 1000, m["end"] / 1000
    clip = end - start
    words = dur(wav)
    D = max(clip, words + 0.8)
    pad = max(0.0, D - clip)
    fc.append(f"[0:v]trim={start:.3f}:{end:.3f},setpts=PTS-STARTPTS,scale={W}:{H},format=yuv420p,setsar=1,tpad=stop_mode=clone:stop_duration={pad:.3f}[v{i}]")
    fc.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=400|400,apad=whole_dur={D:.3f}[a{i}]")
    segs.append(f"[v{i}][a{i}]")
    total += D
    print(f"{m['name']:>8}: footage {clip:5.1f}s, words {words:5.1f}s -> {D:5.1f}s")
segs.append("[ev][ea]")
fc.append("".join(segs) + f"concat=n={len(segs)}:v=1:a=1[v][a]")
total += END_S
cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]", "-r", "25", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]
print(f"total ≈ {total:.0f}s"); sys.stdout.flush()
subprocess.check_call(cmd)
print("wrote", out, f"{os.path.getsize(out)/1e6:.1f} MB")
