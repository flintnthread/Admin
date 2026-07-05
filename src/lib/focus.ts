import { Platform } from "react-native";

/** Prevents web aria-hidden warnings when navigating or opening overlays. */
export function blurActiveElementOnWeb() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}
