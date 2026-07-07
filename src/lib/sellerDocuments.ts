import {
  buildMediaUrlCandidates,
  getSellerDocumentPlaceholderUrl,
  resolveSellerDocumentImageUrl,
} from "@/lib/api/media";
import type { SellerDocumentView } from "@/lib/mappers";

export const STANDARD_VERIFICATION_DOC_NAMES = [
  "Aadhaar Front",
  "Aadhaar Back",
  "PAN Card",
  "Cancelled Cheque",
  "Business Proof",
  "Bank Proof",
] as const;

export function withSellerDocumentUrl(doc: SellerDocumentView): SellerDocumentView {
  const rawPath = doc.path ?? doc.url ?? "";
  const hasSource = Boolean((doc.path ?? "").trim() || (doc.url ?? "").trim());
  return {
    ...doc,
    url: resolveSellerDocumentImageUrl(doc.path, doc.url),
    available: doc.available !== false && hasSource,
  };
}

export function mergeSellerVerificationDocuments(
  apiDocs: SellerDocumentView[],
): SellerDocumentView[] {
  const apiByName = new Map<string, SellerDocumentView>();
  for (const doc of apiDocs) {
    if (doc.name) apiByName.set(doc.name, doc);
  }

  const result: SellerDocumentView[] = [];

  for (const name of STANDARD_VERIFICATION_DOC_NAMES) {
    const apiDoc = apiByName.get(name);
    if (apiDoc) {
      result.push(withSellerDocumentUrl(apiDoc));
      apiByName.delete(name);
    } else {
      result.push({
        name,
        available: false,
        url: getSellerDocumentPlaceholderUrl(),
      });
    }
  }

  apiByName.forEach((apiDoc, name) => {
    if (/live selfie/i.test(name)) return;
    result.push(withSellerDocumentUrl(apiDoc));
  });

  return result;
}

export function mapLiveSelfieDocuments(apiDocs: SellerDocumentView[]): SellerDocumentView[] {
  if (!apiDocs.length) {
    return [
      {
        name: "Live Selfie",
        available: false,
        url: getSellerDocumentPlaceholderUrl(),
      },
    ];
  }
  return apiDocs.map((doc) => withSellerDocumentUrl(doc));
}

export function mapBusinessProofDocuments(apiDocs: SellerDocumentView[]): SellerDocumentView[] {
  if (!apiDocs.length) {
    return [
      {
        name: "Business Proof",
        available: false,
        url: getSellerDocumentPlaceholderUrl(),
      },
    ];
  }
  return apiDocs.map((doc) => withSellerDocumentUrl(doc));
}

export function buildSellerDocumentImageCandidates(
  path?: string | null,
  url?: string | null,
): string[] {
  const candidates = buildMediaUrlCandidates(path, url);
  const placeholder = getSellerDocumentPlaceholderUrl();
  if (!candidates.length) return [placeholder];
  if (!candidates.includes(placeholder)) candidates.push(placeholder);
  return candidates;
}
