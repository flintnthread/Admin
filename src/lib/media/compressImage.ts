/**
 * Resize + JPEG-compress an image for upload.
 * Targets well under nginx's common 1MB default (multipart overhead included).
 */
const DEFAULT_MAX_EDGE = 1200;
const DEFAULT_MAX_BYTES = 450_000;
const MIN_QUALITY = 0.38;
const MIN_EDGE = 320;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for compression."));
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(new Error("Failed to read compressed image."));
    reader.readAsDataURL(blob);
  });
}

export type CompressedImage = {
  file: File;
  previewUrl: string;
};

export async function compressImageFile(
  source: Blob | File,
  options?: { maxEdge?: number; maxBytes?: number; fileName?: string }
): Promise<CompressedImage> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const srcName =
    source instanceof File && source.name
      ? source.name
      : options?.fileName ?? "category.jpg";
  const baseName = srcName.replace(/\.[^.]+$/, "") || "category";

  // No DOM canvas (native) — pass through when already a File.
  if (typeof document === "undefined") {
    const file =
      source instanceof File
        ? source
        : new File([source], `${baseName}.jpg`, { type: source.type || "image/jpeg" });
    const previewUrl = await blobToDataUrl(file);
    return { file, previewUrl };
  }

  // Already small enough — skip re-encode when possible.
  if (
    source instanceof Blob &&
    source.size <= maxBytes &&
    (source.type === "image/jpeg" || source.type === "image/jpg")
  ) {
    const file =
      source instanceof File
        ? source
        : new File([source], `${baseName}.jpg`, { type: "image/jpeg" });
    return { file, previewUrl: await blobToDataUrl(file) };
  }

  const objectUrl = URL.createObjectURL(source);
  try {
    const img = await loadImage(objectUrl);
    let edge = maxEdge;
    let blob: Blob | null = null;

    while (edge >= MIN_EDGE) {
      const scale = Math.min(
        1,
        edge / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1)
      );
      const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process image.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.78;
      while (quality >= MIN_QUALITY) {
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= maxBytes) break;
        quality -= 0.08;
      }
      if (blob && blob.size <= maxBytes) break;
      edge = Math.round(edge * 0.7);
    }

    if (!blob) throw new Error("Could not compress image.");

    // Last-resort: keep shrinking until under limit or floor.
    let finalBlob = blob;
    if (finalBlob.size > maxBytes) {
      let edge2 = Math.min(maxEdge, 800);
      while (edge2 >= MIN_EDGE && finalBlob.size > maxBytes) {
        const scale = Math.min(
          1,
          edge2 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1)
        );
        const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const next = await canvasToBlob(canvas, "image/jpeg", MIN_QUALITY);
        if (next) finalBlob = next;
        edge2 = Math.round(edge2 * 0.65);
      }
    }

    const file = new File([finalBlob], `${baseName}.jpg`, { type: "image/jpeg" });
    const previewUrl = await blobToDataUrl(file);
    return { file, previewUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
