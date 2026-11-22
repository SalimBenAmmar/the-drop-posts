# The Drop · daily content playbook

Account: Instagram **@ukwaterlab** ("The Drop · UK Water Science"). Faceless, documentary-style UK water science for a UK audience.
Every daily run follows this file. The engine lives in `engine/`; posts go in `queue/`; topics used so far are in `content/topics.md`.

## 1. What to queue each run

- Two slots a day: **12:30 and 19:30 UK time** (UK = UTC in winter, UTC+1 from the last Sunday of March to the last Sunday of October).
- Rotation in `state.json`: `cycle` = reel, reel, reel, reel, carousel; `next_index` = the next item; `last_queued_slot` = UTC time of the last queued post.
- Fill every empty slot after `last_queued_slot` up to **36 hours from now** (normally 2 posts, at most 4). Each slot takes the next item of the cycle; then update `next_index` and `last_queued_slot`.
- If a slot is already in the past, skip it (never queue posts in the past).
- **Backlog cap:** count the folders in `queue/`. Queue at most `4 − (that count)` new posts (never below 0). If the publisher is behind, skip the extra slots but still move `last_queued_slot` forward. The publisher only posts inside the UK windows 12:30–14:30 and 19:30–21:30, one per window, so a backlog drains at 2 a day and never floods the feed.

## 2. Topics

- UK tap water only: hardness by region, chlorine, where water comes from, water companies, reservoirs and rivers, drought and hosepipe bans, leaks, water use, bills, sewage and river quality news, myths (bottled vs tap, boiling, filters), limescale tips, regional "your town" episodes.
- **What performs (first 2 weeks, public plays):** hard-water contrasts and "your city's water" hooks win (London rock 1.5K, Liverpool from Wales 1.5K, Scotland soft vs London hard 1.2K, Portsmouth springs 681). Company structure and pure history lose (Welsh Water ownership 118, Glasgow/Queen Victoria 123). So:
  - Lead with what the viewer can check in their own kitchen or town (hardness, taste, smell, colour, where their tap water comes from, what they pay, what they waste). History is allowed only as the second beat, never the hook.
  - At least 2 of every 4 reels are city episodes for big audiences (London, Birmingham, Manchester, Leeds, Glasgow, Liverpool, Sheffield, Bristol, Newcastle, Edinburgh, Cardiff, Leicester, Nottingham, Belfast). Use a series label in the caption's first line ("Where does Leeds' water come from?").
  - Contrast hooks are best: two places, two numbers, or a myth vs fact.
- Pick a topic not in `content/topics.md`. Prefer regional variety (London, Birmingham, Manchester, Leeds, Bristol, Cardiff, Glasgow, Edinburgh, Belfast, Newcastle, Norwich...) because regional posts pull UK comments.
- Current news is allowed when an official or major UK news source covers it; explain it calmly, no outrage bait.
- **Never mention Freshyva, filters for sale, or any product.** Pure education.

## 3. Facts (non-negotiable)

- Look up every fact with web search and **open the page**; snippets are not sources.
- Use official sources first: water companies, Drinking Water Inspectorate (DWI), DWQR Scotland, Ofwat, Environment Agency, GOV.UK, Water UK, ONS. Major UK outlets (BBC, Guardian, FT) only for news events.
- Write numbers exactly as the source gives them; round only in narration ("about two thirds" for 65%).
- No health scares, no medical claims, no "dangerous" framing unless an official source says so. Hard water and chlorine levels are presented as the regulators present them.
- Every post names its source in the caption, and on the card or slide that uses the fact.

## 4. Reel script (`engine/scripts/<slug>.json`)

```json
{
  "title": "...", "voice": "bm_george", "speed": 1.05, "lead_in": 0.1,
  "hook": ["LINE ONE (white)", "LINE TWO (red label)"],
  "lines": [ {"text": "spoken sentence", "gap": 0.3, "caps": ["CAPTION *KEY", "..."], "scene": {...}} ],
  "sources": ["Name: URL"]
}
```

- **Hook = scroll stopper**: line 1 is a surprising, true, concrete claim said in the first second ("There's rock in London's tap water."). The same claim is the on-screen `hook`, visible from frame 1. No intros, no "did you know", no logo first.
- **Watch time first:** 6–8 lines, **22–30 seconds** (short reels get rewatched; long ones get skipped). Cut background lines; keep only the hook, 3–5 facts, a payoff and the CTA. The payoff line (the most surprising number or twist) goes second to last so people stay to the end.
- British English, spoken like a friend explaining. Numbers written as words in `text` ("a hundred and thirty-six").
- The hook line is 8 words or fewer, uses "your" or a named city, and states the claim (no questions without answers, no "did you know").
- Last line is an easy, specific question anyone can answer in one word, then the town: "Hard or soft where you live? Comment your town.", "Guess how many litres? Comment your guess.", "Tap or bottled? Comment below." Never just "Comment your town." on its own. The `cta` scene `title` is the short question only, **max 18 characters** or it overflows (e.g. "HARD OR SOFT?", "YOUR GUESS?", "TAP OR BOTTLED?"); the caption chunks underneath carry "COMMENT YOUR *TOWN".
- `caps`: 1–3 words per chunk, uppercase, in spoken order, matching the words said; exactly one `*KEY` word per chunk where possible.
- Consecutive lines with an identical `scene` object stay on the same shot.

