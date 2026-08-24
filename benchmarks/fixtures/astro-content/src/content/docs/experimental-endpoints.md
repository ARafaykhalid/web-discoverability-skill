---
title: Experimental endpoints
description: Notes on an endpoint shape that is still being reviewed. Published as a draft so the wording can be read in place before it is finished.
updated: 2026-02-14
draft: true
---

This entry is marked `draft: true` in its front matter. The layout reads that flag
and serves `<meta name="robots" content="noindex, follow">`, which is the intended
handling: the page is reachable so a reviewer can read it in its final typography,
and it asks not to be listed while the wording is unsettled.

The sitemap integration does not read that flag. It lists every route the build
emits, so this URL appears in `sitemap-0.xml` alongside the finished entries. Two
files therefore give opposite instructions about the same address, and the fix is a
`filter` in the integration options rather than a change to this file.
