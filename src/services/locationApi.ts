import { adminApiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/lib/api/types";

export type LocationRow = {
  id: number;
  name?: string;
  pincode?: string;
  code?: string;
  countryId?: number;
  countryName?: string;
  stateId?: number;
  stateName?: string;
  cityId?: number;
  cityName?: string;
  areaId?: number;
  parentId?: number;
  parentName?: string;
  active?: boolean;
  cityCount?: number;
  areaCount?: number;
  pincodeCount?: number;
  [key: string]: unknown;
};

export type LocationCounts = {
  countries: number;
  states: number;
  cities: number;
  areas: number;
  pincodes: number;
};

export type LocationListParams = {
  search?: string;
  page?: number;
  size?: number;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  areaId?: number;
};

const PAGE_FETCH_SIZE = 500;

function normalizePageResponse<T>(raw: unknown): PageResponse<T> {
  if (raw && typeof raw === "object" && Array.isArray((raw as PageResponse<T>).items)) {
    const page = raw as PageResponse<T>;
    return {
      items: page.items ?? [],
      totalElements: Number(page.totalElements ?? page.items?.length ?? 0),
      totalPages: Number(page.totalPages ?? 1),
      page: Number(page.page ?? 0),
      size: Number(page.size ?? page.items?.length ?? 0),
    };
  }
  // Backward-compatible: older APIs returned a bare array
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      totalElements: raw.length,
      totalPages: 1,
      page: 0,
      size: raw.length,
    };
  }
  return { items: [], totalElements: 0, totalPages: 0, page: 0, size: 0 };
}

async function fetchAllPages(
  fetchPage: (page: number, size: number) => Promise<PageResponse<LocationRow>>
): Promise<LocationRow[]> {
  const all: LocationRow[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const result = await fetchPage(page, PAGE_FETCH_SIZE);
    all.push(...result.items);
    totalPages = Math.max(result.totalPages, 1);
    if (result.items.length === 0) break;
    page += 1;
    // Safety: stop if API misreports totalPages but keeps returning data forever
    if (page > 200) break;
  }
  return all;
}

export async function fetchCountriesPage(params: LocationListParams = {}): Promise<PageResponse<LocationRow>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  const raw = await adminApiRequest(`/api/admin/locations/countries?${q.toString()}`);
  return normalizePageResponse<LocationRow>(raw);
}

export async function fetchStatesPage(params: LocationListParams = {}): Promise<PageResponse<LocationRow>> {
  const q = new URLSearchParams();
  if (params.countryId != null) q.set("countryId", String(params.countryId));
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  const raw = await adminApiRequest(`/api/admin/locations/states?${q.toString()}`);
  return normalizePageResponse<LocationRow>(raw);
}

export async function fetchCitiesPage(params: LocationListParams = {}): Promise<PageResponse<LocationRow>> {
  const q = new URLSearchParams();
  if (params.stateId != null) q.set("stateId", String(params.stateId));
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  const raw = await adminApiRequest(`/api/admin/locations/cities?${q.toString()}`);
  return normalizePageResponse<LocationRow>(raw);
}

export async function fetchAreasPage(params: LocationListParams = {}): Promise<PageResponse<LocationRow>> {
  const q = new URLSearchParams();
  if (params.cityId != null) q.set("cityId", String(params.cityId));
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  const raw = await adminApiRequest(`/api/admin/locations/areas?${q.toString()}`);
  return normalizePageResponse<LocationRow>(raw);
}

export async function fetchPincodesPage(params: LocationListParams = {}): Promise<PageResponse<LocationRow>> {
  const q = new URLSearchParams();
  if (params.cityId != null) q.set("cityId", String(params.cityId));
  if (params.areaId != null) q.set("areaId", String(params.areaId));
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  const raw = await adminApiRequest(`/api/admin/locations/pincodes?${q.toString()}`);
  return normalizePageResponse<LocationRow>(raw);
}

/** Loads every country by paging through the API (no hard cap). */
export async function fetchCountries(search?: string): Promise<LocationRow[]> {
  return fetchAllPages((page, size) => fetchCountriesPage({ search, page, size }));
}

export async function fetchStates(countryId?: number, search?: string): Promise<LocationRow[]> {
  return fetchAllPages((page, size) => fetchStatesPage({ countryId, search, page, size }));
}

export async function fetchCities(stateId?: number, search?: string): Promise<LocationRow[]> {
  return fetchAllPages((page, size) => fetchCitiesPage({ stateId, search, page, size }));
}

export async function fetchAreas(cityId?: number, search?: string): Promise<LocationRow[]> {
  return fetchAllPages((page, size) => fetchAreasPage({ cityId, search, page, size }));
}

export async function fetchPincodes(
  search?: string,
  filters?: { cityId?: number; areaId?: number }
): Promise<LocationRow[]> {
  return fetchAllPages((page, size) =>
    fetchPincodesPage({ search, cityId: filters?.cityId, areaId: filters?.areaId, page, size })
  );
}

export async function fetchLocationCounts(): Promise<LocationCounts> {
  return adminApiRequest("/api/admin/locations/counts");
}

export async function createCountry(
  name: string,
  code: string,
  active = true
): Promise<LocationRow> {
  return adminApiRequest("/api/admin/locations/countries", {
    method: "POST",
    body: JSON.stringify({ name, code, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function createState(
  countryId: number,
  name: string,
  active = true
): Promise<LocationRow> {
  return adminApiRequest("/api/admin/locations/states", {
    method: "POST",
    body: JSON.stringify({ countryId, name, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function createCity(
  stateId: number,
  name: string,
  active = true
): Promise<LocationRow> {
  return adminApiRequest("/api/admin/locations/cities", {
    method: "POST",
    body: JSON.stringify({ stateId, name, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function createArea(
  cityId: number,
  name: string,
  active = true
): Promise<LocationRow> {
  return adminApiRequest("/api/admin/locations/areas", {
    method: "POST",
    body: JSON.stringify({ cityId, name, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function createPincode(
  areaId: number,
  pincode: string,
  active = true
): Promise<LocationRow> {
  return adminApiRequest("/api/admin/locations/pincodes", {
    method: "POST",
    body: JSON.stringify({ areaId, pincode, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function updateCountry(
  id: number,
  name: string,
  code: string,
  active = true
): Promise<void> {
  await adminApiRequest(`/api/admin/locations/countries/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, code, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function updateState(id: number, name: string, active = true): Promise<void> {
  await adminApiRequest(`/api/admin/locations/states/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function updateCity(id: number, name: string, active = true): Promise<void> {
  await adminApiRequest(`/api/admin/locations/cities/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function updateArea(id: number, name: string, active = true): Promise<void> {
  await adminApiRequest(`/api/admin/locations/areas/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function updatePincode(id: number, pincode: string, active = true): Promise<void> {
  await adminApiRequest(`/api/admin/locations/pincodes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ pincode, active, status: active ? "Active" : "Inactive" }),
  });
}

export async function deleteCountry(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/locations/countries/${id}`, {
    method: "DELETE",
  });
}

export async function deleteState(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/locations/states/${id}`, {
    method: "DELETE",
  });
}

export async function deleteCity(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/locations/cities/${id}`, {
    method: "DELETE",
  });
}

export async function deleteArea(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/locations/areas/${id}`, {
    method: "DELETE",
  });
}

export async function deletePincode(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/locations/pincodes/${id}`, {
    method: "DELETE",
  });
}
