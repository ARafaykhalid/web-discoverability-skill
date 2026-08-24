/**
 * Session guard for the /app/ subtree.
 *
 * This is the boundary the rest of the fixture is about. Everything under /app/
 * requires a session; everything outside it is public and must stay reachable.
 * The guard is written here rather than inferred from a route table so that the
 * profiler has a real file to name as evidence for the authentication fact.
 */
import { PROTECTED_ROUTES, isProtected } from './protected-routes.js';

const SESSION_COOKIE = 'meridian_session';

/**
 * Read the session a request carries, or null.
 *
 * Returning null rather than throwing is deliberate: an unauthenticated request
 * to a protected path is an ordinary outcome that ends in a redirect to /login,
 * not an error condition.
 */
export function getServerSession(request) {
  const header = request.headers?.cookie ?? '';
  const pair = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!pair) return null;
  const token = pair.slice(SESSION_COOKIE.length + 1);
  return token ? { token } : null;
}

/**
 * Wrap a route handler so protected paths require a session.
 *
 * The 302 to /login carries `Cache-Control: private, no-store` because the
 * response is specific to one visitor. A shared cache that kept it would serve
 * one visitor's redirect - or one visitor's dashboard - to the next.
 */
export function withAuth(handler) {
  return (request, response) => {
    const path = new URL(request.url, 'https://example.com').pathname;
    if (!isProtected(path)) return handler(request, response);

    const session = getServerSession(request);
    if (session) return handler(request, response);

    response.statusCode = 302;
    response.setHeader('Location', `/login?next=${encodeURIComponent(path)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    return response.end();
  };
}

export { PROTECTED_ROUTES };
