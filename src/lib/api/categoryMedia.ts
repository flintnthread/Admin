import { buildMediaUrlCandidates, resolveMediaUrl } from "@/lib/api/media";

export type CategoryImageFields = {
  mobileImage?: string | null;
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
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;

  let normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("/uploads/") || /^uploads\//i.test(normalized)) {
    if (!normalized.startsWith("/")) normalized = `/${normalized}`;
    return resolveMediaUrl(normalized);
  }

  const bare = normalized.replace(/^\/+/, "");
  if (!bare.includes("/")) {
    return resolveMediaUrl(`/uploads/${folder}/${bare}`);
  }

  return resolveMediaUrl(`/${bare}`);
}

/** Pick the best display URL — mobile (Cloudinary) first, then desktop/banner. */
export function pickCategoryImageUrl(
  row: CategoryImageFields,
  folder: "categories" | "subcategories" = "categories"
): string {
  const ordered =
    folder === "subcategories"
      ? [row.mobileImage, row.subcategoryImage, row.categoryImage, row.image, row.bannerImage]
      : [row.mobileImage, row.categoryImage, row.bannerImage, row.image];

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
      ? [row.mobileImage, row.subcategoryImage, row.categoryImage, row.image, row.bannerImage]
      : [row.mobileImage, row.categoryImage, row.bannerImage, row.image];

  const urls: string[] = [];
  const push = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  for (const raw of ordered) {
    if (!raw?.trim()) continue;
    const value = raw.trim();
    if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
      push(value);
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
