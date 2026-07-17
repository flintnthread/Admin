import { resolveAdminApiBaseUrl, resolvePublicMediaBaseUrl } from "@/lib/api/config";

const SELLER_DOCUMENT_FILE =
  /^\d+_(profile_pic|aadhar_front|aadhar_back|pan_card|business_proof|bank_proof|cancelled_cheque|live_selfie|company_pan_doc|incorporation_certificate|partnership_deed|msme_certificate|iec_certificate)(_|\.)/i;

function isSellerDocumentFileName(fileName: string): boolean {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  return SELLER_DOCUMENT_FILE.test(base);
}

function sellerDocumentPath(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").trim().split("/").pop() ?? "";
  return `/uploads/seller_documents/${base}`;
}

/** Normalize DB/media paths to a URL path segment (always starts with /). */
export function normalizeMediaPath(value: string): string {
  const p = value.replace(/\\/g, "/").trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      return normalizeMediaPath(new URL(p).pathname || "");
    } catch {
      return "";
    }
  }
  let bare = p.startsWith("/") && !p.startsWith("/uploads/") ? p.slice(1) : p;

  // Legacy/corrupted DB paths (e.g. ads/products → uploads/products)
  bare = bare.replace(/^(ads|pads)\/products\//i, "uploads/products/");

  if (bare.startsWith("/uploads/sellers/")) {
    const fileName = bare.slice("/uploads/sellers/".length);
    if (isSellerDocumentFileName(fileName)) return sellerDocumentPath(fileName);
    return bare;
  }
  if (bare.startsWith("/")) return bare;
  if (bare.startsWith("uploads/sellers/")) {
    const fileName = bare.slice("uploads/sellers/".length);
    if (isSellerDocumentFileName(fileName)) return sellerDocumentPath(fileName);
    return `/${bare}`;
  }
  if (bare.startsWith("uploads/seller_documents/")) return `/${bare}`;
  if (bare.startsWith("uploads/")) return `/${bare}`;
  if (isSellerDocumentFileName(bare)) return sellerDocumentPath(bare);
  if (!bare.includes("/")) return `/uploads/sellers/${bare}`;
  return `/${bare}`;
}

/**
 * Resolve to CDN URL (app.media.public-base-url = https://flintnthread.in).
 * Seller docs/profile → https://flintnthread.in/uploads/seller_documents/...
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path?.trim()) return "";

  const value = path.trim();
  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    if (/res\.cloudinary\.com|cloudinary\.com/i.test(value)) {
      return value;
    }
    try {
      const pathname = new URL(value).pathname || "";
      if (pathname.includes("/uploads/")) {
        return `${resolvePublicMediaBaseUrl()}${normalizeMediaPath(pathname)}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  return `${resolvePublicMediaBaseUrl()}${normalizeMediaPath(value)}`;
}

/** Local admin-backend fallback (redirects to CDN when file missing on disk). */
export function resolveAdminMediaUrl(path?: string | null): string {
  if (!path?.trim()) return "";
  const value = path.trim();
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    try {
      const url = new URL(value);
      return `${resolveAdminApiBaseUrl()}${normalizeMediaPath(url.pathname)}`;
    } catch {
      return "";
    }
  }
  return `${resolveAdminApiBaseUrl()}${normalizeMediaPath(value)}`;
}

/** CDN first (production), admin-backend fallback (local dev). */
export function buildMediaUrlCandidates(
  path?: string | null,
  cdnUrl?: string | null,
): string[] {
  const urls: string[] = [];
  const push = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  push(resolveMediaUrl(cdnUrl));
  push(resolveMediaUrl(path));
  push(resolveAdminMediaUrl(path));
  push(resolveAdminMediaUrl(cdnUrl));

  return urls;
}

/** Seller list/detail: API profilePicUrl (CDN) → profile_pic path → live_selfie. */
export function buildSellerImageCandidates(seller: {
  profilePicUrl?: string | null;
  profilePicPath?: string | null;
  liveSelfiePath?: string | null;
}): string[] {
  const urls: string[] = [];
  const push = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  for (const entry of buildMediaUrlCandidates(seller.profilePicPath, seller.profilePicUrl)) {
    push(entry);
  }
  for (const entry of buildMediaUrlCandidates(seller.liveSelfiePath, null)) {
    push(entry);
  }

  return urls;
}

/** Primary seller profile image URL (CDN from backend). */
export function resolveSellerProfileImage(seller: {
  profilePicUrl?: string | null;
  profilePicPath?: string | null;
  liveSelfiePath?: string | null;
}): string {
  return (
    resolveMediaUrl(seller.profilePicUrl) ||
    resolveMediaUrl(seller.profilePicPath) ||
    resolveMediaUrl(seller.liveSelfiePath) ||
    buildSellerImageCandidates(seller)[0] ||
    ""
  );
}

export function isPdfMedia(path?: string | null): boolean {
  if (!path?.trim()) return false;
  return /\.pdf($|\?)/i.test(path.trim());
}

export function getPublicMediaBaseUrl(): string {
  return resolvePublicMediaBaseUrl();
}

/**
 * Product approval / catalog images.
 * Cloudinary absolute URLs are used as-is; relative /uploads paths go through admin media.
 */
export function resolveProductImageUrl(path?: string | null): string {
  if (!path?.trim()) return "";
  const value = path.trim();

  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  // Cloudinary (or any absolute https without /uploads) — never rewrite
  if (/^https?:\/\//i.test(value)) {
    if (/res\.cloudinary\.com|cloudinary\.com/i.test(value) || !/\/uploads\//i.test(value)) {
      return value;
    }
    try {
      const pathname = new URL(value).pathname || "";
      if (pathname.includes("/uploads/products/")) {
        return `${resolveAdminApiBaseUrl()}${normalizeMediaPath(pathname)}`;
      }
      // Seller docs / profile still use CDN
      if (
        pathname.includes("/uploads/seller_documents/") ||
        pathname.includes("/uploads/sellers/") ||
        pathname.includes("/uploads/kyc_images/")
      ) {
        return `${resolvePublicMediaBaseUrl()}${normalizeMediaPath(pathname)}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  const pathname = normalizeMediaPath(value);
  if (pathname.includes("/uploads/products/")) {
    return `${resolveAdminApiBaseUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  }

  return resolveMediaUrl(value);
}

/** Placeholder when a seller document / live selfie image is missing or fails to load. */
export function getSellerDocumentPlaceholderUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SELLER_DOCUMENT_PLACEHOLDER_URL?.trim();
  if (fromEnv) return fromEnv;
  return `${resolvePublicMediaBaseUrl()}/uploads/seller_documents/document_placeholder.png`;
}

/**
 * Resolve seller KYC / document image to CDN URL
 * (https://flintnthread.in/uploads/seller_documents/...).
 * Falls back to placeholder when path and backend URL are empty.
 */
export function resolveSellerDocumentImageUrl(
  path?: string | null,
  backendUrl?: string | null,
): string {
  const resolved = buildMediaUrlCandidates(path, backendUrl)[0];
  return resolved || getSellerDocumentPlaceholderUrl();
}
