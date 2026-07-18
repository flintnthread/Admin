import { adminApiRequest } from "@/lib/api/client";
import { resolveAdminApiBaseUrl } from "@/lib/api/config";
import { getAdminToken } from "@/lib/api/session";

export type CmsRow = Record<string, unknown>;

function mediaUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = resolveAdminApiBaseUrl().replace(/\/$/, "");
  let p = path.replace(/\\/g, "/").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.startsWith("/uploads/")) return `${base}${p}`;
  return `${base}/uploads/cms/${p.replace(/^\/+/, "")}`;
}

export function resolveCmsMediaUrl(path?: string | null): string {
  return mediaUrl(path);
}

// Homepage banners
export async function fetchHomepageBanners(section?: string): Promise<CmsRow[]> {
  const q = section ? `?section=${encodeURIComponent(section)}` : "";
  return adminApiRequest(`/api/admin/cms/homepage-banners${q}`);
}

export async function createHomepageBanner(body: CmsRow): Promise<CmsRow> {
  return adminApiRequest("/api/admin/cms/homepage-banners", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateHomepageBanner(id: number, body: CmsRow): Promise<CmsRow> {
  return adminApiRequest(`/api/admin/cms/homepage-banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteHomepageBanner(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/cms/homepage-banners/${id}`, { method: "DELETE" });
}

// General banners
export async function fetchGeneralBanners(params?: {
  search?: string;
  status?: string | number;
}): Promise<CmsRow[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status != null && params.status !== "") q.set("status", String(params.status));
  const qs = q.toString();
  return adminApiRequest(`/api/admin/cms/general-banners${qs ? `?${qs}` : ""}`);
}

export async function createGeneralBanner(body: CmsRow): Promise<CmsRow> {
  return adminApiRequest("/api/admin/cms/general-banners", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateGeneralBanner(id: number, body: CmsRow): Promise<CmsRow> {
  return adminApiRequest(`/api/admin/cms/general-banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteGeneralBanner(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/cms/general-banners/${id}`, { method: "DELETE" });
}

export async function uploadGeneralBannerImage(file: Blob, fileName = "banner.jpg"): Promise<CmsRow> {
  const form = new FormData();
  form.append("file", file, fileName);
  return adminApiRequest("/api/admin/cms/general-banners/upload", {
    method: "POST",
    body: form,
  });
}

// Logos
export async function fetchSiteLogos(): Promise<CmsRow> {
  return adminApiRequest("/api/admin/cms/logos");
}

export async function updateSiteLogos(body: {
  logoDark?: string;
  logoLight?: string;
  favicon?: string;
}): Promise<CmsRow> {
  return adminApiRequest("/api/admin/cms/logos", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function uploadSiteLogo(
  slot: "dark" | "light" | "favicon",
  file: Blob,
  fileName = "logo.png",
): Promise<CmsRow> {
  const form = new FormData();
  form.append("file", file, fileName);
  return adminApiRequest(`/api/admin/cms/logos/upload?slot=${encodeURIComponent(slot)}`, {
    method: "POST",
    body: form,
  });
}

/** For data-URL uploads from document picker on web */
export async function uploadSiteLogoFromDataUrl(
  slot: "dark" | "light" | "favicon",
  dataUrl: string,
  fileName = "logo.png",
): Promise<CmsRow> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return uploadSiteLogo(slot, blob, fileName);
}

// Homepage sections
export async function fetchHomepageSections(): Promise<{ key: string; value: string }[]> {
  const rows = await adminApiRequest<CmsRow[]>("/api/admin/cms/homepage-sections");
  return (rows ?? []).map((r) => ({
    key: String(r.key ?? r.settingKey ?? ""),
    value: String(r.value ?? r.settingValue ?? "0"),
  }));
}

export async function saveHomepageSections(
  items: { key: string; value: string | number | boolean }[],
): Promise<CmsRow[]> {
  const payload = items.map((item) => ({
    key: item.key,
    value:
      typeof item.value === "boolean"
        ? item.value
          ? "1"
          : "0"
        : String(item.value),
  }));
  return adminApiRequest("/api/admin/cms/homepage-sections", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export const SECTION_UI_TO_KEY: Record<string, string> = {
  "wmk-tabs": "homepage_sec_tabs_women_men_kids",
  "sfa-tabs": "homepage_sec_tabs_sports_footwear_acc",
  "latest-products": "homepage_sec_latest_products",
  "featured-products": "homepage_sec_featured_products",
  "mostly-viewed-ordered": "homepage_sec_mostly_viewed_ordered",
  "womens-collection": "homepage_sec_womens_collection",
  "mens-collection": "homepage_sec_mens_collection",
  "kids-collection": "homepage_sec_kids_collection",
  "footwear-collection": "homepage_sec_footwear_collection",
  "sports-collection": "homepage_sec_sports_wear_collection",
  "accessories-collection": "homepage_sec_accessories_collection",
};

export function isSectionVisible(value?: string): boolean {
  const v = String(value ?? "0").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Helper when auth header is needed for raw fetch of media (usually public path). */
export function cmsAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
