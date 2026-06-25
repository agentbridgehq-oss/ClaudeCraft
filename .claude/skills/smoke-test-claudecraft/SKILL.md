---
description: Runs the full ClaudeCraft launch-readiness smoke test — every page, every checkout product, every API endpoint. Use when asked to test, verify, or check that ClaudeCraft is working before/after a deploy.
disable-model-invocation: true
---

Run the full smoke test against the live site and report pass/fail counts, listing any failures explicitly.

```!
B=https://www.claudecraft.ca
ok=0; fail=0
for path in / /articles.html /bundles.html /how-it-works.html /reviews.html /faq.html /founder-story.html /why-claudecraft.html /refund.html /privacy.html /terms.html /ebook.html; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$B$path")
  if [ "$code" = "200" ]; then ok=$((ok+1)); else fail=$((fail+1)); echo "FAIL $code $path"; fi
done
for p in cowork starter poweruser student jobseeker content solo connected money family writer startup builder commands vault; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-redirs 0 "$B/checkout/$p")
  if [ "$code" = "303" ]; then ok=$((ok+1)); else fail=$((fail+1)); echo "FAIL $code /checkout/$p"; fi
done
for path in /api/articles /api/recent-sales /healthz; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$B$path")
  if [ "$code" = "200" ]; then ok=$((ok+1)); else fail=$((fail+1)); echo "FAIL $code $path"; fi
done
echo "RESULT: $ok passed, $fail failed"
```

If any product or page is added or removed from `static-server.mjs`'s `PRODUCTS`/`DOWNLOAD_SETS`, update the lists in this skill to match — this should always test every real product, not a stale subset.

Report the result plainly: pass/fail count, and the live URL `https://claudecraft.ca`.
