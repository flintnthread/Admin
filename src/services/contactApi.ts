import { adminApiRequest } from "@/lib/api/client";
import type { ContactMessage, PageResponse } from "@/lib/api/types";

export async function fetchContacts(page = 0, size = 200): Promise<PageResponse<ContactMessage>> {
  return adminApiRequest(`/api/admin/contacts?page=${page}&size=${size}`);
}

export async function createContact(payload: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status?: "Unread" | "Read";
}): Promise<ContactMessage> {
  return adminApiRequest("/api/admin/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? "",
      subject: payload.subject,
      message: payload.message,
      status: payload.status === "Read",
    }),
  });
}

export async function fetchContactStats(): Promise<Record<string, number>> {
  return adminApiRequest("/api/admin/contacts/stats");
}

export async function fetchContact(id: number): Promise<ContactMessage> {
  return adminApiRequest(`/api/admin/contacts/${id}`);
}

export async function updateContactStatus(id: number, active: boolean): Promise<ContactMessage> {
  return adminApiRequest(`/api/admin/contacts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function replyContact(id: number, reply: string): Promise<ContactMessage> {
  return adminApiRequest(`/api/admin/contacts/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply }),
  });
}

export async function deleteContact(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/contacts/${id}`, { method: "DELETE" });
}
