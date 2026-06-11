import React, { useState, useCallback } from "react";
import AdminLayout from "@/components/admin-layout";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    FlatList,
    StyleSheet,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Alert,
    Platform,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_PRODUCT = {
    id: "prod_001",
    name: "Premium Cotton Kurta Set",
    sku: "KRT-BLU-M-2024",
    category: "Clothing",
    subcategory: "Ethnic Wear",
    color: "Blue, White",
    size: "S, M, L, XL",
    description:
        "Crafted from 100% pure cotton, this premium kurta set offers unmatched comfort and elegance. The intricate embroidery details and contemporary cut make it perfect for both casual and semi-formal occasions. Machine washable and colorfast, this set is designed to retain its vibrancy wash after wash.",
    material: "100% Pure Cotton",
    weight: "450g",
    dimensions: "70cm × 55cm × 5cm",
    hsnCode: "62046990",
    gst: "5%",
    stock: 124,
    status: "Active",
    rawStatus: "active",
    price: 899,
    mrpExclGst: 1199,
    mrpInclGst: 1259,
    discount: 25,
    returnPolicy: "7 Days Easy Return",
    warranty: "30-Day Quality Guarantee",
    careInstructions: "Machine wash cold, tumble dry low",
    adminNotes:
        "Bestseller in Ethnic Wear. Restock when below 50 units. Premium packaging required.",
    updated: "10 Jun 2026",
    createdAt: "15 Jan 2026",
    approvedAt: "16 Jan 2026",
    images: [
        "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        "https://images.unsplash.com/photo-1603217192634-61068e4d4bf9?w=600&q=80",
        "https://images.unsplash.com/photo-1594938298603-c8148c4baadb?w=600&q=80",
    ],
    specifications: [
        { label: "Fabric", value: "100% Pure Cotton" },
        { label: "Pattern", value: "Embroidered" },
        { label: "Fit", value: "Regular Fit" },
        { label: "Sleeve", value: "3/4 Sleeve" },
        { label: "Neck", value: "Mandarin Collar" },
        { label: "Occasion", value: "Casual, Semi-formal" },
        { label: "Wash Care", value: "Machine Wash" },
        { label: "Country of Origin", value: "India" },
    ],
    features: [
        "Hand-block printed with natural dyes for a unique finish",
        "Breathable fabric perfect for Indian summers",
        "Reinforced stitching at stress points for long-lasting wear",
        "Matching dupatta included with premium packaging",
        "Anti-shrink treatment applied to maintain perfect fit",
    ],
    packaging: {
        boxDimensions: "35cm × 28cm × 6cm",
        grossWeight: "600g",
        packagingType: "Gift Box",
        fragile: false,
    },
    delivery: {
        estimated: "3–5 Business Days",
        freeAbove: "₹499",
        expressAvailable: true,
        expressCharge: "₹99",
        cod: true,
        codCharge: "₹50",
        locations: "Pan India",
    },
    deliveryCharges: [
        { zone: "Intra-City (same city)", standard: "₹40", express: "₹80" },
        { zone: "Intra-State (same state)", standard: "₹60", express: "₹120" },
        { zone: "Metro to Metro", standard: "₹80", express: "₹160" },
        { zone: "Rest of India", standard: "₹100", express: "₹200" },
        { zone: "Remote Areas", standard: "₹150", express: "N/A" },
    ],
    returnDetails: {
        window: "7 Days",
        refundMode: "Original Payment Method",
        conditions: [
            "Item must be unused and in original condition with tags",
            "Original packaging must be intact",
            "Return request must be raised within 7 days of delivery",
            "COD orders refunded as store credits or bank transfer",
            "Damaged/defective items qualify for immediate replacement",
        ],
        process:
            "Raise a return request via the app or customer care. Our logistics partner will pick up the item within 2–3 business days. Refund will be processed within 5–7 business days after inspection.",
    },
    sizeChart: [
        { size: "XS", chest: "34", waist: "28", hip: "36", length: "42" },
        { size: "S", chest: "36", waist: "30", hip: "38", length: "43" },
        { size: "M", chest: "38", waist: "32", hip: "40", length: "44" },
        { size: "L", chest: "40", waist: "34", hip: "42", length: "45" },
        { size: "XL", chest: "42", waist: "36", hip: "44", length: "46" },
        { size: "XXL", chest: "44", waist: "38", hip: "46", length: "47" },
    ],
    variants: [
        { id: "v1", color: "Blue", colorHex: "#3B82F6", size: "S", sku: "BLU-S-001", stock: 18, mrpExclGst: 1199, mrpInclGst: 1259, mrp: 1199, discount: 25, sellingPrice: 899.25, sellingPriceExGst: 899.25, sellingPriceWithGst: 944.21, finalPrice: 944.21, gstPercent: 5, gstAmount: 44.96, commissionPercent: 15, commissionAmount: 141.63, intraCityDelivery: 40, metroMetroDelivery: 80, totalIntraCity: 1125.84, totalMetroMetro: 1165.84, imageUri: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&q=80", videoUri: "" },
        { id: "v2", color: "Blue", colorHex: "#3B82F6", size: "M", sku: "BLU-M-002", stock: 34, mrpExclGst: 1199, mrpInclGst: 1259, mrp: 1199, discount: 25, sellingPrice: 899.25, sellingPriceExGst: 899.25, sellingPriceWithGst: 944.21, finalPrice: 944.21, gstPercent: 5, gstAmount: 44.96, commissionPercent: 15, commissionAmount: 141.63, intraCityDelivery: 40, metroMetroDelivery: 80, totalIntraCity: 1125.84, totalMetroMetro: 1165.84, imageUri: "", videoUri: "" },
        { id: "v3", color: "Blue", colorHex: "#3B82F6", size: "L", sku: "BLU-L-003", stock: 22, mrpExclGst: 1199, mrpInclGst: 1259, mrp: 1199, discount: 25, sellingPrice: 899.25, sellingPriceExGst: 899.25, sellingPriceWithGst: 944.21, finalPrice: 944.21, gstPercent: 5, gstAmount: 44.96, commissionPercent: 15, commissionAmount: 141.63, intraCityDelivery: 40, metroMetroDelivery: 80, totalIntraCity: 1125.84, totalMetroMetro: 1165.84, imageUri: "", videoUri: "" },
        { id: "v4", color: "White", colorHex: "#F9FAFB", size: "M", sku: "WHT-M-004", stock: 28, mrpExclGst: 1199, mrpInclGst: 1259, mrp: 1199, discount: 20, sellingPrice: 959.2, sellingPriceExGst: 959.2, sellingPriceWithGst: 1007.16, finalPrice: 1007.16, gstPercent: 5, gstAmount: 47.96, commissionPercent: 15, commissionAmount: 151.07, intraCityDelivery: 40, metroMetroDelivery: 80, totalIntraCity: 1198.23, totalMetroMetro: 1238.23, imageUri: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80", videoUri: "" },
        { id: "v5", color: "White", colorHex: "#F9FAFB", size: "L", sku: "WHT-L-005", stock: 15, mrpExclGst: 1199, mrpInclGst: 1259, mrp: 1199, discount: 20, sellingPrice: 959.2, sellingPriceExGst: 959.2, sellingPriceWithGst: 1007.16, finalPrice: 1007.16, gstPercent: 5, gstAmount: 47.96, commissionPercent: 15, commissionAmount: 151.07, intraCityDelivery: 40, metroMetroDelivery: 80, totalIntraCity: 1198.23, totalMetroMetro: 1238.23, imageUri: "", videoUri: "" },
        { id: "v6", color: "Green", colorHex: "#22C55E", size: "XL", sku: "GRN-XL-006", stock: 7, mrpExclGst: 1299, mrpInclGst: 1364, mrp: 1299, discount: 30, sellingPrice: 909.3, sellingPriceExGst: 909.3, sellingPriceWithGst: 954.77, finalPrice: 954.77, gstPercent: 5, gstAmount: 45.47, commissionPercent: 15, commissionAmount: 143.22, intraCityDelivery: 40, metroMetroDelivery: 80, totalIntraCity: 1137.99, totalMetroMetro: 1177.99, imageUri: "", videoUri: "" },
    ],
};

const COLOR_OPTIONS = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Orange", "Gray", "Brown"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "Standard", "28", "30", "32", "34", "36", "38", "40"];
const COLOR_HEX: Record<string, string> = {
    Red: "#EF4444", Blue: "#3B82F6", Green: "#22C55E", Black: "#1F2937",
    White: "#F9FAFB", Yellow: "#F59E0B", Pink: "#EC4899", Purple: "#8B5CF6",
    Orange: "#F97316", Gray: "#6B7280", Brown: "#92400E",
};

// ─── Color Palette ────────────────────────────────────────────
const C = {
    navy: "#1E2B6B", navyDeep: "#151D4F", navyLight: "#2D3E8A",
    purple: "#6C63FF", purpleLight: "#A89CFF", purplePale: "#F0EEFF",
    green: "#22C55E", greenPale: "#F0FDF4",
    red: "#EF4444", redPale: "#FEF2F2",
    yellow: "#F59E0B", yellowPale: "#FFFBEB",
    blue: "#3B82F6", bluePale: "#EFF6FF",
    orange: "#F97316", orangePale: "#FFF7ED",
    white: "#FFFFFF", bg: "#F7F8FC", card: "#FFFFFF",
    border: "#E5E7EB", textDark: "#111827", textMid: "#374151", textLight: "#9CA3AF",
};

// ─── Types ────────────────────────────────────────────────────
interface Variant {
    id: string;
    color: string;
    colorHex: string;
    size: string;
    sku: string;
    stock: number;
    mrpExclGst: number;
    mrpInclGst: number;
    mrp: number;
    discount: number;
    sellingPrice: number;
    sellingPriceExGst: number;
    sellingPriceWithGst: number;
    finalPrice: number;
    gstPercent: number;
    gstAmount: number;
    commissionPercent: number;
    commissionAmount: number;
    intraCityDelivery: number;
    metroMetroDelivery: number;
    totalIntraCity: number;
    totalMetroMetro: number;
    imageUri: string;
    videoUri: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function getStatusStyle(status: string) {
    if (status === "Active") return { bg: "#F0FDF4", color: "#22C55E" };
    if (status === "Inactive") return { bg: "#FFFBEB", color: "#F59E0B" };
    return { bg: "#FEF2F2", color: "#EF4444" };
}

// ─── Shared UI Components ─────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
    return (
        <View style={s.sectionHeader}>
            <View style={s.sectionIconBox}>
                <Text style={s.sectionIconText}>{icon}</Text>
            </View>
            <Text style={s.sectionTitle}>{title}</Text>
        </View>
    );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <View style={s.infoRow}>
            <Text style={s.infoLabel}>{label}</Text>
            <Text style={[s.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
        </View>
    );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
    return <View style={[s.card, style]}>{children}</View>;
}

// ─── Success Toast ────────────────────────────────────────────
function Toast({ visible, title, subtitle }: { visible: boolean; title: string; subtitle: string }) {
    if (!visible) return null;
    return (
        <View style={s.toastOverlay} pointerEvents="none">
            <View style={s.toastBox}>
                <View style={s.toastIcon}>
                    <Text style={s.toastIconText}>✓</Text>
                </View>
                <Text style={s.toastTitle}>{title}</Text>
                <Text style={s.toastSubtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}

// ─── Picker Sheet Modal ───────────────────────────────────────
function PickerSheet({
    visible, options, onSelect, onClose, withDot,
}: {
    visible: boolean; options: string[]; onSelect: (v: string) => void;
    onClose: () => void; withDot?: boolean;
}) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={onClose}>
                <View style={s.pickerSheet}>
                    <View style={s.pickerHandle} />
                    <FlatList
                        data={options}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={s.pickerItem}
                                onPress={() => { onSelect(item); onClose(); }}
                            >
                                {withDot && (
                                    <View style={[s.colorDot, {
                                        backgroundColor: COLOR_HEX[item] || "#9CA3AF",
                                        borderWidth: item === "White" ? 1 : 0,
                                        borderColor: C.border,
                                    }]} />
                                )}
                                <Text style={s.pickerItemText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

// ─── Add / Edit Variant Modal ─────────────────────────────────
function VariantModal({
    visible, variant, onClose, onSave, mode = "edit",
}: {
    visible: boolean; variant: Variant | null; onClose: () => void;
    onSave: (v: Variant) => void; mode?: "edit" | "add";
}) {
    const [color, setColor] = useState(variant?.color || "");
    const [size, setSize] = useState(variant?.size || "");
    const [stock, setStock] = useState(String(variant?.stock || ""));
    const [mrp, setMrp] = useState(String(variant?.mrpExclGst || ""));
    const [discount, setDiscount] = useState(String(variant?.discount || ""));
    const [gst, setGst] = useState(String(variant?.gstPercent || "5"));
    const [imageUri, setImageUri] = useState(variant?.imageUri || "");
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const isAdd = mode === "add";
    const spExGst = mrp && discount ? parseFloat(mrp) * (1 - parseFloat(discount) / 100) : 0;
    const gstAmt = spExGst * (parseFloat(gst || "0") / 100);
    const spWithGst = spExGst + gstAmt;
    const commission = spWithGst * 0.15;
    const intraCity = spWithGst + commission + 40;
    const metroMetro = spWithGst + commission + 80;

    const handleSave = () => {
        if (!color || !size || !stock || !mrp || !discount) {
            Alert.alert("Missing Fields", "Please fill all required fields.");
            return;
        }
        const mrpVal = parseFloat(mrp);
        const exGst = parseFloat(spExGst.toFixed(2));
        const withGst = parseFloat(spWithGst.toFixed(2));
        const base = variant || ({ id: Date.now().toString() } as Variant);
        onSave({
            ...base,
            color,
            colorHex: COLOR_HEX[color] || "#9CA3AF",
            size,
            stock: parseInt(stock),
            mrpExclGst: mrpVal, mrp: mrpVal,
            discount: parseFloat(discount),
            sellingPrice: exGst, sellingPriceExGst: exGst,
            finalPrice: withGst, sellingPriceWithGst: withGst,
            gstPercent: parseFloat(gst), gstAmount: parseFloat(gstAmt.toFixed(2)),
            commissionPercent: 15, commissionAmount: parseFloat(commission.toFixed(2)),
            intraCityDelivery: 40, metroMetroDelivery: 80,
            totalIntraCity: parseFloat(intraCity.toFixed(2)),
            totalMetroMetro: parseFloat(metroMetro.toFixed(2)),
            sku: base.sku || `${color.substring(0, 3).toUpperCase()}-${size}-${Math.floor(1000 + Math.random() * 9000)}`,
            mrpInclGst: withGst, imageUri: imageUri || base.imageUri || "", videoUri: base.videoUri || "",
        });
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); onClose(); }, 1500);
    };

    const calcRows: [string, string, string][] = [
        ["Selling Price (Excl. GST)", `₹${spExGst.toFixed(2)}`, C.textDark],
        [`GST Amount (${gst}%)`, `+ ₹${gstAmt.toFixed(2)}`, C.orange],
        ["Selling Price (With GST)", `₹${spWithGst.toFixed(2)}`, C.navy],
        ["Commission (15%)", `+ ₹${commission.toFixed(2)}`, C.red],
        ["Total (Intra-City)", `₹${intraCity.toFixed(2)}`, C.green],
        ["Total (Metro-Metro)", `₹${metroMetro.toFixed(2)}`, C.yellow],
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={s.modalSheet}>
                    <View style={s.pickerHandle} />
                    {/* Header */}
                    <View style={s.modalHeader}>
                        <View style={s.modalHeaderLeft}>
                            <View style={[s.modalIconBox, { backgroundColor: C.navy }]}>
                                <Text style={s.modalIconText}>{isAdd ? "+" : "✎"}</Text>
                            </View>
                            <Text style={s.modalHeaderTitle}>{isAdd ? "Add New Variant" : "Edit Variant"}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.modalClose}>
                            <Text style={s.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Color + Size row */}
                        <View style={s.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.fieldLabel}>Color *</Text>
                                <TouchableOpacity style={s.selectBtn} onPress={() => setShowColorPicker(true)}>
                                    {color ? <View style={[s.colorDotSmall, { backgroundColor: COLOR_HEX[color] || "#9CA3AF" }]} /> : null}
                                    <Text style={[s.selectBtnText, !color && { color: C.textLight }]}>{color || "Select color"}</Text>
                                    <Text style={s.chevron}>▾</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ width: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.fieldLabel}>Size *</Text>
                                <TouchableOpacity style={s.selectBtn} onPress={() => setShowSizePicker(true)}>
                                    <Text style={[s.selectBtnText, !size && { color: C.textLight }]}>{size || "Select size"}</Text>
                                    <Text style={s.chevron}>▾</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={s.fieldLabel}>Stock Quantity *</Text>
                        <TextInput
                            style={s.textInput}
                            placeholder="e.g. 15"
                            placeholderTextColor={C.textLight}
                            value={stock}
                            onChangeText={setStock}
                            keyboardType="numeric"
                        />

                        <View style={s.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.fieldLabel}>MRP (Excl. GST) *</Text>
                                <View style={s.prefixInput}>
                                    <Text style={s.prefixText}>₹</Text>
                                    <TextInput
                                        style={s.prefixInner}
                                        placeholder="0.00"
                                        placeholderTextColor={C.textLight}
                                        value={mrp}
                                        onChangeText={setMrp}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={{ width: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.fieldLabel}>Discount (%) *</Text>
                                <View style={s.prefixInput}>
                                    <TextInput
                                        style={s.prefixInner}
                                        placeholder="0"
                                        placeholderTextColor={C.textLight}
                                        value={discount}
                                        onChangeText={setDiscount}
                                        keyboardType="numeric"
                                    />
                                    <Text style={s.prefixText}>%</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={s.fieldLabel}>GST (%)</Text>
                        <TextInput
                            style={s.textInput}
                            placeholder="5"
                            placeholderTextColor={C.textLight}
                            value={gst}
                            onChangeText={setGst}
                            keyboardType="numeric"
                        />

                        {isAdd && (
                            <>
                                <Text style={s.fieldLabel}>Variant Image URL</Text>
                                <TextInput
                                    style={s.textInput}
                                    placeholder="https://example.com/image.jpg"
                                    placeholderTextColor={C.textLight}
                                    value={imageUri}
                                    onChangeText={setImageUri}
                                    autoCapitalize="none"
                                />
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={s.imagePreview} />
                                ) : null}
                            </>
                        )}

                        {mrp && discount ? (
                            <View style={s.calcBox}>
                                <Text style={s.calcTitle}>Live Calculations</Text>
                                {calcRows.map(([lbl, val, col]) => (
                                    <View key={lbl} style={s.calcRow}>
                                        <Text style={s.calcLabel}>{lbl}</Text>
                                        <Text style={[s.calcValue, { color: col }]}>{val}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={s.modalFooter}>
                        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                            <Text style={s.saveBtnText}>{isAdd ? "＋ Add Variant" : "💾 Save Changes"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <PickerSheet
                visible={showColorPicker}
                options={COLOR_OPTIONS}
                onSelect={setColor}
                onClose={() => setShowColorPicker(false)}
                withDot
            />
            <PickerSheet
                visible={showSizePicker}
                options={SIZE_OPTIONS}
                onSelect={setSize}
                onClose={() => setShowSizePicker(false)}
            />
            <Toast
                visible={showSuccess}
                title={isAdd ? "Variant Added!" : "Changes Saved!"}
                subtitle={`${color} · Size ${size} updated.`}
            />
        </Modal>
    );
}

// ─── Variants Tab ─────────────────────────────────────────────
function VariantsTab({
    variants, onAdd, onDelete, onEdit,
}: {
    variants: Variant[];
    onAdd: () => void;
    onDelete: (id: string) => void;
    onEdit: (v: Variant) => void;
}) {
    const totalStock = variants.reduce((a, v) => a + v.stock, 0);
    const avgPrice = variants.length
        ? variants.reduce((a, v) => a + v.sellingPriceWithGst, 0) / variants.length
        : 0;

    return (
        <View>
            {variants.length > 0 && (
                <View style={s.variantStats}>
                    <View style={s.statCol}>
                        <Text style={s.statLabel}>Total Variants</Text>
                        <Text style={[s.statValue, { color: C.navy }]}>{variants.length}</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statCol}>
                        <Text style={s.statLabel}>Total Stock</Text>
                        <Text style={[s.statValue, { color: C.green }]}>{totalStock} units</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statCol}>
                        <Text style={s.statLabel}>Avg. Price</Text>
                        <Text style={[s.statValue, { color: C.navy }]}>₹{avgPrice.toFixed(0)}</Text>
                    </View>
                </View>
            )}

            <View style={s.variantListHeader}>
                <Text style={s.variantListTitle}>Variants ({variants.length})</Text>
                <TouchableOpacity style={s.addVariantBtn} onPress={onAdd}>
                    <Text style={s.addVariantBtnText}>＋ Add</Text>
                </TouchableOpacity>
            </View>

            {variants.length === 0 ? (
                <View style={s.emptyVariants}>
                    <Text style={{ fontSize: 40 }}>⚙</Text>
                    <Text style={s.emptyTitle}>No Variants Yet</Text>
                    <Text style={s.emptySubtitle}>Tap "Add" to create the first variant</Text>
                </View>
            ) : (
                variants.map((v) => <VariantCard key={v.id} variant={v} onDelete={onDelete} onEdit={onEdit} />)
            )}
        </View>
    );
}

function VariantCard({ variant: v, onDelete, onEdit }: { variant: Variant; onDelete: (id: string) => void; onEdit: (v: Variant) => void }) {
    return (
        <View style={s.variantCard}>
            <View style={s.variantCardHeader}>
                {v.imageUri ? (
                    <Image source={{ uri: v.imageUri }} style={s.variantThumb} />
                ) : (
                    <View style={[s.variantColorDot, { backgroundColor: v.colorHex, borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border }]} />
                )}
                <View style={{ flex: 1 }}>
                    <Text style={s.variantCardName}>{v.color} · {v.size}</Text>
                    <Text style={s.variantCardSku}>{v.sku} · {v.stock} units</Text>
                </View>
                <View style={[s.discBadge, { backgroundColor: C.greenPale }]}>
                    <Text style={[s.discBadgeText, { color: "#16A34A" }]}>{v.discount}% OFF</Text>
                </View>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.navy, marginLeft: 6 }]} onPress={() => onEdit(v)}>
                    <Text style={{ color: C.white, fontSize: 12 }}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.red, marginLeft: 4 }]} onPress={() => onDelete(v.id)}>
                    <Text style={{ color: C.white, fontSize: 12 }}>🗑</Text>
                </TouchableOpacity>
            </View>

            <View style={s.variantPriceGrid}>
                {([
                    ["MRP", `₹${v.mrpExclGst.toFixed(2)}`, C.red, C.bg],
                    ["Ex GST", `₹${v.sellingPriceExGst.toFixed(2)}`, C.textDark, C.bg],
                    [`GST ${v.gstPercent}%`, `+₹${v.gstAmount.toFixed(2)}`, C.orange, C.bg],
                    ["With GST", `₹${v.sellingPriceWithGst.toFixed(2)}`, C.navy, C.bg],
                    ["Intra-City", `₹${v.totalIntraCity.toFixed(2)}`, C.green, "#F0FDF4"],
                    ["Metro", `₹${v.totalMetroMetro.toFixed(2)}`, C.yellow, "#FFFBEB"],
                ] as [string, string, string, string][]).map(([lbl, val, col, bg]) => (
                    <View key={lbl} style={[s.priceCell, { backgroundColor: bg }]}>
                        <Text style={s.priceCellLabel}>{lbl}</Text>
                        <Text style={[s.priceCellValue, { color: col }]}>{val}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ p }: { p: typeof MOCK_PRODUCT }) {
    return (
        <View>
            <Card>
                <SectionHeader icon="📝" title="Full Description" />
                <Text style={s.descText}>{p.description}</Text>
            </Card>
            <Card>
                <SectionHeader icon="🏷" title="Classification" />
                {[
                    ["Category", p.category], ["Subcategory", p.subcategory],
                    ["Color", p.color], ["Size", p.size],
                    ["HSN Code", p.hsnCode], ["GST", p.gst, C.orange],
                    ["Material", p.material], ["Return", p.returnPolicy],
                    ["Warranty", p.warranty],
                ].map(([l, v, col]) => <InfoRow key={l} label={l as string} value={v as string} valueColor={col as string} />)}
            </Card>
            <Card>
                <SectionHeader icon="📦" title="Inventory" />
                {[
                    ["Stock Quantity", `${p.stock} units`, C.green],
                    ["Status", p.status, getStatusStyle(p.status).color],
                    ["Last Updated", p.updated],
                    ["Created At", p.createdAt],
                    ["Approved At", p.approvedAt],
                ].map(([l, v, col]) => <InfoRow key={l} label={l as string} value={v as string} valueColor={col as string} />)}
            </Card>
            <Card>
                <SectionHeader icon="🔔" title="Admin Notes" />
                <View style={s.adminNotesBox}>
                    <Text style={s.adminNotesText}>{p.adminNotes}</Text>
                </View>
            </Card>
        </View>
    );
}

// ─── Specs Tab ────────────────────────────────────────────────
function SpecsTab({ p }: { p: typeof MOCK_PRODUCT }) {
    return (
        <View>
            <Card>
                <SectionHeader icon="📋" title="Specifications" />
                {p.specifications.map((sp, i) => <InfoRow key={i} label={sp.label} value={sp.value} />)}
            </Card>
            <Card>
                <SectionHeader icon="⚡" title="Key Features" />
                {p.features.map((f, i) => (
                    <View key={i} style={[s.featureRow, i < p.features.length - 1 && s.featureRowBorder]}>
                        <View style={s.featureCheck}>
                            <Text style={{ fontSize: 12, color: C.green }}>✓</Text>
                        </View>
                        <Text style={s.featureText}>{f}</Text>
                    </View>
                ))}
            </Card>
            <Card>
                <SectionHeader icon="📦" title="Package & Handling" />
                {[
                    ["Box Dimensions", p.packaging.boxDimensions],
                    ["Gross Weight", p.packaging.grossWeight],
                    ["Packaging Type", p.packaging.packagingType],
                    ["Fragile", p.packaging.fragile ? "Yes" : "No", p.packaging.fragile ? C.red : C.green],
                    ["Product Weight", p.weight],
                    ["Dimensions", p.dimensions],
                ].map(([l, v, col]) => <InfoRow key={l as string} label={l as string} value={v as string} valueColor={col as string} />)}
            </Card>
        </View>
    );
}

// ─── Delivery Tab ─────────────────────────────────────────────
function DeliveryTab({ p }: { p: typeof MOCK_PRODUCT }) {
    return (
        <View>
            <Card>
                <SectionHeader icon="🚚" title="Delivery Information" />
                <View style={s.deliveryBanner}>
                    <Text style={{ fontSize: 26 }}>🗓</Text>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={s.deliveryBannerTitle}>Estimated: {p.delivery.estimated}</Text>
                        <Text style={s.deliveryBannerSub}>Available across {p.delivery.locations}</Text>
                    </View>
                </View>
                {[
                    ["Standard Delivery", `Free above ${p.delivery.freeAbove}`, C.green],
                    ["Express Delivery", p.delivery.expressAvailable ? `Available · ${p.delivery.expressCharge}` : "Not available", p.delivery.expressAvailable ? C.blue : C.red],
                    ["Cash on Delivery", p.delivery.cod ? `Available · ${p.delivery.codCharge}` : "Not available", p.delivery.cod ? C.green : C.red],
                    ["Coverage", p.delivery.locations],
                ].map(([l, v, col]) => <InfoRow key={l as string} label={l as string} value={v as string} valueColor={col as string} />)}
            </Card>
            <Card>
                <SectionHeader icon="₹" title="Delivery Charges by Zone" />
                <View style={s.zoneHeader}>
                    {["Zone", "Standard", "Express"].map((h) => (
                        <Text key={h} style={[s.zoneHeaderText, h !== "Zone" && { textAlign: "center" }]}>{h}</Text>
                    ))}
                </View>
                {p.deliveryCharges.map((row, i) => (
                    <View key={i} style={[s.zoneRow, { backgroundColor: i % 2 === 0 ? C.white : C.bg }]}>
                        <Text style={[s.zoneCell, { flex: 2 }]}>{row.zone}</Text>
                        <Text style={[s.zoneCell, { textAlign: "center", color: C.green, fontWeight: "600" }]}>{row.standard}</Text>
                        <Text style={[s.zoneCell, { textAlign: "center", color: C.blue, fontWeight: "600" }]}>{row.express}</Text>
                    </View>
                ))}
            </Card>
        </View>
    );
}

// ─── Return Tab ───────────────────────────────────────────────
function ReturnTab({ p }: { p: typeof MOCK_PRODUCT }) {
    return (
        <View>
            <Card>
                <SectionHeader icon="↩" title="Return Policy" />
                <View style={s.returnBanner}>
                    <Text style={{ fontSize: 26 }}>✅</Text>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={s.returnBannerTitle}>{p.returnDetails.window} Return Window</Text>
                        <Text style={s.returnBannerSub}>Hassle-free returns accepted</Text>
                    </View>
                </View>
                {[
                    ["Return Window", p.returnDetails.window, C.green],
                    ["Refund Mode", p.returnDetails.refundMode],
                    ["Warranty", p.warranty, C.navy],
                ].map(([l, v, col]) => <InfoRow key={l as string} label={l as string} value={v as string} valueColor={col as string} />)}
            </Card>
            <Card>
                <SectionHeader icon="📋" title="Return Conditions" />
                {p.returnDetails.conditions.map((c, i) => (
                    <View key={i} style={[s.conditionRow, i < p.returnDetails.conditions.length - 1 && s.featureRowBorder]}>
                        <View style={s.conditionNum}>
                            <Text style={s.conditionNumText}>{i + 1}</Text>
                        </View>
                        <Text style={s.featureText}>{c}</Text>
                    </View>
                ))}
            </Card>
            <Card>
                <SectionHeader icon="🔄" title="Return Process" />
                <View style={s.returnProcessBox}>
                    <Text style={s.returnProcessText}>{p.returnDetails.process}</Text>
                </View>
            </Card>
        </View>
    );
}

// ─── Size Chart Tab ───────────────────────────────────────────
function SizeChartTab({ chart }: { chart: typeof MOCK_PRODUCT.sizeChart }) {
    const cols = ["Size", "Chest", "Waist", "Hip", "Length"];
    return (
        <Card>
            <SectionHeader icon="📏" title="Size Chart" />
            <Text style={s.sizeChartNote}>All measurements are in inches</Text>
            <View style={s.sizeChartHead}>
                {cols.map((c) => <Text key={c} style={s.sizeChartHeadText}>{c}</Text>)}
            </View>
            {chart.map((row, idx) => (
                <View key={row.size} style={[s.sizeChartRow, { backgroundColor: idx % 2 === 0 ? C.white : "#F8F9FD" }]}>
                    <View style={{ flex: 1, alignItems: "center" }}>
                        <View style={s.sizeBadge}>
                            <Text style={s.sizeBadgeText}>{row.size}</Text>
                        </View>
                    </View>
                    {[row.chest, row.waist, row.hip, row.length].map((v, i) => (
                        <Text key={i} style={s.sizeChartCell}>{v}"</Text>
                    ))}
                </View>
            ))}
            <View style={s.sizeChartNote2}>
                <Text>ℹ️</Text>
                <Text style={s.sizeChartNoteText}> Measure yourself and compare with the chart for the best fit.</Text>
            </View>
        </Card>
    );
}

// ─── Tab definitions ──────────────────────────────────────────
const TABS = [
    { id: "overview", label: "Overview", icon: "ℹ" },
    { id: "variants", label: "Variants", icon: "⚙" },
    { id: "specifications", label: "Specs", icon: "📋" },
    { id: "delivery", label: "Delivery", icon: "🚚" },
    { id: "return", label: "Returns", icon: "↩" },
    { id: "sizechart", label: "Size Chart", icon: "📏" },
];

// ─── Main Screen ──────────────────────────────────────────────
export default function ProductDetailScreen() {
    const [p] = useState(MOCK_PRODUCT);
    const [activeImg, setActiveImg] = useState(0);
    const [activeTab, setActiveTab] = useState("overview");
    const [variants, setVariants] = useState<Variant[]>(MOCK_PRODUCT.variants);
    const [showAddVariant, setShowAddVariant] = useState(false);
    const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
    const [toast, setToast] = useState({ visible: false, title: "", subtitle: "" });

    const showToast = (title: string, subtitle: string) => {
        setToast({ visible: true, title, subtitle });
        setTimeout(() => setToast({ visible: false, title: "", subtitle: "" }), 1700);
    };

    const handleAddVariant = useCallback((v: Variant) => {
        setVariants((prev) => [...prev, v]);
        showToast("Variant Added!", `${v.color} · Size ${v.size} added.`);
    }, []);

    const handleDeleteVariant = useCallback((id: string) => {
        setVariants((prev) => prev.filter((v) => v.id !== id));
        showToast("Variant Deleted", "Variant removed successfully.");
    }, []);

    const handleSaveVariant = useCallback((updated: Variant) => {
        setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    }, []);

    const uniqueColors = variants.filter((v, i, arr) => arr.findIndex((x) => x.color === v.color) === i);
    const uniqueSizes = [...new Set(variants.map((v) => v.size))];
    const st = getStatusStyle(p.status);

    return (
        <AdminLayout>
        <SafeAreaView style={s.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

            {/* Header */}
            <View style={s.header}>
                <View style={s.headerLeft}>
                    <Text style={s.headerTitle}>Product Details</Text>
                    <Text style={s.headerSub}>SKU: {p.sku} · Updated: {p.updated}</Text>
                </View>
                <TouchableOpacity style={s.addVariantHeaderBtn} onPress={() => { setActiveTab("variants"); setShowAddVariant(true); }}>
                    <Text style={s.addVariantHeaderBtnText}>＋ Variant</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={isWeb ? { maxWidth: 1200, alignSelf: "center", width: "100%", paddingVertical: 16 } : undefined}>
                <View style={[isWeb && s.webTopSection]}>
                    <View style={[isWeb && s.webImageCol]}>
                        {/* Hero Image */}
                        <View style={[s.heroContainer, isWeb && s.heroContainerWeb]}>
                            <Image source={{ uri: p.images[activeImg] }} style={[s.heroImage, isWeb && s.heroImageWeb]} />
                            <View style={s.discOverlay}>
                                <Text style={s.discOverlayText}>{p.discount}% OFF</Text>
                            </View>
                            <View style={s.stockOverlay}>
                                <Text style={s.stockOverlayText}>✓ {p.stock} units</Text>
                            </View>
                        </View>

                        {/* Thumbnail strip */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.thumbStrip, isWeb && s.thumbStripWeb]} contentContainerStyle={[{ paddingHorizontal: 16, gap: 8 }, isWeb && { paddingHorizontal: 0 }]}>
                            {p.images.map((img, i) => (
                                <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                                    <Image source={{ uri: img }} style={[s.thumb, { borderColor: i === activeImg ? C.navy : C.border }]} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={[s.contentPad, isWeb && s.webInfoCol]}>
                        {/* Product info */}
                        <View style={[s.productInfoCard, isWeb && s.productInfoCardWeb]}>
                        <View style={s.row}>
                            <View style={s.categoryBadge}>
                                <Text style={s.categoryBadgeText}>{p.category} · {p.subcategory}</Text>
                            </View>
                            <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                <View style={[s.statusDot, { backgroundColor: st.color }]} />
                                <Text style={[s.statusText, { color: st.color }]}>{p.status}</Text>
                            </View>
                        </View>

                        <Text style={s.productName}>{p.name}</Text>
                        <Text style={s.productSku}>SKU: {p.sku}</Text>

                        <View style={s.priceRow}>
                            <Text style={s.priceMain}>₹{p.price.toLocaleString()}</Text>
                            <Text style={s.priceMrp}>₹{p.mrpExclGst.toLocaleString()}</Text>
                            <View style={s.saveBadge}>
                                <Text style={s.saveBadgeText}>Save {p.discount}%</Text>
                            </View>
                        </View>
                        <Text style={s.priceNote}>
                            MRP excl. GST ₹{p.mrpExclGst.toLocaleString()} · incl. GST ₹{p.mrpInclGst.toLocaleString()} · GST {p.gst}
                        </Text>

                        {/* Quick specs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
                            {([["Material", p.material], ["Weight", p.weight], ["HSN", p.hsnCode], ["Warranty", p.warranty]] as [string, string][]).map(([l, v]) => (
                                <View key={l} style={s.quickSpec}>
                                    <Text style={s.quickSpecLabel}>{l}</Text>
                                    <Text style={s.quickSpecValue}>{v}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Colors */}
                        {uniqueColors.length > 0 && (
                            <View style={{ marginTop: 14 }}>
                                <Text style={s.attrLabel}>AVAILABLE COLORS</Text>
                                <View style={s.colorRow}>
                                    {uniqueColors.map((v) => (
                                        <View key={v.id} style={s.colorItem}>
                                            <View style={[s.colorCircle, { backgroundColor: v.colorHex, borderWidth: v.color === "White" ? 1.5 : 0, borderColor: C.border }]} />
                                            <Text style={s.colorName}>{v.color}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Sizes */}
                        {uniqueSizes.length > 0 && (
                            <View style={{ marginTop: 14 }}>
                                <Text style={s.attrLabel}>AVAILABLE SIZES</Text>
                                <View style={s.sizeRow}>
                                    {uniqueSizes.map((size, i) => (
                                        <View key={i} style={s.sizePill}>
                                            <Text style={s.sizePillText}>{size}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>
                </View>

                <View style={[s.contentPad, { paddingTop: 0 }]}>
                    {/* Tab bar */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ padding: 6, gap: 6 }}>
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => setActiveTab(tab.id)}
                                    style={[s.tabBtn, isActive && s.tabBtnActive]}
                                >
                                    <Text style={s.tabIcon}>{tab.icon}</Text>
                                    <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
                                    {tab.id === "variants" && (
                                        <View style={[s.variantBadge, isActive && s.variantBadgeActive]}>
                                            <Text style={[s.variantBadgeText, isActive && { color: C.white }]}>{variants.length}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Tab content */}
                    <View style={{ paddingBottom: 40 }}>
                        {activeTab === "overview" && <OverviewTab p={p} />}
                        {activeTab === "variants" && (
                            <VariantsTab
                                variants={variants}
                                onAdd={() => setShowAddVariant(true)}
                                onDelete={handleDeleteVariant}
                                onEdit={setEditingVariant}
                            />
                        )}
                        {activeTab === "specifications" && <SpecsTab p={p} />}
                        {activeTab === "delivery" && <DeliveryTab p={p} />}
                        {activeTab === "return" && <ReturnTab p={p} />}
                        {activeTab === "sizechart" && <SizeChartTab chart={p.sizeChart} />}
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <VariantModal
                visible={showAddVariant}
                variant={null}
                mode="add"
                onClose={() => setShowAddVariant(false)}
                onSave={(v) => { handleAddVariant(v); setShowAddVariant(false); }}
            />
            {editingVariant && (
                <VariantModal
                    visible={!!editingVariant}
                    variant={editingVariant}
                    mode="edit"
                    onClose={() => setEditingVariant(null)}
                    onSave={(updated) => { handleSaveVariant(updated); setEditingVariant(null); }}
                />
            )}

            <Toast visible={toast.visible} title={toast.title} subtitle={toast.subtitle} />
        </SafeAreaView>
        </AdminLayout>
    );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.navyDeep },

    // Header
    header: { backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
    headerLeft: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: C.white },
    headerSub: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },
    addVariantHeaderBtn: { backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addVariantHeaderBtnText: { color: C.white, fontWeight: "700", fontSize: 13 },

    // Hero
    heroContainer: { position: "relative" },
    heroImage: { width: SCREEN_WIDTH, height: 280, resizeMode: "cover" },
    discOverlay: { position: "absolute", top: 14, left: 14, backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    discOverlayText: { color: C.white, fontWeight: "800", fontSize: 12 },
    stockOverlay: { position: "absolute", top: 14, right: 14, backgroundColor: "rgba(240,253,244,0.92)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.green },
    stockOverlayText: { color: C.green, fontWeight: "700", fontSize: 11 },

    // Thumbnails
    thumbStrip: { backgroundColor: C.white, paddingVertical: 10 },
    thumb: { width: 64, height: 64, borderRadius: 10, borderWidth: 2, resizeMode: "cover" },

    // Content
    contentPad: { backgroundColor: C.bg, paddingTop: 12 },
    productInfoCard: { backgroundColor: C.white, marginHorizontal: 12, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border },
    row: { flexDirection: "row", alignItems: "center" },

    categoryBadge: { backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
    categoryBadgeText: { fontSize: 11, fontWeight: "600", color: C.purple },
    statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: "auto" },
    statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },
    statusText: { fontSize: 11, fontWeight: "700" },

    productName: { fontSize: 22, fontWeight: "800", color: C.textDark, marginTop: 10, marginBottom: 2 },
    productSku: { fontSize: 12, color: C.textLight, marginBottom: 12 },

    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 },
    priceMain: { fontSize: 28, fontWeight: "800", color: C.orange },
    priceMrp: { fontSize: 15, color: C.textLight, textDecorationLine: "line-through" },
    saveBadge: { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    saveBadgeText: { color: C.green, fontWeight: "700", fontSize: 11 },
    priceNote: { fontSize: 11, color: C.textLight, marginBottom: 4 },

    quickSpec: { backgroundColor: C.bg, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.border, minWidth: 90 },
    quickSpecLabel: { fontSize: 10.5, color: C.textLight, marginBottom: 3 },
    quickSpecValue: { fontSize: 12, fontWeight: "700", color: C.textDark },

    attrLabel: { fontSize: 11, color: C.textLight, fontWeight: "600", marginBottom: 8, letterSpacing: 0.5 },
    colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    colorItem: { alignItems: "center", gap: 4 },
    colorCircle: { width: 30, height: 30, borderRadius: 15 },
    colorName: { fontSize: 10.5, color: C.textMid },
    sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    sizePill: { backgroundColor: C.purplePale, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.purpleLight },
    sizePillText: { fontSize: 13, fontWeight: "700", color: C.navy },

    // Tab bar
    tabBar: { backgroundColor: C.white, borderRadius: 16, marginHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
    tabBtnActive: { backgroundColor: C.navy },
    tabIcon: { fontSize: 13 },
    tabLabel: { fontWeight: "600", fontSize: 13, color: C.textMid },
    tabLabelActive: { color: C.white },
    variantBadge: { backgroundColor: "#FFF7ED", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
    variantBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
    variantBadgeText: { fontSize: 11, fontWeight: "700", color: C.orange },

    // Card / shared
    card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, marginHorizontal: 12, borderWidth: 1, borderColor: C.border },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    sectionIconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#EEF1FF", alignItems: "center", justifyContent: "center" },
    sectionIconText: { fontSize: 14 },
    sectionTitle: { fontWeight: "700", fontSize: 13.5, color: C.navyLight },
    infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    infoLabel: { fontSize: 12.5, color: C.textLight, fontWeight: "500", flex: 1 },
    infoValue: { fontSize: 12.5, color: C.textDark, fontWeight: "600", textAlign: "right", maxWidth: "58%" },

    // Overview
    descText: { fontSize: 13.5, color: C.textMid, lineHeight: 22 },
    adminNotesBox: { backgroundColor: C.orangePale, borderLeftWidth: 3, borderLeftColor: C.orange, borderRadius: 10, padding: 12 },
    adminNotesText: { fontSize: 12.5, color: C.textMid, lineHeight: 22 },

    // Specs
    featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
    featureRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    featureCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.greenPale, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
    featureText: { fontSize: 13, color: C.textMid, lineHeight: 20, flex: 1 },

    // Delivery
    deliveryBanner: { flexDirection: "row", alignItems: "center", backgroundColor: C.bluePale, borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 14, marginBottom: 14 },
    deliveryBannerTitle: { fontWeight: "700", fontSize: 14, color: C.navy },
    deliveryBannerSub: { fontSize: 12, color: C.textMid, marginTop: 2 },
    zoneHeader: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 8, padding: 10, marginBottom: 4 },
    zoneHeaderText: { flex: 1, fontWeight: "700", fontSize: 11, color: C.textMid },
    zoneRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    zoneCell: { flex: 1, fontSize: 12.5, color: C.textDark },

    // Return
    returnBanner: { flexDirection: "row", alignItems: "center", backgroundColor: C.greenPale, borderWidth: 1, borderColor: "#86EFAC", borderRadius: 12, padding: 14, marginBottom: 14 },
    returnBannerTitle: { fontWeight: "700", fontSize: 14, color: C.green },
    returnBannerSub: { fontSize: 12, color: C.textMid, marginTop: 2 },
    conditionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
    conditionNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navyDeep, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
    conditionNumText: { fontSize: 11, fontWeight: "700", color: C.white },
    returnProcessBox: { backgroundColor: C.purplePale, borderRadius: 12, padding: 14 },
    returnProcessText: { fontSize: 13, color: C.purple, lineHeight: 22 },

    // Size chart
    sizeChartNote: { fontSize: 12, color: C.textLight, marginBottom: 16 },
    sizeChartHead: { flexDirection: "row", backgroundColor: C.navyDeep, borderRadius: 10, paddingVertical: 12, marginBottom: 4 },
    sizeChartHeadText: { flex: 1, textAlign: "center", fontWeight: "700", fontSize: 12, color: C.white },
    sizeChartRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    sizeChartCell: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "600", color: C.textDark },
    sizeBadge: { backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 3 },
    sizeBadgeText: { fontSize: 13, fontWeight: "700", color: C.purple },
    sizeChartNote2: { flexDirection: "row", alignItems: "flex-start", backgroundColor: C.bluePale, borderRadius: 10, padding: 14, marginTop: 14 },
    sizeChartNoteText: { fontSize: 13, color: C.textMid, flex: 1, lineHeight: 20 },

    // Variants
    variantStats: { flexDirection: "row", backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12, marginHorizontal: 12 },
    statCol: { flex: 1, alignItems: "center", gap: 4 },
    statDivider: { width: 1, backgroundColor: C.border },
    statLabel: { fontSize: 11, color: C.textLight },
    statValue: { fontSize: 16, fontWeight: "800" },
    variantListHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 12 },
    variantListTitle: { fontWeight: "700", fontSize: 15, color: C.textDark },
    addVariantBtn: { backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addVariantBtnText: { color: C.white, fontWeight: "700", fontSize: 12 },
    emptyVariants: { alignItems: "center", padding: 40, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 12, gap: 8 },
    emptyTitle: { fontWeight: "700", fontSize: 15, color: C.textMid },
    emptySubtitle: { fontSize: 12, color: C.textLight },

    variantCard: { backgroundColor: C.white, borderRadius: 14, padding: 12, marginBottom: 10, marginHorizontal: 12, borderWidth: 1, borderColor: C.border },
    variantCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    variantThumb: { width: 36, height: 36, borderRadius: 8, resizeMode: "cover" },
    variantColorDot: { width: 22, height: 22, borderRadius: 11 },
    variantCardName: { fontWeight: "700", fontSize: 13, color: C.textDark },
    variantCardSku: { fontSize: 10.5, color: C.textLight, marginTop: 2 },
    discBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    discBadgeText: { fontSize: 10.5, fontWeight: "700" },
    iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    variantPriceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    priceCell: { borderRadius: 8, padding: 7, minWidth: "30%", flex: 1 },
    priceCellLabel: { fontSize: 10, color: C.textLight, marginBottom: 2 },
    priceCellValue: { fontSize: 12, fontWeight: "700" },

    // Modal
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    modalSheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", flexDirection: "column" },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    modalIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    modalIconText: { color: C.white, fontSize: 16, fontWeight: "700" },
    modalHeaderTitle: { fontWeight: "700", fontSize: 16, color: C.textDark },
    modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    modalCloseText: { fontSize: 16, color: C.textMid },
    modalBody: { padding: 20 },
    modalFooter: { padding: 16, paddingBottom: 24 },

    // Form
    fieldLabel: { fontWeight: "600", fontSize: 12, color: C.textMid, marginBottom: 6, marginTop: 12 },
    textInput: { backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, padding: 11, fontSize: 13, color: C.textDark },
    prefixInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12 },
    prefixText: { fontWeight: "600", fontSize: 14, color: C.textMid },
    prefixInner: { flex: 1, padding: 11, fontSize: 13, color: C.textDark },
    selectBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, padding: 11, gap: 6 },
    selectBtnText: { flex: 1, fontSize: 13, color: C.textDark },
    chevron: { color: C.textLight },
    imagePreview: { width: "100%", height: 120, borderRadius: 12, marginTop: 8, resizeMode: "cover" },

    // Calc box
    calcBox: { marginTop: 16, backgroundColor: "#F8F9FD", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
    calcTitle: { fontWeight: "700", fontSize: 12, color: C.navyLight, marginBottom: 10 },
    calcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.white, borderRadius: 8, padding: 8, marginBottom: 4 },
    calcLabel: { fontSize: 11.5, color: C.textMid },
    calcValue: { fontSize: 12, fontWeight: "600" },

    // Save button
    saveBtn: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
    saveBtnText: { color: C.white, fontWeight: "700", fontSize: 15 },

    // Picker sheet
    pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
    pickerSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "55%", paddingBottom: 32 },
    pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
    pickerItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    pickerItemText: { fontSize: 14, fontWeight: "500", color: C.textDark },
    colorDot: { width: 16, height: 16, borderRadius: 8 },
    colorDotSmall: { width: 12, height: 12, borderRadius: 6 },

    // Toast
    toastOverlay: { position: "absolute", inset: 0, top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", zIndex: 9999 },
    toastBox: { backgroundColor: C.white, borderRadius: 24, padding: 34, alignItems: "center", width: 260 },
    toastIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.green, alignItems: "center", justifyContent: "center", marginBottom: 20 },
    toastIconText: { fontSize: 34, color: C.white, fontWeight: "700" },
    toastTitle: { fontWeight: "800", fontSize: 20, color: C.textDark, marginBottom: 6, textAlign: "center" },
    toastSubtitle: { fontSize: 13, color: C.textLight, textAlign: "center", lineHeight: 20 },

    // Web Layout overrides
    webTopSection: { flexDirection: "row", marginHorizontal: 12, paddingBottom: 0, gap: 24, alignItems: "flex-start" },
    webImageCol: { width: 420, flexShrink: 0 },
    heroContainerWeb: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
    heroImageWeb: { width: "100%", height: 380 },
    thumbStripWeb: { backgroundColor: "transparent", paddingVertical: 0 },
    webInfoCol: { flex: 1, backgroundColor: "transparent", paddingTop: 0 },
    productInfoCardWeb: { marginHorizontal: 0, marginBottom: 0 },
});