import { adminApiRequest } from "@/lib/api/client";
import type { ContactMessage, PageResponse } from "@/lib/api/types";

export async function fetchContacts(page = 0, size = 20): Promise<PageResponse<ContactMessage>> {
  return adminApiRequest(`/api/admin/contacts?page=${page}&size=${size}`);
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
