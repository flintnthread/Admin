/**
 * Converts a local image URI to a value the API accepts (https URL, uploads path, or data URL).
 */
export async function uriToImageSource(uri: string): Promise<string> {
  const trimmed = uri?.trim();
  if (!trimmed) {
    return "";
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("uploads/")
  ) {
    return trimmed;
  }

  const response = await fetch(trimmed);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      resolve(typeof result === "string" ? result : "");
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(blob);
  });
}
