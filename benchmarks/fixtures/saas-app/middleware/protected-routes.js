/**
 * The routes that require a session.
 *
 * Kept as data, in one place, because the two systems that have to agree about
 * this boundary - the guard that redirects and the crawl policy in robots.txt -
 * drift apart the moment the list is written twice. A route added here without a
 * matching robots rule becomes crawlable; a robots rule written without a route
 * here blocks something public. This fixture ships an instance of the second
 * fault on purpose: robots.txt says `Disallow: /a`, which reaches further than
 * anything in this list.
 */
export const PROTECTED_ROUTES = [
  { path: '/app/dashboard', title: 'Report schedules' },
  { path: '/app/settings', title: 'Workspace settings' },
];

/** The public routes, listed so the boundary can be asserted from both sides. */
export const PUBLIC_ROUTES = ['/', '/pricing', '/api-docs', '/changelog', '/login'];

/** True when a path is inside the authenticated subtree. */
export function isProtected(path) {
  const normalized = String(path ?? '').replace(/\/+$/, '') || '/';
  return PROTECTED_ROUTES.some((route) => normalized === route.path || normalized.startsWith(`${route.path}/`));
}
