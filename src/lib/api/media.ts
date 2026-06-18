import { resolveAdminApiBaseUrl, resolvePublicMediaBaseUrl } from "@/lib/api/config";

/** Normalize DB/media paths to a URL path segment (always starts with /). */
export function normalizeMediaPath(value: string): string {
  const p = value.replace(/\\/g, "/").trim();
  if (!p) return "";
  if (p.startsWith("/")) return p;
  if (p.startsWith("uploads/")) return `/${p}`;
  // Bare seller filenames (profile_pic, bank_proof, etc.)
  if (!p.includes("/")) return `/uploads/sellers/${p}`;
  return `/${p}`;
}

/**
 * Resolve any media URL from the API or raw DB path.
 * Absolute https://flintnthread.in/... URLs from the backend are used as-is.
 * Relative paths are prefixed with EXPO_PUBLIC_MEDIA_BASE_URL (default https://flintnthread.in).
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path?.trim()) return "";

  const value = path.trim();
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    return value;
  }

  return `${resolvePublicMediaBaseUrl()}${normalizeMediaPath(value)}`;
}

/** Serve uploads from admin-backend when CDN is unavailable (local dev). */
export function resolveAdminMediaUrl(path?: string | null): string {
  if (!path?.trim()) return "";
  const value = path.trim();
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    try {
      const url = new URL(value);
      return `${resolveAdminApiBaseUrl()}${url.pathname}`;
    } catch {
      return "";
    }
  }
  return `${resolveAdminApiBaseUrl()}${normalizeMediaPath(value)}`;
}

/** Ordered image URL candidates: CDN first, then admin-backend local uploads. */
export function buildSellerImageCandidates(seller: {
  profilePicUrl?: string | null;
  profilePicPath?: string | null;
  liveSelfiePath?: string | null;
}): string[] {
  const urls: string[] = [];
  const push = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  push(resolveMediaUrl(seller.profilePicUrl));
  push(resolveMediaUrl(seller.profilePicPath));
  push(resolveMediaUrl(seller.liveSelfiePath));
  push(resolveAdminMediaUrl(seller.profilePicPath));
  push(resolveAdminMediaUrl(seller.liveSelfiePath));
  push(resolveAdminMediaUrl(seller.profilePicUrl));

  return urls;
}

/** Seller list/detail: profile_pic → live_selfie → API profilePicUrl. */
export function resolveSellerProfileImage(seller: {
  profilePicUrl?: string | null;
  profilePicPath?: string | null;
  liveSelfiePath?: string | null;
}): string {
  return buildSellerImageCandidates(seller)[0] ?? "";
}
