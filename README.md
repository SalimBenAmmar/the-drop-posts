# The Drop · post queue

Automated publishing for The Drop (UK water science) on Instagram.

## How it works

1. A daily Claude task writes, fact-checks and renders new posts, and commits each one to `queue/`.
2. GitHub Pages serves the files publicly so Instagram can fetch them.
3. `.github/workflows/publish.yml` runs every 15 minutes and publishes every post whose `publish_at` time has passed.
4. Published posts move to `posted/` (media files are removed). Posts that fail 3 times move to `failed/`.

Posting rhythm: 2 posts a day (12:30 and 19:30 UK time), in a repeating cycle of 4 reels then 1 carousel.
The next position in the cycle is kept in `state.json`.

## Queue format

Each post is a folder `queue/<YYYY-MM-DD-HHMM-slug>/` containing `post.json` and its media:

```json
{
  "type": "reel",
  "publish_at": "2026-11-10T12:30:00Z",
  "caption": "Caption text with hashtags",
  "media": ["reel.mp4"],
  "cover": "cover.jpg"
}
```

- `type`: `reel` (one MP4, 9:16), `carousel` (2–10 JPEG images, 4:5), `story` (one 9:16 JPEG) or `image`.
- `publish_at`: UTC time. UK time is UTC in winter and UTC+1 in summer.
- Carousel images must be JPEG; Instagram's API does not accept PNG.

## One-time setup

- Secret `IG_ACCESS_TOKEN`: the system-user token from the Meta app "Drop Poster" (never expires).
- Settings > Pages: deploy from branch `main`, folder `/ (root)`.
- Optional variable `IG_USER_ID`: only needed if the token covers more than one Instagram account.

Test the connection: Actions > Publish due posts > Run workflow > mode `check`.
