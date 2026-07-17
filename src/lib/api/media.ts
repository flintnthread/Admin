import { resolveAdminApiBaseUrl, resolvePublicMediaBaseUrl } from "@/lib/api/config";

/** Seller profile + KYC docs CDN — ONLY host for /uploads/seller_documents/. */
export const SELLER_MEDIA_CDN = "https://flintnthread.com";

/** Product images CDN — ONLY host for /uploads/products/. */
export const PRODUCT_MEDIA_CDN = "https://flintnthread.com";

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

function isSellerDocUploadPath(pathname: string): boolean {
  return (
    pathname.includes("/uploads/seller_documents/") ||
    pathname.includes("/uploads/sellers/") ||
    pathname.includes("/uploads/kyc_images/")
  );
}

/** Force seller docs onto flintnthread.com (rewrite .in / .online). */
function toSellerMediaCdnUrl(pathname: string): string {
  const path = normalizeMediaPath(pathname);
  return `${SELLER_MEDIA_CDN}${path.startsWith("/") ? path : `/${path}`}`;
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
 * Resolve to CDN URL.
 * Seller docs/profile → https://flintnthread.com/uploads/seller_documents/...
 * Products → https://flintnthread.com/uploads/products/...
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path?.trim()) return "";

  const value = path.trim();
  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    if (/res\.cloudinary\.com/i.test(value)) {
      return value;
    }
    try {
      const pathname = new URL(value).pathname || "";
      if (pathname.includes("/uploads/products/")) {
        return `${PRODUCT_MEDIA_CDN}${normalizeMediaPath(pathname)}`;
      }
      if (isSellerDocUploadPath(pathname) || pathname.includes("/uploads/")) {
        return toSellerMediaCdnUrl(pathname);
      }
    } catch {
      return value;
    }
    return value;
  }

  const normalized = normalizeMediaPath(value);
  if (normalized.includes("/uploads/products/")) {
    return `${PRODUCT_MEDIA_CDN}${normalized}`;
  }
  if (isSellerDocUploadPath(normalized) || normalized.includes("/uploads/")) {
    return toSellerMediaCdnUrl(normalized);
  }
  return `${SELLER_MEDIA_CDN}${normalized}`;
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

/** Cloudinary thumbnails for faster admin product grids. */
export function optimizeProductImageUrl(url: string, width = 420): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed || !/res\.cloudinary\.com/i.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.*)$/i
  );
  if (!match) return trimmed;

  const [, prefix, rest] = match;
  if (/^(w_|c_|q_|f_|h_|ar_|g_)/i.test(rest)) return trimmed;

  const transform = `w_${width},q_auto,f_auto`;
  return `${prefix}${transform}/${rest}`;
}

/**
 * Product approval / catalog images.
 * Product files ALWAYS use https://flintnthread.com/uploads/products/...
 * Cloudinary absolute URLs are used as-is.
 */
export function resolveProductImageUrl(path?: string | null): string {
  if (!path?.trim()) return "";
  const value = path.trim();

  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    if (/res\.cloudinary\.com/i.test(value)) {
      return optimizeProductImageUrl(value);
    }
    try {
      const pathname = new URL(value).pathname || "";
      if (pathname.includes("/uploads/products/")) {
        return `${PRODUCT_MEDIA_CDN}${normalizeMediaPath(pathname)}`;
      }
      if (isSellerDocUploadPath(pathname)) {
        return toSellerMediaCdnUrl(pathname);
      }
    } catch {
      return value;
    }
    return value;
  }

  const pathname = normalizeMediaPath(value);
  if (pathname.includes("/uploads/products/")) {
    return `${PRODUCT_MEDIA_CDN}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  }

  return resolveMediaUrl(value);
}

/** Placeholder when a seller document / live selfie image is missing or fails to load. */
export function getSellerDocumentPlaceholderUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SELLER_DOCUMENT_PLACEHOLDER_URL?.trim();
  if (fromEnv) return fromEnv;
  return `${SELLER_MEDIA_CDN}/uploads/seller_documents/document_placeholder.png`;
}

/**
 * Resolve seller KYC / document / profile image to CDN URL
 * (https://flintnthread.com/uploads/seller_documents/...).
 * Falls back to placeholder when path and backend URL are empty.
 */
export function resolveSellerDocumentImageUrl(
  path?: string | null,
  backendUrl?: string | null,
): string {
  const fromPath = resolveMediaUrl(path);
  if (fromPath) return fromPath;
  const fromBackend = resolveMediaUrl(backendUrl);
  if (fromBackend) return fromBackend;
  const candidates = buildMediaUrlCandidates(path, backendUrl);
  return candidates[0] || getSellerDocumentPlaceholderUrl();
}
