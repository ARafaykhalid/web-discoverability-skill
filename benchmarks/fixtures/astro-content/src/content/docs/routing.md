---
title: Routing in content collections
description: How an entry id in the docs collection becomes an output path, and where the id comes from when the file name and the front matter disagree.
updated: 2026-01-18
---

A collection entry does not choose its own URL. The route file decides that, and in
this project the route is `src/pages/docs/[...slug].astro`. It asks the collection
for every entry, hands each id to `getStaticPaths`, and the build writes one file per
id under `docs/`.

The id is derived from the file path relative to the collection base, with the
extension removed. `routing.md` becomes `routing`, and a file at `guides/deploy.md`
would become `guides/deploy`. Nothing in the front matter changes it, which is worth
knowing before renaming a file that other pages already link to.

<img src="/diagrams/routing-table.png" alt="Three collection file names beside the output paths the build writes for them" width="960" height="420">

Because the id is the whole path segment, the route pattern has to be a rest
parameter. A single `[slug]` would match `routing` and miss `guides/deploy`
entirely, and the build would emit nothing for the nested entry.
