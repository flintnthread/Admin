import { adminApiRequest } from "@/lib/api/client";

export type EmailBroadcastResult = {
  sent?: number;
  failed?: number;
  total?: number;
  message?: string;
  errors?: string[];
};

export async function sendCustomerEmails(body: {
  subject: string;
  message: string;
  sendAll?: boolean;
  recipients?: number[];
  emails?: string[];
}): Promise<EmailBroadcastResult> {
  return adminApiRequest("/api/admin/emails/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function sendSellerEmails(body: {
  subject: string;
  message: string;
  sendAll?: boolean;
  recipients?: number[];
  emails?: string[];
}): Promise<EmailBroadcastResult> {
  return adminApiRequest("/api/admin/emails/sellers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
