import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetCrud, sweetError, sweetSuccess, sweetWarning } from "@/lib/sweetAlert";
import {
  createHomepageBanner,
  deleteHomepageBanner,
  fetchHomepageBanners,
  resolveCmsMediaUrl,
  updateHomepageBanner,
  uploadGeneralBannerImage,
} from "@/services/cmsApi";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronDown,
  Grid2x2,
  Grid3x3,
  Image as ImageIcon,
  Info,
  Layers,
  Megaphone,
  PanelBottom,
  PanelTop,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
  X
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

// npm install lucide-react-native react-native-svg

/* ---------- Section config ---------- */
const SECTIONS = [
  {
    key: "top",
    label: "Top Section",
    icon: PanelTop,
    desc: "Hero banners displayed right below the navigation bar",
    size: "940 × 640 px",
    cols: 3,
    color: "#3b82f6",
  },
  {
    key: "middle",
    label: "Middle Section",
    icon: Layers,
    desc: "Feature spotlight banners placed mid-page",
    size: "940 × 788 px",
    cols: 2,
    color: "#8b5cf6",
  },
  {
    key: "bottom",
    label: "Bottom Section",
    icon: PanelBottom,
    desc: "Closing banners shown just before the footer",
    size: "940 × 640 px",
    cols: 3,
    color: "#14b8a6",
  },
  {
    key: "ad",
    label: "Ad Banner",
    icon: Megaphone,
    desc: "Single full-width promotional strip",
    size: "1920 × 400 px",
    cols: 2,
    color: "#ef4444",
  },
  {
    key: "single",
    label: "Single Banner",
    icon: ImageIcon,
    desc: "One large standalone feature banner",
    size: "1600 × 500 px",
    cols: 2,
    color: "#22c55e",
  },
  {
    key: "grid1",
    label: "Shop Grid Banner 1",
    icon: Grid3x3,
    desc: "Small square banners inside shop grid block 1",
    size: "600 × 600 px",
    cols: 4,
    color: "#ec4899",
  },
  {
    key: "grid2",
    label: "Shop Grid Banner 2",
    icon: Grid2x2,
    desc: "Small square banners inside shop grid block 2",
    size: "600 × 600 px",
    cols: 4,
    color: "#f59e0b",
  },
];

/* ---------- API helpers ---------- */
const SECTION_KEYS = ["top", "middle", "bottom", "ad", "single", "grid1", "grid2"];

function emptySectionData(): Record<string, any[]> {
  return SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: [] }), {} as Record<string, any[]>);
}

function mapRowToBanner(row: Record<string, unknown>) {
  const imagePath = String(row.imagePath ?? row.image_path ?? "");
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    subtitle: String(row.altText ?? row.alt_text ?? ""),
    imagePath,
    image: resolveCmsMediaUrl(imagePath),
    link: String(row.linkUrl ?? row.link_url ?? ""),
    position: Number(row.position ?? 1),
    status: row.isActive === false || row.is_active === false || row.isActive === 0 ? "Inactive" : "Active",
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
  };
}

function isLocalImageUri(uri: string) {
  return (
    uri.startsWith("data:") ||
    uri.startsWith("blob:") ||
    uri.startsWith("file:") ||
    uri.startsWith("content:")
  );
}

