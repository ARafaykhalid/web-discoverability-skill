---
title: Deploying a static build
updated: 2026-02-02
---

`astro build` writes the whole site to `dist/` and exits. There is no server in the
output, so any host that can serve files will serve this project, and the origin the
build assumed is the one in `astro.config.mjs` rather than anything the host tells it
at request time.

The build writes one document per route, plus `sitemap-index.xml` and
`sitemap-0.xml` from the sitemap integration and `rss.xml` from the route module in
`src/pages`. Files under `public/` are copied across untouched, which is how
`robots.txt` and `llms.txt` reach the root of the served site.

<img src="/diagrams/deploy-pipeline.png" width="960" height="540">

Uploading `dist/` is the whole deployment. Nothing in the output reads an
environment variable, so a document that names the wrong origin names it until the
next build, and the fix is always a rebuild rather than a host setting.
