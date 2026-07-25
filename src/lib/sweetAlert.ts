import { Alert, Platform } from "react-native";
import Swal from "sweetalert2";

const ORANGE = "#ef7b1a";
const NAVY = "#151D4F";
const RED = "#ef4444";
const MUTED = "#6B7280";

export type SweetKind = "success" | "error" | "warning" | "info" | "question";

type FireOptions = {
  title: string;
  text?: string;
  icon?: SweetKind;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  danger?: boolean;
  timer?: number;
};

async function fireWeb(opts: FireOptions): Promise<boolean> {
  const result = await Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: opts.icon ?? "info",
    showCancelButton: opts.showCancelButton === true,
    confirmButtonText: opts.confirmButtonText ?? "OK",
    cancelButtonText: opts.cancelButtonText ?? "Cancel",
    confirmButtonColor: opts.danger ? RED : ORANGE,
    cancelButtonColor: MUTED,
    background: "#ffffff",
    color: NAVY,
    timer: opts.timer,
    timerProgressBar: opts.timer != null,
  });
  return result.isConfirmed === true;
}

function fireNative(opts: FireOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (opts.showCancelButton) {
      Alert.alert(opts.title, opts.text, [
        {
          text: opts.cancelButtonText ?? "Cancel",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: opts.confirmButtonText ?? "OK",
          style: opts.danger ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ]);
      return;
    }
    Alert.alert(opts.title, opts.text, [{ text: "OK", onPress: () => resolve(true) }]);
  });
}

async function fire(opts: FireOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    try {
      return await fireWeb(opts);
    } catch {
      // fall through to native Alert if Swal fails to load
    }
  }
  return fireNative(opts);
}

/** Success toast/dialog after add / edit / delete. */
export function sweetSuccess(title: string, text?: string, autoCloseMs = 1800): Promise<boolean> {
  return fire({
    title,
    text,
    icon: "success",
    confirmButtonText: "OK",
    timer: Platform.OS === "web" ? autoCloseMs : undefined,
  });
}

/** Error dialog. */
export function sweetError(title: string, text?: string): Promise<boolean> {
  return fire({
    title,
    text,
    icon: "error",
    confirmButtonText: "OK",
  });
}

/** Warning / validation dialog. */
export function sweetWarning(title: string, text?: string): Promise<boolean> {
  return fire({
    title,
    text,
    icon: "warning",
    confirmButtonText: "OK",
  });
}

/** Info dialog. */
export function sweetInfo(title: string, text?: string): Promise<boolean> {
  return fire({
    title,
    text,
    icon: "info",
    confirmButtonText: "OK",
  });
}

type ConfirmOpts = {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button — use for delete */
  danger?: boolean;
  icon?: SweetKind;
};

/** Confirm before add / update / delete. Returns true if user confirmed. */
export function sweetConfirm(opts: ConfirmOpts): Promise<boolean> {
  return fire({
    title: opts.title,
    text: opts.text,
    icon: opts.icon ?? (opts.danger ? "warning" : "question"),
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? "Yes",
    cancelButtonText: opts.cancelText ?? "Cancel",
    danger: opts.danger === true,
  });
}

/** Convenience helpers for CRUD screens. */
export const sweetCrud = {
  confirmAdd: (entityLabel: string, name?: string) =>
    sweetConfirm({
      title: `Add ${entityLabel}?`,
      text: name ? `Add "${name}"?` : `Are you sure you want to add this ${entityLabel.toLowerCase()}?`,
      confirmText: "Yes, Add",
      icon: "question",
    }),

  confirmUpdate: (entityLabel: string, name?: string) =>
    sweetConfirm({
      title: `Update ${entityLabel}?`,
      text: name ? `Save changes to "${name}"?` : `Save changes to this ${entityLabel.toLowerCase()}?`,
      confirmText: "Yes, Update",
      icon: "question",
    }),

  confirmDelete: (entityLabel: string, name?: string) =>
    sweetConfirm({
      title: `Delete ${entityLabel}?`,
      text: name
        ? `Are you sure you want to delete "${name}"? This cannot be undone.`
        : `Are you sure you want to delete this ${entityLabel.toLowerCase()}? This cannot be undone.`,
      confirmText: "Yes, Delete",
      danger: true,
      icon: "warning",
    }),

  added: (entityLabel: string) => sweetSuccess("Added!", `${entityLabel} added successfully.`),
  updated: (entityLabel: string) => sweetSuccess("Updated!", `${entityLabel} updated successfully.`),
  deleted: (entityLabel: string) => sweetSuccess("Deleted!", `${entityLabel} deleted successfully.`),
  saved: (entityLabel = "Changes") => sweetSuccess("Saved!", `${entityLabel} saved successfully.`),
};
