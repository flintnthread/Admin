function token(text: string, maxLen: number): string {
    const clean = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!clean) return "X".repeat(maxLen);
    return clean.slice(0, maxLen).padEnd(maxLen, "X");
}

function randomFourDigits(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

/** Format: ABC-BLM1-4829 — product name (3) - color+size (4) - random (4) */
export function generateVariantSku(
    productName: string,
    color: string,
    size: string,
    _variantIndex?: number,
    sizeCode?: string,
): string {
    const namePart = token(productName, 3);
    const colorPart = token(color, 2);
    const sizePart = token(sizeCode || size, 2);
    return `${namePart}-${colorPart}${sizePart}-${randomFourDigits()}`;
}