async function resolveImagePath(uri: string, storedPath: string): Promise<string> {
  if (!uri.trim() && storedPath) return storedPath;
  if (!isLocalImageUri(uri)) {
    if (/^https?:\/\//i.test(uri)) return uri;
    return storedPath || uri;
  }
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = uri.includes("png") ? "png" : "jpg";
  const uploaded = await uploadGeneralBannerImage(blob, `banner.${ext}`);
  return String(uploaded.path ?? "");
}

function positionConflictMessage(err: unknown): string | null {
  const msg = getApiErrorMessage(err, "").toLowerCase();
  if (
    msg.includes("section") &&
    (msg.includes("position") || msg.includes("duplicate") || msg.includes("unique"))
  ) {
    return "A banner already exists for this section and position. Choose a different position.";
  }
  if (msg.includes("duplicate") || msg.includes("unique constraint")) {
    return "This section and position combination is already in use.";
  }
  return null;
}

const emptyForm = {
  title: "",
  subtitle: "",
  image: "",
  imagePath: "",
  link: "",
  position: "1",
  status: "Active",
};

export default function HomepageBannerManagement() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 800;

  const [data, setData] = React.useState<Record<string, any[]>>(emptySectionData);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState("top");
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = React.useState<{
    sectionKey: string;
    id: string;
  } | null>(null);
  const [toast, setToast] = React.useState("");
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);

  const activeSection = SECTIONS.find((s) => s.key === activeKey)!;
  const banners = (data[activeKey] || [])
    .slice()
    .sort((a: any, b: any) => a.position - b.position);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;
  const totalItems = banners.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedBanners = banners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeKey]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  const loadBanners = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchHomepageBanners();
      const grouped = emptySectionData();
      for (const row of rows) {
        const section = String(row.section ?? "").toLowerCase();
        if (grouped[section]) {
          grouped[section].push(mapRowToBanner(row));
        }
      }
      setData(grouped);
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to load banners."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  // responsive column count: single card per row on mobile, section's ideal column count on tablet/web
  const columns = !isTablet ? 1 : activeSection.cols;
  const cardWidthPct = 100 / columns;

  async function pickImage() {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required to access photo library.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setForm((f) => ({ ...f, image: result.assets[0].uri, imagePath: "" }));
    }
  }

  function openAdd() {
    setEditingId(null);
    setErrors({});
    setForm({
      ...emptyForm,
      position: String(banners.length + 1),
    });
    setModalVisible(true);
  }

  function openEdit(banner: any) {
    setEditingId(banner.id);
    setErrors({});
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image: banner.image,
      imagePath: banner.imagePath || "",
      link: banner.link || "",
      position: String(banner.position),
      status: banner.status,
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  }

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Title is required.";
    if (!form.image.trim() && !form.imagePath.trim()) newErrors.image = "Image is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Store form data before closing modal
    const savedForm = { ...form };
    const savedEditingId = editingId;

    // Close modal first before showing any dialogs
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});

    // Wait for modal close animation to complete
    await new Promise(resolve => setTimeout(resolve, 250));

    // Now show confirmation dialog
    const label = "Banner";
    if (savedEditingId) {
      if (!(await sweetCrud.confirmUpdate(label, savedForm.title.trim()))) {
        // User cancelled - reopen modal with saved data
        setEditingId(savedEditingId);
        setForm(savedForm);
        setModalVisible(true);
        return;
      }
    } else if (!(await sweetCrud.confirmAdd(label, savedForm.title.trim()))) {
      // User cancelled - reopen modal with saved data
      setForm(savedForm);
      setModalVisible(true);
      return;
    }

    setSaving(true);
    try {
      const imagePath = await resolveImagePath(savedForm.image, savedForm.imagePath);
      const body = {
        section: activeKey,
        position: Number(savedForm.position) || 1,
        title: savedForm.title.trim(),
        altText: savedForm.subtitle.trim() || savedForm.title.trim(),
        imagePath,
        linkUrl: savedForm.link.trim() || "shop-grid.php",
        isActive: savedForm.status === "Active",
        sortOrder: Number(savedForm.position) || 1,
      };

      if (savedEditingId) {
        const updated = await updateHomepageBanner(Number(savedEditingId), body);
        const mapped = mapRowToBanner(updated);
        setData((prev) => ({
          ...prev,
          [activeKey]: prev[activeKey].map((b: any) =>
            String(b.id) === String(savedEditingId) ? mapped : b,
          ),
        }));
        void sweetCrud.updated(label);
      } else {
        const created = await createHomepageBanner(body);
        const mapped = mapRowToBanner(created);
        setData((prev) => ({
          ...prev,
          [activeKey]: [...prev[activeKey], mapped],
        }));
        void sweetCrud.added(label);
      }
    } catch (err) {
      // API failed - reopen modal with saved data and show error
      setEditingId(savedEditingId);
      setForm(savedForm);
      setModalVisible(true);
      
      const conflict = positionConflictMessage(err);
      if (conflict) {
        setErrors({ position: conflict });
        void sweetWarning("Position conflict", conflict);
      } else {
        void sweetError("Error", getApiErrorMessage(err, "Failed to save banner."));
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string) {
    const banner = banners.find((b: any) => String(b.id) === String(id));
    if (!banner) return;
    const nextActive = banner.status !== "Active";
    try {
      const updated = await updateHomepageBanner(Number(banner.id), { isActive: nextActive });
      const mapped = mapRowToBanner(updated);
      setData((prev) => ({
        ...prev,
        [activeKey]: prev[activeKey].map((b: any) =>
          String(b.id) === String(id) ? mapped : b,
        ),
      }));
      void sweetSuccess("Status updated", nextActive ? "Banner is now active." : "Banner is now inactive.");
    } catch (err) {
      void sweetError("Error", getApiErrorMessage(err, "Failed to update status."));
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { sectionKey, id } = confirmDelete;
    try {
      await deleteHomepageBanner(Number(id));
      setData((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey].filter((b: any) => String(b.id) !== String(id)),
      }));
      setConfirmDelete(null);
      void sweetCrud.deleted("Banner");
    } catch (err) {
      void sweetError("Error", getApiErrorMessage(err, "Failed to delete banner."));
    }
  }

  return (
    <AdminLayout>
      <View style={styles.page}>
        {/* Entire screen scrolls as one unit (header + nav + content) on both mobile and web */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <ImageIcon size={22} color="#fff" />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.headerTitle}>
                      Homepage Banner Management
                    </Text>
                    <Text style={styles.headerSubtitle}>
                      Dashboard › Homepage Banners
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.shell, isTablet && styles.shellRow]}>
            {/* Sidebar (tablet) or stat cards (phone) */}
            {isTablet ? (
              <View style={styles.sidebar}>
                <Text style={styles.sidebarHeading}>SECTIONS</Text>
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const active = s.key === activeKey;
                  const count = data[s.key]?.length || 0;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.navItem, active && styles.navItemActive]}
                      onPress={() => setActiveKey(s.key)}
                    >
                      <View
                        style={[
                          styles.navIconDot,
                          { backgroundColor: s.color },
                        ]}
                      >
                        <Icon size={14} color="#fff" />
                      </View>
                      <Text
                        style={[styles.navLabel, active && { color: "#fff" }]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                      <View
                        style={[
                          styles.navCount,
                          active && styles.navCountActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.navCountText,
                            active && { color: "#fff" },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={{ flexGrow: 0, flexShrink: 0 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.statCardsScroll}
                  contentContainerStyle={[styles.statCardsWrap, { alignItems: 'flex-start' }]}
                >
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const active = s.key === activeKey;
                  const count = data[s.key]?.length || 0;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.statCard, active && styles.statCardActive]}
                      onPress={() => setActiveKey(s.key)}
                    >
                      <View style={styles.statCardInner}>
                        <View
                          style={[
                            styles.statCardIcon,
                            { backgroundColor: s.color },
                          ]}
                        >
                          <Icon size={16} color="#fff" />
                        </View>
                        <View style={{ marginLeft: 8 }}>
                          <Text
                            style={[
                              styles.statCardLabel,
                              active && styles.statCardLabelActive,
                            ]}
                            numberOfLines={1}
                          >
                            {s.label}
                          </Text>
                          <Text
                            style={[
                              styles.statCardCount,
                              active && styles.statCardCountActive,
                            ]}
                          >
                            {count} Banner{count !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                </ScrollView>
              </View>
            )}

            {/* Main */}
            <View style={styles.main}>
              <View style={{ padding: 16, paddingBottom: 40 }}>
                {/* Info card */}
                <View style={styles.infoCard}>
                  <View style={styles.infoIcon}>
                    <Info size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>{activeSection.label}</Text>
                    <Text style={styles.infoDesc}>{activeSection.desc}</Text>
                    <View style={styles.tagRow}>
                      <Text style={styles.tag}>Size: {activeSection.size}</Text>
                      <Text style={styles.tag}>Max 2MB</Text>
                      <Text style={styles.tag}>JPG · PNG · WEBP</Text>
                    </View>
                  </View>
                </View>

                {/* Section bar */}
                <View style={styles.sectionBar}>
                  <Text style={styles.sectionBarText}>
                    {activeSection.label}{" "}
                    <Text style={styles.sectionBarCount}>
                      ({banners.length} Banner{banners.length !== 1 ? "s" : ""})
                    </Text>
                  </Text>
                  <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                    <Plus size={14} color="#fff" />
                    <Text style={styles.addBtnText}>Add Banner</Text>
                  </TouchableOpacity>
                </View>

                {/* Cards grid */}
                {loading ? (
                  <View style={styles.empty}>
                    <ActivityIndicator size="large" color="#f97316" />
                    <Text style={styles.emptyText}>Loading banners…</Text>
                  </View>
                ) : banners.length === 0 ? (
                  <View style={styles.empty}>
                    <ImageIcon size={26} color="#c4c8d0" />
                    <Text style={styles.emptyText}>
                      No banners in this section yet
                    </Text>
                    <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                      <Plus size={14} color="#fff" />
                      <Text style={styles.addBtnText}>
                        Add your first banner
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.grid}>
                      {paginatedBanners.map((b) => (
                        <View
                          key={b.id}
                          style={[
                            styles.cardWrap,
                            { width: `${cardWidthPct}%` },
                          ]}
                        >
                          <View style={styles.card}>
                            <View style={styles.cardImageWrap}>
                              <Image
                                source={{ uri: b.image || resolveCmsMediaUrl(b.imagePath) }}
                                style={styles.cardImage}
                              />
                              <View style={styles.positionChip}>
                                <Text style={styles.positionChipText}>
                                  Pos {b.position}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.statusChip,
                                  b.status === "Active"
                                    ? styles.statusOn
                                    : styles.statusOff,
                                ]}
                              >
                                <Text style={styles.statusChipText}>
                                  {b.status}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.cardBody}>
                              <Text style={styles.cardTitle} numberOfLines={1}>
                                {b.title}
                              </Text>
                              {!!b.subtitle && (
                                <Text
                                  style={styles.cardSubtitle}
                                  numberOfLines={1}
                                >
                                  {b.subtitle}
                                </Text>
                              )}
                            </View>

                            <View style={styles.cardActions}>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.actionEdit]}
                                onPress={() => openEdit(b)}
                              >
                                <Pencil size={12} color="#fff" />
                                <Text style={styles.actionEditText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  b.status === "Active"
                                    ? styles.actionToggleOn
                                    : styles.actionToggleOff,
                                ]}
                                onPress={() => toggleStatus(b.id)}
                              >
                                <Power
                                  size={12}
                                  color={
                                    b.status === "Active"
                                      ? "#92400e"
                                      : "#4b5563"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.actionToggleText,
                                    {
                                      color:
                                        b.status === "Active"
                                          ? "#92400e"
                                          : "#4b5563",
                                    },
                                  ]}
                                >
                                  Toggle
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.actionDelete]}
                                onPress={() =>
                                  setConfirmDelete({
                                    sectionKey: activeKey,
                                    id: b.id,
                                  })
                                }
                              >
                                <Trash2 size={13} color="#dc2626" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      itemName="banners"
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Add / Edit modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {editingId ? (
                    <Pencil size={16} color="#fff" />
                  ) : (
                    <Plus size={16} color="#fff" />
                  )}
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    {editingId ? "Edit Banner" : `Add Banner`}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeModal} hitSlop={10}>
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Field label="Banner Title *">
                      <TextInput
                        style={[
                          styles.input,
                          errors.title ? styles.inputError : null,
                        ]}
                        value={form.title}
                        onChangeText={(t) => {
                          setForm({ ...form, title: t });
                          setErrors({ ...errors, title: "" });
                        }}
                        placeholder="e.g. Festive Collection"
                        placeholderTextColor="#9aa0ac"
                      />
                      {!!errors.title && (
                        <Text style={styles.errorText}>{errors.title}</Text>
                      )}
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Alt Text *">
                      <TextInput
                        style={styles.input}
                        value={form.subtitle}
                        onChangeText={(t) => setForm({ ...form, subtitle: t })}
                        placeholder="e.g. Curated ethnic wear"
                        placeholderTextColor="#9aa0ac"
                      />
                    </Field>
                  </View>
                </View>

                <Field label="Link URL">
                  <TextInput
                    style={styles.input}
                    value={form.link}
                    onChangeText={(t) => setForm({ ...form, link: t })}
                    placeholder="https://yourstore.com/collection/..."
                    placeholderTextColor="#9aa0ac"
                    autoCapitalize="none"
                  />
                </Field>

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Field label="Position">
                      <TextInput
                        style={[
                          styles.input,
                          errors.position ? styles.inputError : null,
                        ]}
                        keyboardType="number-pad"
                        value={form.position}
                        onChangeText={(t) => {
                          setForm({ ...form, position: t });
                          setErrors({ ...errors, position: "" });
                        }}
                      />
                      {!!errors.position && (
                        <Text style={styles.errorText}>{errors.position}</Text>
                      )}
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Status">
                      <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setStatusPickerOpen(true)}
                      >
                        <Text style={styles.selectText}>{form.status}</Text>
                        <ChevronDown size={14} color="#6b7280" />
                      </TouchableOpacity>
                    </Field>
                  </View>
                </View>
                <Field label="Current Image">
                  <View style={styles.currentImageWrap}>
                    <Image
                      source={{
                        uri: form.image || "https://via.placeholder.com/500x300?text=No+Image",
                      }}
                      style={styles.currentImage}
                      resizeMode="cover"
                    />
                  </View>
                </Field>

                <Field label="Replace Image">
                  <View style={{ gap: 6 }}>
                    <View
                      style={[
                        styles.customFileInput,
                        errors.image ? styles.inputError : null,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.chooseFileBtn}
                        onPress={() => {
                          pickImage();
                          setErrors({ ...errors, image: "" });
                        }}
                      >
                        <Text style={styles.chooseFileText}>Choose File</Text>
                      </TouchableOpacity>
                      <View style={styles.fileNameWrap}>
                        <Text style={styles.fileNameText} numberOfLines={1}>
                          {form.image ? "image_selected.jpg" : "No file chosen"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.fileHint}>
                      Leave empty to keep current image.{" "}
                      <Text style={{ fontWeight: "700" }}>
                        Recommended: {activeSection.size}
                      </Text>{" "}
                      | Max size: 2MB
                    </Text>
                    {!!errors.image && (
                      <Text style={styles.errorText}>{errors.image}</Text>
                    )}
                  </View>
                </Field>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={closeModal}
                >
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Save size={15} color="#fff" />
                  )}
                  <Text style={styles.btnPrimaryText}>
                    {editingId ? "Update Banner" : "Add Banner"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Status option sheet */}
        <Modal
          visible={statusPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setStatusPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setStatusPickerOpen(false)}
          >
            <View style={styles.optionSheet}>
              {["Active", "Inactive"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.optionRow}
                  onPress={() => {
                    setForm((f) => ({ ...f, status: opt }));
                    setStatusPickerOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Delete confirm */}
        <Modal
          visible={!!confirmDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmDelete(null)}
        >
          <View style={styles.overlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Delete this banner?</Text>
              <Text style={styles.confirmSubtitle}>
                This action can&apos;t be undone.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => setConfirmDelete(null)}
                >
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnDanger}
                  onPress={handleDelete}
                >
                  <Text style={styles.btnPrimaryText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f4f7" },

  headerWrap: {
    padding: 20,
    paddingBottom: 0,
  },
  header: {
    backgroundColor: "#151D4F",
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    flexShrink: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSubtitle: { color: "#b6bcdb", fontSize: 12, marginTop: 2 },

  shell: { flex: 1 },
  shellRow: { flexDirection: "row" },

  /* Sidebar (tablet) */
  sidebar: {
    width: 220,
    flexShrink: 0,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eceef2",
    padding: 12,
  },
  sidebarHeading: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#b0b4bf",
    marginBottom: 8,
    marginLeft: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
  },
  navItemActive: { backgroundColor: "#141b3c" },
  navIconDot: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 12.5, color: "#4b5566" },
  navCount: {
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  navCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  navCountText: { fontSize: 10.5, fontWeight: "700", color: "#4b5566" },

  /* Stat cards (phone section nav) */
  statCardsScroll: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eceef2",
  },
  statCardsWrap: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  statCard: {
    backgroundColor: "#f8f9fb",
    borderWidth: 1,
    borderColor: "#eceef2",
    borderRadius: 14,
    padding: 10,
    paddingHorizontal: 12,
  },
  statCardInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCardActive: {
    backgroundColor: "#141b3c",
    borderColor: "#141b3c",
  },
  statCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardLabel: { fontSize: 13, fontWeight: "700", color: "#1c2333" },
  statCardLabelActive: { color: "#fff" },
  statCardCount: {
    fontSize: 11,
    color: "#9aa0ac",
    marginTop: 2,
    fontWeight: "600",
  },
  statCardCountActive: { color: "#c6cadb" },

  main: { flex: 1 },

  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#151D4F",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  infoDesc: { color: "#c6cadb", fontSize: 11.5, marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },

  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  sectionBarText: { fontSize: 14, fontWeight: "700", color: "#1c2333" },
  sectionBarCount: { fontSize: 11.5, fontWeight: "500", color: "#9aa0ac" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f97316",
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addBtnText: { color: "#fff", fontSize: 11.5, fontWeight: "700" },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  cardWrap: { padding: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eceef2",
    overflow: "hidden",
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#eef0f4",
  },
  cardImage: { width: "100%", height: "100%" },
  positionChip: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(28,35,51,0.75)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  positionChipText: { color: "#fff", fontSize: 9.5, fontWeight: "700" },
  statusChip: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusOn: { backgroundColor: "#16a34a" },
  statusOff: { backgroundColor: "#9aa0ac" },
  statusChipText: { color: "#fff", fontSize: 9.5, fontWeight: "700" },

  cardBody: { paddingHorizontal: 10, paddingTop: 10 },
  cardTitle: { fontSize: 12.5, fontWeight: "700", color: "#1c2333" },
  cardSubtitle: { fontSize: 10.5, color: "#9aa0ac", marginTop: 1 },

  cardActions: { flexDirection: "row", gap: 5, padding: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  actionEdit: { backgroundColor: "#141b3c", flex: 1.3 },
  actionEditText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  actionToggleOn: { backgroundColor: "#fde68a", flex: 1.3 },
  actionToggleOff: { backgroundColor: "#e5e7eb", flex: 1.3 },
  actionToggleText: { fontSize: 10, fontWeight: "700" },
  actionDelete: {
    backgroundColor: "#fee2e2",
    width: 32,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  empty: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#d8dae0",
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 46,
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 12,
    fontWeight: "600",
    color: "#6b7280",
    fontSize: 12.5,
  },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#f97316",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#6b7280",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  btnGhostText: { color: "#374151", fontSize: 13, fontWeight: "600" },
  btnDanger: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,18,33,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: 520,
    maxWidth: "90%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f97316",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 10,
  },
  modalHeaderTitle: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "700" },
  modalBody: { paddingHorizontal: 18, paddingTop: 14 },

  currentImageWrap: {
    width: 220,
    height: 130,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#eef0f4",
    borderWidth: 1,
    borderColor: "#e2e4ea",
  },
  currentImage: { width: "100%", height: "100%" },
  customFileInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e4ea",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  chooseFileBtn: {
    backgroundColor: "#f9fafb",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: "#e2e4ea",
  },
  chooseFileText: { color: "#4b5563", fontSize: 13, fontWeight: "600" },
  fileNameWrap: { flex: 1, paddingHorizontal: 12 },
  fileNameText: { color: "#9ca3af", fontSize: 13 },
  fileHint: { color: "#6b7280", fontSize: 11.5, marginTop: 2 },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4b5563",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e4ea",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 13.5,
    color: "#1c2333",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#dc2626",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 11,
    marginTop: 4,
  },
  fieldRow: { flexDirection: "row", gap: 12 },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e4ea",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  selectText: { fontSize: 13, color: "#1c2333" },

  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f2",
  },

  optionSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 8,
  },
  optionRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  optionText: { fontSize: 14.5, color: "#1c2333" },

  confirmCard: {
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  confirmTitle: { fontSize: 15, fontWeight: "700", color: "#1c2333" },
  confirmSubtitle: { fontSize: 12.5, color: "#9aa0ac", marginTop: 4 },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 18,
  },

  toast: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#141b3c",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "500" },
});
