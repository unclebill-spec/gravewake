/**
 * pages1: a GitHub Pages build under a subpath (e.g. https://unclebill-spec.github.io/gravewake/).
 *
 * Run the normal build with GRAVEWAKE_BASE=/gravewake/ (vite.config.ts passes it to Vite's `base`, which moves the
 * bundle, BASE_URL — so the service worker registers at /gravewake/sw.js with that scope — and the router's base).
 * The game's own string paths to public files ("/art/...", "/__grok/...", "/favicon.svg", "/gravewake.webmanifest")
 * are rewritten here at build time to start with that base. With no GRAVEWAKE_BASE (the default "/") this plugin
 * does nothing, so the normal build and every source file are unchanged.
 */
export const PUBLIC_PREFIX = /(["'`])\/(art\/|__grok\/|favicon\.svg|gravewake\.webmanifest|og\.jpg|x-banner\.jpg)/g;

export function rebase(code, base) {
  if (!base || base === "/") return code;
  const root = base.endsWith("/") ? base : `${base}/`;
  return code.replace(PUBLIC_PREFIX, (_m, q, rest) => `${q}${root}${rest}`);
}

export function gravewakePagesPlugin(base = process.env.GRAVEWAKE_BASE || "/") {
  return {
    name: "gravewake:pages-base",
    enforce: "pre",
    transform(code, id) {
      if (base === "/" || !/\/src\/.*\.(ts|tsx)$/.test(id.split("?")[0])) return null;
      const out = rebase(code, base);
      return out === code ? null : { code: out, map: null };
    },
  };
}
