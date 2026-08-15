# Security, Safety & Ethical Policy for `web-discoverability-skill`

This document defines the security guardrails, data privacy rules, bot safety policies, and ethical standards governing **`web-discoverability-skill`**.

---

## 🔒 Security Principles

`web-discoverability-skill` is engineered to modify web application routing, metadata, caching, sitemaps, headers, and crawl directives safely. All changes implemented by `web-discoverability-skill` must adhere to strict security constraints:

### 1. Data Privacy & Administrative Isolation

- **No Indexing of Sensitive Routes**: Never include administrative routes (`/admin`, `/dashboard`, `/internal`, `/api/private`), staging environments, user accounts, password reset flows, or personal data pages in public XML sitemaps or search engine indices.
- **Strict Canonical Boundaries**: Ensure canonical tags and OpenGraph URLs never expose internal query parameters, session tokens, API keys, or user tracking IDs.
- **Header Safety**: Never output private session data or non-public cache directives (`Cache-Control: public` must only be applied to non-authenticated, publicly safe assets).

### 2. Authentication & Paywall Guardrails

- **No Security Bypasses**: `web-discoverability-skill` must never bypass authentication, authorization middleware, paywalls, or rate-limiting to grant search crawlers unauthorized access to private data.
- **Flexible Paywall Previews**: When implementing subscription or paywalled content optimization (`paywall.jsonl`), use official Schema.org `hasPart` / `isAccessibleForFree` markup with explicit structural previews authorized by the site publisher.
- **No Cloaking**: Never serve different primary text content to crawlers than to human users to artificially pass access controls.

### 3. WAF & Bot Policy Guardrails

- **DDoS & Rate Limit Integrity**: When configuring AI bot policies (`GPTBot`, `ClaudeBot`, `PerplexityBot`), never disable web application firewall (WAF) SQL injection rules, XSS protection, or rate-limiting defenses.
- **Controlled Bot Allowlisting**: Grant crawler access only via verified user-agent strings or published IP ranges in alignment with repository owner preferences.

---

## 🛡️ Ethical SEO & Anti-Spam Guidelines

`web-discoverability-skill` strictly enforces evidence-based, white-hat search discoverability engineering. The following deceptive or manipulative techniques are **explicitly forbidden**:

1. **No Fake Structured Data**: Never fabricate Schema.org business facts, product ratings, review counts, author credentials, or event details.
2. **No Keyword Stuffing or Hidden Text**: Never inject hidden DOM elements, zero-font text, off-screen text, or repetitive keyword blocks intended solely to manipulate search algorithms.
3. **No Scaled Thin AI Content**: Never generate programmatic doorway pages, low-value auto-generated text, or deceptive content farms.
4. **No Fake Freshness**: Never update `dateModified` or `lastmod` metadata timestamps without genuine content updates.
5. **No Deceptive Redirects**: Never configure sneaky redirects that send search engine crawlers to one destination and human users to an unrelated commercial destination.

---

## 🐛 Reporting Security Issues

If you discover a security vulnerability or unsafe behavior in `web-discoverability-skill` helper scripts or registry rules:

1. **Do Not File Public Issues**: Avoid opening public GitHub issues for security vulnerabilities.
2. **Contact Maintainers**: Send a detailed security report to the repository security team or project maintainers.
3. **Report Contents**: Include a description of the issue, affected requirement ID or script, steps to reproduce, and potential security impact.
