# Framework adapters

Keep registry concepts framework-independent. Use this file only after architecture detection. Prefer existing utilities and native APIs.

## Next.js

### App Router

- Inspect `app/`, route groups, dynamic segments, layouts, templates, Route Handlers, middleware, Server Components, Client Components, Server Actions, and deployment settings.
- Prefer static `metadata`, `generateMetadata`, `robots.ts`, `sitemap.ts`, Route Handlers, and server-rendered JSON-LD when they fit the installed version.
- Inspect `metadataBase`, `generateStaticParams`, route groups, layouts, `loading`, `error`, `not-found`, middleware, redirects, rewrites, headers, `opengraph-image`, `twitter-image`, favicon/manifest metadata files, and generated OG images.
- Derive absolute URLs from one validated production origin; do not trust arbitrary request hosts for canonicals.
- Check SSR, SSG, ISR, streaming, `notFound`, error, fallback, and cache-revalidation states separately.
- Keep primary content and search-critical signals out of client-only effects.
- Review Server/Client Component boundaries, `use client`, Server Actions, `next/image`, `next/font`, client navigation, prefetching, Web Vitals, static export limits, and Node versus Edge runtime behavior.

### Pages Router

- Inspect `_app`, `_document`, page components, `getStaticProps`, `getServerSideProps`, API routes, redirects, rewrites, and custom server behavior.
- Merge head management into the existing approach. Avoid duplicate tags from nested head components.
- Generate robots, sitemap, feeds, and non-HTML resources through public files, API routes, or build-time generators consistent with deployment.

### Static export

- Verify every dynamic resource can be emitted statically or hosted separately.
- Do not propose request-time headers, ISR, Route Handlers, or middleware if the export target cannot support them.

## React, Vite, React Router, and TanStack

- Determine whether SSR/prerendering exists. A client SPA is not automatically equivalent to server-rendered HTML for metadata and primary content.
- Use route-aware server or prerender metadata when the architecture supports it. If it does not, report rendering limitations and evaluate prerender/SSR options without forcing migration.
- Keep navigation as anchors with resolvable URLs, and provide crawlable pagination for infinite experiences.
- Test hydration mismatches, loading/error states, virtualized content, fallback content, route discovery, and metadata/canonical behavior after client-side navigation.
- Host robots, sitemap, feeds, `llms.txt`, and verification resources through the actual static/server platform.

## Remix

- Use route `meta`, `links`, loaders, headers, resource routes, error boundaries, and server rendering.
- Generate canonical URLs from validated application configuration and route data.
- Implement robots, sitemaps, feeds, and machine-readable resources as resource routes when appropriate.

## Astro

- Inspect static, SSR, hybrid, content collections, integrations, endpoints, islands, and adapter/deployment configuration.
- Keep metadata and primary content in generated HTML; use islands only for necessary interactivity.
- Use endpoints or build-time generation for sitemaps, feeds, robots, and `llms.txt` according to output mode.

## Node servers: Express, Fastify, NestJS, Hono, Bun, Deno

- Identify template/render ownership, proxy trust, route order, static assets, redirects, headers, compression, and error handling.
- Generate canonical origins from trusted configuration rather than unvalidated `Host` headers.
- Serve search resources with explicit status, MIME type, caching, and privacy behavior.
- Account for reverse-proxy, serverless, and edge header transformations.

## Django and Django REST Framework

- Inspect URLconf, templates, context processors, middleware, sites framework, locale middleware, static/media storage, cache middleware, admin, and deployment proxy settings.
- Use template blocks/context for metadata, `django.contrib.sitemaps` where appropriate, explicit robots/feed views, and server-rendered JSON-LD.
- Keep DRF API schemas and browsable API pages separate from public content indexability decisions.
- Validate `ALLOWED_HOSTS`, `SECURE_PROXY_SSL_HEADER`, canonical origin configuration, redirects, and cache privacy.

## Flask, FastAPI, Starlette, and Jinja

- Inspect routers, mounted apps, templates, middleware, static storage, proxy headers, and ASGI/WSGI deployment.
- Use server templates for indexable pages and explicit routes for robots, sitemap, feeds, and `llms.txt`.
- Do not mark API-only JSON routes as SEO pages unless a public search use case exists.

## CMS, headless, and multi-layer systems

- Assign ownership by layer: page metadata to frontend/template, canonical source to content model plus frontend, sitemap/feed inventory to CMS or aggregation service, redirects to edge/frontend, IndexNow to the authoritative publish/delete event, caching to application/CDN, and access control to server/auth layer.
- Keep draft, preview, scheduled, expired, and deleted states consistent across CMS, frontend, sitemaps, feeds, structured data, and IndexNow.
- In monorepos, profile each public app independently and share utilities only when origins, brands, and policies actually match.

## Monorepos and Turborepo

- Inspect Turborepo, pnpm, npm, and Yarn workspace graphs; identify generated resources, build dependencies, route ownership, deployment targets, and per-app production origins.
- Keep shared metadata/schema utilities configurable by brand, locale, and origin. Prevent cross-app canonicals, sitemap leakage, and deployment-specific metadata drift.
- Aggregate multiple sitemap sources only at the owner that can prove canonical, indexable inventory for the target host.

## Unknown or other frameworks

Infer equivalent owners from routing, rendering, headers, templates, assets, and deployment. State any inference. Never transplant code patterns from a familiar framework without confirming compatibility.
