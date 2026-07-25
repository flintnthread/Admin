/**
 * Ensures the FT brand favicon is set in the browser tab (web only).
 * Call once from root layout — helps after deploy / cache / SPA navigations.
 */
export function ensureWebFavicon(href = "/favicon.png"): void {
  if (typeof document === "undefined") return;

  const selectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
    "link[rel='apple-touch-icon']",
  ];

  for (const selector of selectors) {
    let link = document.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      const rel = selector.includes("apple")
        ? "apple-touch-icon"
        : selector.includes("shortcut")
          ? "shortcut icon"
          : "icon";
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.type = "image/png";
    // Cache-bust so browsers drop the old generic globe icon.
    link.href = `${href}?v=ft-logo`;
  }

  if (!document.title || document.title.toLowerCase().includes("myadminapp") || document.title.toLowerCase() === "fntseller") {
    // leave title to +html / screens unless it's the Expo default
  }
}