Scene types:
- `{"type":"map","cam":"uk"|[lon,lat,k],"cam2":...,"pins":[["LABEL",lon,lat,"HARD"|"SOFT"|null]],"hatch":"chalk"|"southeast","hatchLabel":"...","hatchLabelAt":[lon,lat],"title":"..."}` (k ≈ 3500 whole UK, 7000 a region, 20000+ a city)
- `{"type":"icon","icon":"drop|flask|shower|bath|toilet|washer|kettle|glass|rock","title":"...","label":"..."}` or with `"value":"13 L","unit":"PER MINUTE"`
- `{"type":"stat","tag":"OFFICIAL · SOURCE","items":[{"v":"65","suffix":"%","l":"LABEL","red":true}],"bars":true,"source":"..."}` (1–2 items)
- `{"type":"card","tag":"OFFICIAL · SOURCE","l1":"BLUE LINE","l2":"RED LINE","source":"..."}`
- `{"type":"check","text":"NOT HARMFUL","source":"..."}`
- `{"type":"particles"}` (calcium and magnesium in a drop)
- `{"type":"cta","title":"COMMENT YOUR TOWN"}` (always the last scene)

Build:
```bash
cd engine && ./setup.sh
~/venv/bin/python voice.py scripts/<slug>.json out/<slug>
node render.mjs scripts/<slug>.json out/<slug> --sheet      # one frame per second in out/<slug>/sheet/
node render.mjs scripts/<slug>.json out/<slug> --video
~/venv/bin/python sound.py scripts/<slug>.json out/<slug>
ffmpeg -y -i out/<slug>/video_noaudio.mp4 -i out/<slug>/mix.wav -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart out/<slug>/reel.mp4
```

**Cover (every reel):** add an entry to `engine/covers.json` (`slug`, `n` = the next number, `tag` = city or topic in caps, `title` = 2–3 short lines with one `*key*` phrase, and `pins` [["LABEL", lon, lat, side?]] for places or `icon` drop|kettle|flask|tap for topics), then `node covers.mjs covers.json out/covers <slug>` and use `out/covers/<slug>.jpg` as the queued `cover.jpg`. Same template for every reel so the profile grid stays harmonised; all text must sit inside the centre 3:4 band (the grid crop). Look at it before queueing (title fits, pin labels don't collide; set side "l", "r", "bl" or "br" to move a label).

## 5. Carousel (`engine/scripts/<slug>-carousel.json`)

```json
{"topic": "LONDON WATER", "slides": [ {"type": "cover", "tag": "...", "l1": "blue line", "l2": "red line", "lead": "...", "icon": "kettle|drop|flask|pin|tap"}, ... ]}
```
- 6–8 slides. Slide 1 `cover` is the hook (curiosity gap, e.g. "Why your kettle turns white" + "It isn't dirt. It's dissolved rock.").
- Middle slides: `text` (lead or paras), `steps` (3–5 steps), `stats` (2 big numbers), `scale` (rows with relative widths `w`).
- Last slide `tips` with `"cta": ["QUESTION?", "Save this, and comment your town for the next one."]` (carousels are for saves and shares).
- Cover: one bold claim in under 7 words plus a lead that opens a curiosity gap. Topics that work as carousels: checklists, myth vs fact, "what your bill pays for", step-by-step processes, comparisons by city.
- Every slide that states a fact sets `source`.
- Build: `node carousel.mjs scripts/<slug>-carousel.json out/<slug>-carousel` (a "WARNING overflows" line means shorten that slide's text and rebuild).

## 6. Check before queueing (look, don't assume)

- Reels: tile the sheet (`ffmpeg -pattern_type glob -i 'out/<slug>/sheet/s_*.jpg' -vf "scale=216:384,tile=8x5" -frames:v 1 sheet.jpg`) and look at it. Frame 1 must show the hook. No text clipped or colliding, captions match the narration, cards readable, no empty frames.
- Carousels: look at every slide. Nothing overflows, sources present, last slide has the comment CTA.
- Fix and re-render anything that fails. Never queue something you haven't looked at.

## 7. Queue

Folder `queue/<YYYY-MM-DD-HHMM>-<slug>/` (UK date and time) with media and `post.json`:
- Reel: `{"type":"reel","publish_at":"<UTC ISO>","caption":"...","media":["reel.mp4"],"cover":"cover.jpg"}`
- Carousel: `{"type":"carousel","publish_at":"<UTC ISO>","caption":"...","media":["slide_1.jpg", ...]}`

Caption format:
```
<Hook sentence> 💧
<2–3 short sentences with the key facts and numbers>

<Same easy question as the video's CTA> 👇
<Share line: "Send this to someone in <city>." for city posts, "Save this for later." for carousels and tips>
Follow @ukwaterlab for your town next.
Source: <names>

#tag1 #tag2 #tag3 #tag4 #tag5
```
Hashtags: 5 total. 2–3 topic tags (#ukwater #hardwater #tapwater #limescale #waterquality #chlorine #savewater) + 2 UK place tags matching the post (#london #manchester #birmingham #glasgow #leeds #bristol #cardiff #edinburgh #scotland #wales). Rotate; don't repeat the exact same set two posts in a row.

Then: update `state.json`, add the topic to `content/topics.md` (date, slot, type, title, sources), commit with a clear message, and push to `main`. The publisher posts each item when its time comes.
