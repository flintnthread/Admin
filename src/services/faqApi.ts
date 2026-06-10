import { adminApiRequest } from "@/lib/api/client";
import type { FaqCategory, FaqItem } from "@/lib/api/types";

export async function fetchFaqCategories(): Promise<FaqCategory[]> {
  return adminApiRequest("/api/admin/faq/categories");
}

export async function createFaqCategory(data: Partial<FaqCategory>): Promise<FaqCategory> {
  return adminApiRequest("/api/admin/faq/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFaqCategory(id: number, data: Partial<FaqCategory>): Promise<FaqCategory> {
  return adminApiRequest(`/api/admin/faq/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFaqCategory(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/faq/categories/${id}`, { method: "DELETE" });
}

export async function fetchFaqs(categoryId: number): Promise<FaqItem[]> {
  return adminApiRequest(`/api/admin/faq/categories/${categoryId}/faqs`);
}

export async function createFaq(categoryId: number, data: Partial<FaqItem>): Promise<FaqItem> {
  return adminApiRequest(`/api/admin/faq/categories/${categoryId}/faqs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFaq(categoryId: number, faqId: number, data: Partial<FaqItem>): Promise<FaqItem> {
  return adminApiRequest(`/api/admin/faq/categories/${categoryId}/faqs/${faqId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFaq(categoryId: number, faqId: number): Promise<void> {
  await adminApiRequest(`/api/admin/faq/categories/${categoryId}/faqs/${faqId}`, { method: "DELETE" });
}
