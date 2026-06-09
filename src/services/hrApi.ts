import { adminApiRequest } from "@/lib/api/client";
import type { Department, JobApplication, JobOpening, PageResponse } from "@/lib/api/types";

export async function fetchDepartments(): Promise<Department[]> {
  return adminApiRequest("/api/admin/departments");
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

export async function fetchJobs(): Promise<JobOpening[]> {
  return adminApiRequest("/api/admin/jobs");
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
  return adminApiRequest(`/api/admin/job-applications?${q}`);
}

export async function updateJobApplicationStatus(id: number, status: string): Promise<JobApplication> {
  return adminApiRequest(`/api/admin/job-applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
