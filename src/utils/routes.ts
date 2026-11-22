export type AppRouteTarget = 'catalog' | 'admin' | 'accounts';

function isTrailingSubdirRoute(pathname: string): boolean {
  const clean = pathname.split('?')[0].split('#')[0];
  return /\/(?:admin|accounts)\/$/.test(clean);
}

/**
 * Resolves a navigation target ('catalog' | 'admin' | 'accounts') to a relative URL
 * that works identically on root domains ('/') and subpath deployments ('/safra/').
 */
export function resolveAppRoute(
  target: AppRouteTarget,
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'
): string {
  const prefix = isTrailingSubdirRoute(pathname) ? '../' : './';
  if (target === 'catalog') {
    return prefix;
  }
  return `${prefix}${target}.html`;
}

/**
 * Computes the canonical public URL of the catalog root for WhatsApp sharing,
 * preserving subpaths such as '/safra/' on GitHub Pages.
 */
export function getCatalogPublicUrl(
  currentHref: string = typeof window !== 'undefined' ? window.location.href : 'https://localhost/'
): string {
  try {
    const u = new URL(currentHref);
    const cleanPath = u.pathname
      .replace(/\/(?:admin|accounts)(?:\/index\.html|\/|\.html)?$/, '/')
      .replace(/\/index\.html$/, '/');
    const normalizedPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
    return `${u.origin}${normalizedPath}`;
  } catch {
    return currentHref;
  }
}
