import { adminApiRequest } from "@/lib/api/client";
import type { Department, JobApplication, JobOpening, PageResponse } from "@/lib/api/types";

function normalizePageResponse<T>(raw: unknown): PageResponse<T> {
  const page = (raw ?? {}) as Record<string, unknown>;
  const items = (page.items ?? page.content ?? []) as T[];
  return {
    items: Array.isArray(items) ? items : [],
    totalElements: Number(page.totalElements ?? page.total ?? items.length ?? 0),
    totalPages: Number(page.totalPages ?? 0),
    page: Number(page.page ?? 0),
    size: Number(page.size ?? items.length ?? 0),
  };
}

export async function fetchDepartments(): Promise<Department[]> {
  const raw = await adminApiRequest<unknown>("/api/admin/departments");
  if (Array.isArray(raw)) return raw as Department[];
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as Department[];
    if (Array.isArray(record.data)) return record.data as Department[];
  }
  return [];
}

export async function fetchJobs(): Promise<JobOpening[]> {
  const raw = await adminApiRequest<unknown>("/api/admin/jobs");
  if (Array.isArray(raw)) return raw as JobOpening[];
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as JobOpening[];
    if (Array.isArray(record.data)) return record.data as JobOpening[];
  }
  return [];
}

export async function createDepartment(data: Partial<Department>): Promise<Department> {
  return adminApiRequest("/api/admin/departments", { method: "POST", body: JSON.stringify(data) });
}

export async function updateDepartment(id: number, data: Partial<Department>): Promise<Department> {
  return adminApiRequest(`/api/admin/departments/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteDepartment(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/departments/${id}`, { method: "DELETE" });
}

export async function createJob(data: Partial<JobOpening>): Promise<JobOpening> {
  return adminApiRequest("/api/admin/jobs", { method: "POST", body: JSON.stringify(data) });
}

export async function updateJob(id: number, data: Partial<JobOpening>): Promise<JobOpening> {
  return adminApiRequest(`/api/admin/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteJob(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/jobs/${id}`, { method: "DELETE" });
}

export async function fetchJobApplications(jobId?: number, page = 0, size = 20): Promise<PageResponse<JobApplication>> {
  const q = new URLSearchParams();
  if (jobId != null) q.set("jobId", String(jobId));
  q.set("page", String(page));
  q.set("size", String(size));
  const raw = await adminApiRequest<unknown>(`/api/admin/job-applications?${q}`);
  return normalizePageResponse<JobApplication>(raw);
}

export async function updateJobApplicationStatus(id: number, status: string): Promise<JobApplication> {
  return adminApiRequest(`/api/admin/job-applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
