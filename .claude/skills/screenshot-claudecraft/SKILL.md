---
description: Takes a headless-Chrome screenshot of the live ClaudeCraft homepage (or another path) for visual verification before/after a deploy. Use when asked to show, preview, or check what the live site looks like.
disable-model-invocation: true
arguments: [path]
---

Screenshot `https://www.claudecraft.ca$path` (default path is `/` if none given) and show the result.

```!
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
TS=$(date +%s)
OUT="/c/Users/hunte/AppData/Local/Temp/claudecraft-screenshot-$TS.png"
UDIR="/c/Users/hunte/AppData/Local/Temp/claudecraft-chrome-profile-$TS"
mkdir -p "$UDIR"
PATH_ARG="${ARGUMENTS:-/}"
"$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$UDIR" --window-size=1500,1400 --screenshot="$OUT" --virtual-time-budget=6000 "https://www.claudecraft.ca$PATH_ARG"
echo "Screenshot saved to: $OUT"
```

Read the resulting PNG with the Read tool to actually look at it before describing it or reporting success — don't assume the page looks right just because the screenshot command exited cleanly.

Known Chrome quirk on this machine: the first run after a profile is deleted may log a harmless `Failed to open persistent cache files` / `Missing headless user data directory` warning to stderr — ignore it as long as the PNG file is actually written with a reasonable size (a blank/broken page screenshot is usually under ~50KB; a real rendered page is several hundred KB to a few MB).
