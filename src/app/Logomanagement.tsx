import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  fetchSiteLogos,
  uploadSiteLogoFromDataUrl,
  uploadSiteLogo,
  resolveCmsMediaUrl,
} from "@/services/cmsApi";
import {
  Moon,
  Sun,
  Bookmark,
  FolderOpen,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  X,
  Image as ImageIcon,
  Clock,
} from "lucide-react-native";

import * as DocumentPicker from "expo-document-picker";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";

// npm install lucide-react-native react-native-svg expo-document-picker

/* ---------- Logo type config ---------- */
const LOGO_TYPES = [
  {
    key: "dark",
    label: "Dark Logo",
    hint: "For light backgrounds",
    icon: Moon,
    color: "#1c2333",
    previewBg: "#f3f4f7",
  },
  {
    key: "light",
    label: "Light Logo",
    hint: "For dark backgrounds",
    icon: Sun,
    color: "#f59e0b",
    previewBg: "#141b3c",
  },
  {
    key: "favicon",
    label: "Favicon",
    hint: "Browser tab icon",
    icon: Bookmark,
    color: "#3b82f6",
    previewBg: "#eef0f4",
  },
];

/* ---------- Logo helpers ---------- */
function fileNameFromPath(path?: string | null) {
  if (!path) return "—";
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function formatUpdatedAt(value?: unknown) {
  if (!value) {
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const emptyLogoSlot = { image: "", fileName: "—", size: "—", path: "" };

function formatBytes(bytes?: number) {
  if (bytes === undefined || bytes === null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function LogoManagement() {
  const { width } = useWindowDimensions();

  // graduated breakpoints so the grid reflows smoothly across phone / tablet / web / resized inspector widths
  const columns = width < 520 ? 1 : width < 1040 ? 2 : 3;
  const cardWidthPct = 100 / columns;

  const [logos, setLogos] = React.useState<Record<string, { image: string; fileName: string; size: string; path: string }>>({
    dark: { ...emptyLogoSlot },
    light: { ...emptyLogoSlot },
    favicon: { ...emptyLogoSlot },
  });
  const [pending, setPending] = React.useState<Record<string, any>>({ dark: null, light: null, favicon: null });
  const [pickingKey, setPickingKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState("—");
  const [toast, setToast] = React.useState("");

  // Pagination state (UI-only)
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 9;
  const totalItems = LOGO_TYPES.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const pageStart = (currentPage - 1) * itemsPerPage;
  const pageItems = LOGO_TYPES.slice(pageStart, pageStart + itemsPerPage);

  const hasPending = Object.values(pending).some(Boolean);
  const pendingCount = Object.values(pending).filter(Boolean).length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  const loadLogos = React.useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchSiteLogos();
      const next: Record<string, { image: string; fileName: string; size: string; path: string }> = {
        dark: { ...emptyLogoSlot },
        light: { ...emptyLogoSlot },
        favicon: { ...emptyLogoSlot },
      };
      const mappings = [
        { key: "dark", path: row.logoDark ?? row.logo_dark },
        { key: "light", path: row.logoLight ?? row.logo_light },
        { key: "favicon", path: row.favicon },
      ];
      for (const { key, path } of mappings) {
        const p = path ? String(path) : "";
        next[key] = {
          path: p,
          image: p ? resolveCmsMediaUrl(p) : "",
          fileName: fileNameFromPath(p),
          size: p ? "Uploaded" : "—",
        };
      }
      setLogos(next);
      setLastUpdated(formatUpdatedAt(row.updatedAt ?? row.updated_at));
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to load logos."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLogos();
  }, [loadLogos]);

  function clearPending(key: string) {
    setPending((prev) => ({ ...prev, [key]: null }));
  }

  // Opens the device / PC file browser directly (no in-app sample list)
  async function pickFile(key: string) {
    try {
      setPickingKey(key);
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPending((prev) => ({
        ...prev,
        [key]: {
          image: asset.uri,
          fileName: asset.name || "uploaded-file",
          size: formatBytes(asset.size),
        },
      }));
    } catch (e) {
      showToast("Couldn't open file browser");
    } finally {
      setPickingKey(null);
    }
  }

  async function handleUpdate() {
    if (!hasPending || updating) return;
    setUpdating(true);
    try {
      const slotMap: Record<string, "dark" | "light" | "favicon"> = {
        dark: "dark",
        light: "light",
        favicon: "favicon",
      };
      const next = { ...logos };
      for (const [key, file] of Object.entries(pending)) {
        if (!file) continue;
        const slot = slotMap[key];
        const fileName = file.fileName || "logo.png";
        const pathKey = key === "dark" ? "logoDark" : key === "light" ? "logoLight" : "favicon";
        let uploadedPath = "";
        if (String(file.image).startsWith("data:")) {
          const result = await uploadSiteLogoFromDataUrl(slot, file.image, fileName);
          uploadedPath = String(result.uploadedPath ?? result[pathKey] ?? "");
        } else {
          const res = await fetch(file.image);
          const blob = await res.blob();
          const result = await uploadSiteLogo(slot, blob, fileName);
          uploadedPath = String(result.uploadedPath ?? result[pathKey] ?? "");
        }
        next[key] = {
          path: uploadedPath,
          image: resolveCmsMediaUrl(uploadedPath),
          fileName: fileNameFromPath(uploadedPath) || fileName,
          size: file.size || "Uploaded",
        };
      }
      setLogos(next);
      setPending({ dark: null, light: null, favicon: null });
      await loadLogos();
      showToast("Logos updated successfully");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to update logos."));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AdminLayout>
      <View style={styles.page}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ImageIcon size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Logo Management</Text>
            </View>
            <View style={styles.headerBadge}>
              <Clock size={11} color="#c6cadb" />
              <Text style={styles.headerBadgeText} numberOfLines={1}>
                Updated {lastUpdated}
              </Text>
            </View>
          </View>

          {/* Status strip */}
          <View style={styles.statusStrip}>
            {LOGO_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <View key={t.key} style={styles.statusChipCard}>
                  <View style={[styles.statusChipIcon, { backgroundColor: t.color }]}>
                    <Icon size={14} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusChipLabel} numberOfLines={1}>
                      {t.label}
                    </Text>
                    <View style={styles.statusChipValueRow}>
                      <CheckCircle2 size={11} color="#16a34a" />
                      <Text style={styles.statusChipValue}>Uploaded</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Logo cards — preview + file meta + replace control combined per type */}
          {loading ? (
            <View style={[styles.cardsGrid, { justifyContent: "center", paddingVertical: 40 }]}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={{ marginTop: 10, color: "#9aa0ac", fontWeight: "600" }}>Loading logos…</Text>
            </View>
          ) : (
          <View style={styles.cardsGrid}>
            {pageItems.map((t) => {
              const Icon = t.icon;
              const current = logos[t.key];
              const pendingFile = pending[t.key];
              const showFile = pendingFile || current;
              const isPicking = pickingKey === t.key;
              return (
                <View key={t.key} style={[styles.logoCardWrap, { width: `${cardWidthPct}%` }]}>
                  <View style={styles.logoCard}>
                    <View style={styles.logoCardHeader}>
                      <View style={[styles.logoCardIcon, { backgroundColor: t.color }]}>
                        <Icon size={17} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logoCardTitle}>{t.label}</Text>
                        <Text style={styles.logoCardHint}>{t.hint}</Text>
                      </View>
                      {pendingFile ? (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>New</Text>
                        </View>
                      ) : (
                        <View style={styles.uploadedBadge}>
                          <CheckCircle2 size={11} color="#16a34a" />
                          <Text style={styles.uploadedBadgeText}>Uploaded</Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.previewWrap, { backgroundColor: t.previewBg }]}>
                      <Image source={{ uri: showFile.image }} style={styles.previewImage} resizeMode="contain" />
                      {!!pendingFile && (
                        <TouchableOpacity style={styles.previewClear} onPress={() => clearPending(t.key)} hitSlop={8}>
                          <X size={12} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.fileMetaRow}>
                      <Text style={styles.fileMetaText} numberOfLines={1}>
                        File: {showFile.fileName}
                      </Text>
                      <Text style={styles.fileMetaText}>Size: {showFile.size}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.replaceBtn, isPicking && { opacity: 0.6 }]}
                      onPress={() => pickFile(t.key)}
                      disabled={isPicking}
                    >
                      <UploadCloud size={14} color="#f97316" />
                      <Text style={styles.replaceBtnText}>
                        {isPicking ? "Opening file browser…" : "Import file from PC"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          )}

          {/* Pagination (placed inside scroll content, directly below the image cards) */}
          <View style={{ paddingHorizontal: 6, marginTop: 8 }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </View>
        </ScrollView>

        {/* Footer action bar */}
        <View style={styles.footerBar}>
          <Text style={styles.footerText}>
            {hasPending ? `${pendingCount} file(s) ready to update` : "No pending changes"}
          </Text>
          <TouchableOpacity
            style={[styles.updateBtn, (!hasPending || updating) && { opacity: 0.5 }]}
            onPress={handleUpdate}
            disabled={!hasPending || updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <RefreshCw size={14} color="#fff" />
            )}
            <Text style={styles.updateBtnText}>Update Logos</Text>
          </TouchableOpacity>
        </View>

        {/* Toast */}
        {!!toast && (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f4f7" },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141b3c",
    borderRadius: 22,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: "wrap",
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerBadgeText: { fontSize: 10, color: "#c6cadb", fontWeight: "600" },

  /* Status strip */
  statusStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  statusChipCard: {
    flexGrow: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eceef2",
    borderRadius: 12,
    padding: 11,
  },
  statusChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipLabel: { fontSize: 11, color: "#9aa0ac", fontWeight: "600" },
  statusChipValueRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusChipValue: { fontSize: 12, color: "#1c2333", fontWeight: "700" },

  /* Logo cards */
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 6, marginTop: 6 },
  logoCardWrap: { padding: 8, minWidth: 300 },
  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eceef2",
    padding: 18,
  },
  logoCardHeader: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 14 },
  logoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCardTitle: { fontSize: 14.5, fontWeight: "700", color: "#1c2333" },
  logoCardHint: { fontSize: 11, color: "#9aa0ac", marginTop: 1 },

  pendingBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: "700", color: "#92400e" },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  uploadedBadgeText: { fontSize: 10, fontWeight: "700", color: "#16a34a" },

  /* Preview: tight background, image fills nearly the whole box */
  previewWrap: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
    padding: 6,
  },
  previewImage: { width: "100%", height: "100%" },
  previewClear: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  fileMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 14,
  },
  fileMetaText: { fontSize: 11, color: "#9aa0ac" },

  replaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.3,
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
    borderRadius: 11,
    paddingVertical: 12,
  },
  replaceBtnText: { fontSize: 12.5, fontWeight: "700", color: "#f97316" },

  /* Footer bar */
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eceef2",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerText: { fontSize: 11.5, color: "#9aa0ac", fontWeight: "600", flexShrink: 1 },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  updateBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  /* Toast */
  toast: {
    position: "absolute",
    bottom: 76,
    alignSelf: "center",
    backgroundColor: "#141b3c",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "500" },
});