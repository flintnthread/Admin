import { resolvePublicMediaBaseUrl, resolveAdminApiBaseUrl } from "@/lib/api/config";
import { buildMediaUrlCandidates } from "@/lib/api/media";

export type CategoryImageFields = {
  mobileImage?: string | null;
  mobileimage?: string | null;
  mobile_image?: string | null;
  categoryImage?: string | null;
  bannerImage?: string | null;
  subcategoryImage?: string | null;
  image?: string | null;
};

/** Resolve a DB path or CDN URL for catalog images (categories / subcategories). */
export function resolveCatalogMediaUrl(
  path?: string | null,
  folder: "categories" | "subcategories" = "categories"
): string {
  if (!path?.trim()) return "";

  const value = path.trim();
  // Cloudinary absolute URLs — keep as-is (never rewrite onto admin / CDN hosts).
  if (/res\.cloudinary\.com/i.test(value) || /cloudinary\.com/i.test(value)) {
    return value;
  }
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    // Rewrite broken .in/.online catalog hosts onto public CDN
    try {
      const u = new URL(value);
      if (/\/uploads\/(categories|subcategories)\//i.test(u.pathname)) {
        return `${resolvePublicMediaBaseUrl().replace(/\/$/, "")}${u.pathname}${u.search || ""}`;
      }
    } catch {
      /* keep absolute */
    }
    return value;
  }

  // For local development, use API origin instead of public CDN
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const baseUrl = isLocalDev ? resolveAdminApiBaseUrl() : resolvePublicMediaBaseUrl();

  let normalized = value.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (!normalized.startsWith("/uploads/")) {
    const bare = normalized.replace(/^\/+/, "");
    normalized = bare.includes("/")
      ? `/${bare}`
      : `/uploads/${folder}/${bare}`;
  }

  // Local dev → admin API origin; production → public CDN
  return `${baseUrl.replace(/\/$/, "")}${normalized}`;
}

/** Pick the best display URL — mobile (Cloudinary) first, then desktop/banner. */
export function pickCategoryImageUrl(
  row: CategoryImageFields,
  folder: "categories" | "subcategories" = "categories"
): string {
  const ordered =
    folder === "subcategories"
      ? [row.mobileImage, row.mobileimage, row.mobile_image, row.subcategoryImage, row.categoryImage, row.image, row.bannerImage]
      : [row.mobileImage, row.mobileimage, row.mobile_image, row.categoryImage, row.bannerImage, row.image];

  for (const raw of ordered) {
    const url = resolveCatalogMediaUrl(raw, folder);
    if (url) return url;
  }
  return "";
}

/** Candidate URLs for Image onError fallback (CDN → API domain). */
export function categoryImageCandidates(
  row: CategoryImageFields,
  folder: "categories" | "subcategories" = "categories"
): string[] {
  const ordered =
    folder === "subcategories"
      ? [row.mobileImage, row.mobileimage, row.mobile_image, row.subcategoryImage, row.categoryImage, row.image, row.bannerImage]
      : [row.mobileImage, row.mobileimage, row.mobile_image, row.categoryImage, row.bannerImage, row.image];

  const urls: string[] = [];
  const push = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  for (const raw of ordered) {
    if (!raw?.trim()) continue;
    const value = raw.trim();
    if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
      push(resolveCatalogMediaUrl(value, folder) || value);
      continue;
    }
    let path = value.replace(/\\/g, "/");
    if (!path.includes("/")) path = `/uploads/${folder}/${path}`;
    else if (!path.startsWith("/uploads/") && !/^uploads\//i.test(path)) {
      path = `/uploads/${folder}/${path.replace(/^\/+/, "")}`;
    } else if (!path.startsWith("/")) path = `/${path}`;

    for (const candidate of buildMediaUrlCandidates(path, value)) {
      push(candidate);
    }
  }

  return urls;
}
