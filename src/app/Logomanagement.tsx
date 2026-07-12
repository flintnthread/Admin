import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
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

/* ---------- Dummy seed data ---------- */
function img(seed: string, w = 600, h = 220) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

const initialLogos: Record<string, { image: string; fileName: string; size: string }> = {
  dark: { image: img("flint-dark-logo", 600, 220), fileName: "logo_dark_1759731453_68e35efdcf08d.jpg", size: "47.71 KB" },
  light: { image: img("flint-light-logo", 600, 220), fileName: "logo_light_1760248096.png", size: "36.61 KB" },
  favicon: { image: img("flint-favicon", 240, 240), fileName: "favicon_1760179156.png", size: "23.01 KB" },
};

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

  const [logos, setLogos] = React.useState(initialLogos);
  const [pending, setPending] = React.useState<Record<string, any>>({ dark: null, light: null, favicon: null });
  const [pickingKey, setPickingKey] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState("October 12, 2025, 5:48 am");
  const [toast, setToast] = React.useState("");

  const hasPending = Object.values(pending).some(Boolean);
  const pendingCount = Object.values(pending).filter(Boolean).length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

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

  function handleUpdate() {
    if (!hasPending) return;
    setLogos((prev) => {
      const next = { ...prev };
      Object.entries(pending).forEach(([key, file]) => {
        if (file) next[key] = file;
      });
      return next;
    });
    setPending({ dark: null, light: null, favicon: null });
    setLastUpdated(
      new Date().toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
    showToast("Logos updated successfully");
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
              <ImageIcon size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Logo Management</Text>
              <Text style={styles.headerSubtitle}>Dashboard › Logos</Text>
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
            <View style={styles.statusChipCard}>
              <View style={[styles.statusChipIcon, { backgroundColor: "#6366f1" }]}>
                <FolderOpen size={14} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusChipLabel} numberOfLines={1}>
                  Upload Directory
                </Text>
                <View style={styles.statusChipValueRow}>
                  <CheckCircle2 size={11} color="#16a34a" />
                  <Text style={styles.statusChipValue}>Writable</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Logo cards — preview + file meta + replace control combined per type */}
          <View style={styles.cardsGrid}>
            {LOGO_TYPES.map((t) => {
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
        </ScrollView>

        {/* Footer action bar */}
        <View style={styles.footerBar}>
          <Text style={styles.footerText}>
            {hasPending ? `${pendingCount} file(s) ready to update` : "No pending changes"}
          </Text>
          <TouchableOpacity
            style={[styles.updateBtn, !hasPending && { opacity: 0.5 }]}
            onPress={handleUpdate}
            disabled={!hasPending}
          >
            <RefreshCw size={14} color="#fff" />
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15.5, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 11.5, color: "#b6bcdb", marginTop: 1 },
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