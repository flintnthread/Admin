import { adminApiRequest } from "@/lib/api/client";

export type CommissionRates = { b2c: string; b2b: string };

export type IntegrationSettings = {
  sendgridApiKeyConfigured: boolean;
  sendgridApiKeyMasked: string;
  twilioAccountSid: string;
  twilioAuthTokenConfigured: boolean;
  twilioAuthTokenMasked: string;
  twilioPhoneNumber: string;
};

export async function fetchCommissionRates(): Promise<CommissionRates> {
  return adminApiRequest("/api/admin/settings/commission");
}

export async function updateCommissionRates(b2c: string, b2b: string): Promise<CommissionRates> {
  return adminApiRequest("/api/admin/settings/commission", {
    method: "PUT",
    body: JSON.stringify({ b2c, b2b }),
  });
}

export async function fetchIntegrationSettings(): Promise<IntegrationSettings> {
  return adminApiRequest("/api/admin/settings/integrations");
}

export async function updateIntegrationSettings(payload: {
  sendgridApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
}): Promise<IntegrationSettings> {
  return adminApiRequest("/api/admin/settings/integrations", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
