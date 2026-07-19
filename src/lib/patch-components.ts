import React from "react";

const RN = require("react-native");

function getLuminance(hex: string) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return 0.5;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isGrayscale(hex: string) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < 30;
}

function resolveColor(c: any): string {
  if (typeof c !== "string") return "";
  const nameMap: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    charcoal: "#36454f",
    gray: "#808080",
    grey: "#808080",
    lightgray: "#d3d3d3",
    lightgrey: "#d3d3d3",
  };
  const normalized = c.trim().toLowerCase();
  return nameMap[normalized] || (normalized.startsWith("#") ? normalized : "");
}

const mapStyle = (style: any, isDark: boolean): any => {
  if (!style) return style;
  if (!isDark) return style;

  if (Array.isArray(style)) {
    return style.map((s) => mapStyle(s, isDark));
  }

  const mapped = { ...style };

  // 1. Map text colors
  if (mapped.color) {
    const resolved = resolveColor(mapped.color);
    if (resolved) {
      const lum = getLuminance(resolved);
      const gray = isGrayscale(resolved);
      if (gray) {
        if (lum < 0.45) {
          mapped.color = "#F9FAFB";
        } else if (lum < 0.7) {
          mapped.color = "#D1D5DB";
        }
      }
    }
  }

  // 2. Map background colors
  if (mapped.backgroundColor) {
    const resolved = resolveColor(mapped.backgroundColor);
    if (resolved) {
      const lum = getLuminance(resolved);
      const gray = isGrayscale(resolved);
      if (gray || resolved === "#fff8f2" || resolved === "#fff5ee" || resolved === "#fff0e6") {
        if (lum > 0.85) {
          mapped.backgroundColor = "#1e293b";
        } else if (lum > 0.7) {
          mapped.backgroundColor = "#0f172a";
        }
      }
    }
  }

  // 3. Map border colors
  const borderProps = ["borderColor", "borderBottomColor", "borderTopColor", "borderLeftColor", "borderRightColor"];
  for (const prop of borderProps) {
    if (mapped[prop]) {
      const resolved = resolveColor(mapped[prop]);
      if (resolved) {
        const lum = getLuminance(resolved);
        const gray = isGrayscale(resolved);
        if (gray || resolved === "#f0e8e0" || resolved === "#f5f0eb" || resolved === "#e8edf5" || resolved === "#e8eaf0") {
          if (lum > 0.6) {
            mapped[prop] = "#334155";
          }
        }
      }
    }
  }

  return mapped;
};

function copyStaticProperties(target: any, source: any) {
  if (!source || !target) return;
  Object.getOwnPropertyNames(source).forEach((key) => {
    if (key !== "displayName" && key !== "render" && key !== "prototype") {
      try {
        const desc = Object.getOwnPropertyDescriptor(source, key);
        if (desc) {
          Object.defineProperty(target, key, desc);
        }
      } catch {
        // Ignore read-only write errors
      }
    }
  });
}

function safePatch(obj: any, key: string, value: any) {
  try {
    obj[key] = value;
  } catch {
    try {
      Object.defineProperty(obj, key, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch (err) {
      console.warn(`[patchComponents] Failed to patch ${key}:`, err);
    }
  }
}

export function patchComponents() {
  if (!RN) {
    console.warn("[patchComponents] React Native module is not loaded.");
    return;
  }
  if (!RN.Text) {
    console.warn("[patchComponents] React Native Text component is not defined.");
    return;
  }
  if (RN.Text.__patched) return;

  // 1. Patch Text
  const OriginalText = RN.Text;
  const PatchedText = React.forwardRef((props: any, ref: any) => {
    const isDark = (globalThis as any).isDarkMode;
    let newStyle = props.style;
    if (isDark) {
      const hasColor = (style: any): boolean => {
        if (!style) return false;
        if (Array.isArray(style)) return style.some(hasColor);
        return !!style.color;
      };
      if (!hasColor(props.style)) {
        newStyle = [props.style, { color: "#F9FAFB" }];
      }
      newStyle = mapStyle(newStyle, isDark);
    }
    return React.createElement(OriginalText, { ...props, ref, style: newStyle });
  });
  PatchedText.displayName = "Text";
  copyStaticProperties(PatchedText, OriginalText);
  safePatch(RN, "Text", PatchedText);
  safePatch(RN.Text, "__patched", true);

  // 2. Patch View
  if (RN.View) {
    const OriginalView = RN.View;
    const PatchedView = React.forwardRef((props: any, ref: any) => {
      const isDark = (globalThis as any).isDarkMode;
      let newStyle = props.style;
      if (isDark) {
        newStyle = mapStyle(newStyle, isDark);
      }
      return React.createElement(OriginalView, { ...props, ref, style: newStyle });
    });
    PatchedView.displayName = "View";
    copyStaticProperties(PatchedView, OriginalView);
    safePatch(RN, "View", PatchedView);
    safePatch(RN.View, "__patched", true);
  }

  // 3. Patch ScrollView
  if (RN.ScrollView) {
    const OriginalScrollView = RN.ScrollView;
    const PatchedScrollView = React.forwardRef((props: any, ref: any) => {
      const isDark = (globalThis as any).isDarkMode;
      let newStyle = props.style;
      let contentContainerStyle = props.contentContainerStyle;
      if (isDark) {
        newStyle = mapStyle(newStyle, isDark);
        contentContainerStyle = mapStyle(contentContainerStyle, isDark);
      }
      return React.createElement(OriginalScrollView, {
        ...props,
        ref,
        style: newStyle,
        contentContainerStyle,
      });
    });
    PatchedScrollView.displayName = "ScrollView";
    copyStaticProperties(PatchedScrollView, OriginalScrollView);
    safePatch(RN, "ScrollView", PatchedScrollView);
    safePatch(RN.ScrollView, "__patched", true);
  }

  // 4. Patch TextInput
  if (RN.TextInput) {
    const OriginalTextInput = RN.TextInput;
    const PatchedTextInput = React.forwardRef((props: any, ref: any) => {
      const isDark = (globalThis as any).isDarkMode;
      let newStyle = props.style;
      let placeholderTextColor = props.placeholderTextColor;
      if (isDark) {
        const hasColor = (style: any): boolean => {
          if (!style) return false;
          if (Array.isArray(style)) return style.some(hasColor);
          return !!style.color;
        };
        if (!hasColor(props.style)) {
          newStyle = [props.style, { color: "#F9FAFB" }];
        }
        newStyle = mapStyle(newStyle, isDark);
        placeholderTextColor = "#9CA3AF";
      }
      return React.createElement(OriginalTextInput, {
        ...props,
        ref,
        style: [
          RN.Platform?.OS === "web" ? { paddingVertical: 0, paddingHorizontal: 0 } : null,
          newStyle,
        ],
        placeholderTextColor,
      });
    });
    PatchedTextInput.displayName = "TextInput";
    copyStaticProperties(PatchedTextInput, OriginalTextInput);
    safePatch(RN, "TextInput", PatchedTextInput);
    safePatch(RN.TextInput, "__patched", true);
  }
}
