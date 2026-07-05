import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";

const { width: screenWidth } = Dimensions.get("window");

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const T = {
  navy: "#0F1F4B",
  navyMid: "#1A2F6A",
  navyLight: "#243580",
  orange: "#F97316",
  orangePale: "#FFF4EC",
  orangeSoft: "#FDE8D4",
  white: "#FFFFFF",
  bg: "#F4F6FB",
  cardBg: "#FFFFFF",
  border: "#DDE3F0",
  textDark: "#0A1533",
  textMid: "#3A4A72",
  textSoft: "#6B7A9E",
  textLight: "#9BA8C5",
  success: "#16A34A",
  error: "#DC2626",
};

// ─── Toast State Type ─────────────────────────────────────────────────────────
interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Inline Code Component ────────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return <Text style={codeStyles.text}>{children}</Text>;
}

const codeStyles = StyleSheet.create({
  text: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: T.orange,
    backgroundColor: T.orangePale,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: "600",
  },
});

// ─── Step Card Component ──────────────────────────────────────────────────────
interface StepCardProps {
  number: number;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

function StepCard({ number, title, description, icon, action }: StepCardProps) {
  return (
    <View style={stepCardStyles.card}>
      <View style={stepCardStyles.iconContainer}>{icon}</View>
      <Text style={stepCardStyles.title}>
        {number}. {title}
      </Text>
      <Text style={stepCardStyles.description}>{description}</Text>
      {action && <View style={stepCardStyles.action}>{action}</View>}
    </View>
  );
}

const stepCardStyles = StyleSheet.create({
  card: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: screenWidth > 600 ? 200 : "100%",
    marginBottom: screenWidth > 600 ? 0 : 16,
    shadowColor: T.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.orangePale,
    borderWidth: 1,
    borderColor: T.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: T.textSoft,
    lineHeight: 18,
  },
  action: {
    marginTop: 12,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BulkUpload() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size?: number;
    uri: string;
  } | null>(null);

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.history.length <= 1) {
      // No browser history to go back to — navigate to Products instead
      router.push("/Products");
    } else {
      router.back();
    }
  };

  const handleDownloadTemplate = () => {
    // TODO: trigger CSV + README download / share
    showToast("Template download triggered", "success");
  };

  const handleFileSelect = () => {
    // TODO: open DocumentPicker and call setSelectedFile(...)
    // Stub: simulate a file being picked for UI preview
    setSelectedFile({ name: "products_import.zip", size: 204800, uri: "" });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleStartImport = () => {
    // TODO: call your bulk import API with selectedFile.uri
    showToast("Import started!", "success");
  };

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={T.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bulk Import Products</Text>
        </View>
        <Text style={styles.headerSub}>Upload products in bulk using ZIP templates</Text>
      </View>

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section heading */}
        <Text style={styles.sectionTitle}>How it works</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {/* Step 1 */}
          <StepCard
            number={1}
            title="Download template"
            icon={<Feather name="download" size={20} color={T.orange} />}
            description={
              <Text style={styles.stepDescriptionText}>
                Download the ZIP template which contains a formatted <Code>products.csv</Code> file
                and an empty <Code>images/</Code> folder.
              </Text>
            }
            action={
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadTemplate}
                activeOpacity={0.8}
              >
                <Feather name="download" size={14} color={T.orange} style={{ marginRight: 6 }} />
                <Text style={styles.downloadButtonText}>Download template</Text>
              </TouchableOpacity>
            }
          />

          {/* Step 2 */}
          <StepCard
            number={2}
            title="Fill data & images"
            icon={<Feather name="edit-3" size={20} color={T.orange} />}
            description={
              <Text style={styles.stepDescriptionText}>
                Fill out <Code>products.csv</Code>. Use the same <Code>Product Handle</Code> for
                rows that are variants of the same product. Place all your images inside the{" "}
                <Code>images/</Code> folder.
              </Text>
            }
          />

          {/* Step 3 */}
          <StepCard
            number={3}
            title="Zip & upload"
            icon={
              <MaterialCommunityIcons name="folder-zip-outline" size={20} color={T.orange} />
            }
            description={
              <Text style={styles.stepDescriptionText}>
                Compress the folder back into a <Code>.zip</Code> file and upload it below. The
                system will process your products and variants automatically.
              </Text>
            }
          />
        </View>

        {/* ── Upload Card ──────────────────────────────────────────────────── */}
        <View style={styles.uploadCard}>
          <Text style={styles.uploadCardTitle}>Upload ZIP file</Text>

          {/* Drop zone */}
          <TouchableOpacity
            style={styles.dropZone}
            onPress={handleFileSelect}
            activeOpacity={0.8}
          >
            <View style={styles.cloudIconContainer}>
              <Feather name="upload-cloud" size={40} color={T.orange} />
            </View>
            <Text style={styles.dropZoneTitle}>Select ZIP file</Text>
            <Text style={styles.dropZoneSub}>Tap to browse from your device</Text>
          </TouchableOpacity>

          {/* File preview */}
          {selectedFile && (
            <View style={styles.filePreview}>
              <Feather name="file" size={20} color={T.orange} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                {selectedFile.size !== undefined && (
                  <Text style={styles.fileSize}>{formatBytes(selectedFile.size)}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleRemoveFile}
                style={styles.removeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={T.textSoft} />
              </TouchableOpacity>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, !selectedFile && styles.submitButtonDisabled]}
            onPress={handleStartImport}
            disabled={!selectedFile}
            activeOpacity={0.8}
          >
            <Feather name="upload" size={16} color={T.white} style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Start import</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast.visible && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Feather
              name={toast.type === "success" ? "check-circle" : "alert-circle"}
              size={16}
              color={toast.type === "success" ? T.success : T.error}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}
      </SafeAreaView>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: { marginHorizontal: 2, marginTop: 12, borderRadius: 22, 
    backgroundColor: T.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 24,
    },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: T.white,
  },
  headerSub: {
    fontSize: 13,
    color: T.textLight,
    marginLeft: 30,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 16,
  },
  stepsContainer: {
    flexDirection: screenWidth > 600 ? "row" : "column",
    gap: 16,
    marginBottom: 24,
  },
  stepDescriptionText: {
    fontSize: 12,
    color: T.textSoft,
    lineHeight: 18,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: T.orange,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.orange,
  },
  uploadCard: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 20,
    shadowColor: T.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  uploadCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: T.textDark,
    textAlign: "center",
    marginBottom: 16,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
  },
  cloudIconContainer: {
    marginBottom: 12,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 4,
  },
  dropZoneSub: {
    fontSize: 12,
    color: T.textSoft,
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.bg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textDark,
  },
  fileSize: {
    fontSize: 11,
    color: T.textSoft,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.orange,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: T.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: T.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: T.white,
  },
  toastContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.navy,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    color: T.white,
    fontWeight: "500",
  },
});