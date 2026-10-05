// NextAuth validates callback URLs on the server; keep client-router targets
// local as well, including malformed or protocol-relative URLs.
export function getLocalRedirect(url: string, origin: string, fallback = "/") {
  try {
    const target = new URL(url, origin);
    if (
      target.origin !== origin ||
      !["http:", "https:"].includes(target.protocol) ||
      target.pathname.startsWith("//")
    ) return fallback;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
