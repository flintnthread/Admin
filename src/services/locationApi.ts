import { adminApiRequest } from "@/lib/api/client";

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
  [key: string]: unknown 
};

export type LocationCounts = {
  countries: number;
  states: number;
  cities: number;
  areas: number;
  pincodes: number;
};

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

export async function fetchAreas(cityId?: number, search?: string): Promise<LocationRow[]> {
  const q = new URLSearchParams();
  if (cityId != null) q.set("cityId", String(cityId));
  if (search) q.set("search", search);
  const qs = q.toString();
  return adminApiRequest(`/api/admin/locations/areas${qs ? `?${qs}` : ""}`);
}

export async function fetchPincodes(search?: string): Promise<LocationRow[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return adminApiRequest(`/api/admin/locations/pincodes${q}`);
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
