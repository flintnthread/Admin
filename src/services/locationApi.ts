import { adminApiRequest } from "@/lib/api/client";

export type LocationRow = { id: number; name?: string; [key: string]: unknown };

export async function fetchCountries(search?: string): Promise<LocationRow[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return adminApiRequest(`/api/admin/locations/countries${q}`);
}

export async function fetchStates(countryId?: number, search?: string): Promise<LocationRow[]> {
  const q = new URLSearchParams();
  if (countryId != null) q.set("countryId", String(countryId));
  if (search) q.set("search", search);
  const qs = q.toString();
  return adminApiRequest(`/api/admin/locations/states${qs ? `?${qs}` : ""}`);
}

export async function fetchCities(stateId?: number, search?: string): Promise<LocationRow[]> {
  const q = new URLSearchParams();
  if (stateId != null) q.set("stateId", String(stateId));
  if (search) q.set("search", search);
  const qs = q.toString();
  return adminApiRequest(`/api/admin/locations/cities${qs ? `?${qs}` : ""}`);
}

export async function fetchPincodes(search?: string): Promise<LocationRow[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return adminApiRequest(`/api/admin/locations/pincodes${q}`);
}
