# 21 November 2026 — world news in one image

[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/flavyn/news-image-20261121/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/flavyn/news-image-20261121/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

An entry for [make.fun](https://make.fun) competition **news-image-20261121**: one image that sums up the world news of Saturday 21 November 2026.

The image is `entry.png` beside `main.ts`. The program validates it and copies it to `entry.png` in the output directory, creating that directory when needed:

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

PowerShell: `$env:MAKEFUN_OUTPUT_DIR='out'; node main.ts`. The destination defaults to `/output` when the variable is unset. The gate accepts a whole PNG or JPEG of at most 1,048,576 bytes and at most 1024 by 1024 pixels; PNG validation walks chunks and their CRCs through IEND, JPEG validation walks segments through EOI, and an invalid file prints one stderr line and exits nonzero. Two runs into two directories write byte-identical output and print the same single line.

## What the image shows

One front page, seven stories, six regions, with the date written on it: the missile strike on Poland, Israeli strikes in Gaza, the COP31 deadlock, toxic alcohol in Manipur, the Ebola outbreak in DR Congo, the $7.25bn Roundup settlement, and the claimed proof of the Riemann hypothesis. Each story is a flat drawn icon and a short label, sized to stay legible at about 300 pixels across.

Sources: Al Jazeera, BBC News, The Guardian — every item published 21 November 2026 (UTC). Reuters and AP were unreachable from the build machine (HTTP 401 and 403).

## Licence

MIT, see `LICENSE`.
