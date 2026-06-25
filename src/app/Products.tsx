import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { mapProductListRow } from "@/lib/mappers";
import { fetchAdminCatalogProducts } from "@/services/productApi";
import AdminLayout from "@/components/admin-layout";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, StatusBar, SafeAreaView, Image, Modal,
    TextInput, Platform, PanResponder, Switch, ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
// Fonts are referenced by fontFamily but the expo font package is handled globally in the app.

// ─── NOTE ────────────────────────────────────────────────────────────────────
// This is a pure UI template. Replace MOCK_PRODUCTS with real data from your
// API hook (useSellerProducts), and wire up the action handlers to your
// existing service calls (deleteProduct, fetchProductDeliverySettings, etc.).
// All navigations have been removed — wire them up as needed.
// ─────────────────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
    navy: "#1E2B6B",      navyDeep: "#151D4F",   navyMid: "#1A2B5E",   navyLight: "#2D3E8A",
    purple: "#6C63FF",    purpleLight: "#A89CFF", purplePale: "#F0EEFF",
    green: "#22C55E",     greenLight: "#86EFAC",  greenPale: "#F0FDF4",
    red: "#EF4444",       redLight: "#FCA5A5",    redPale: "#FEF2F2",
    yellow: "#F59E0B",    yellowPale: "#FFFBEB",
    blue: "#3B82F6",      bluePale: "#EFF6FF",
    orange: "#F97316",    orangePale: "#FFF7ED",
    teal: "#14B8A6",      cyan: "#06B6D4",
    white: "#FFFFFF",     bg: "#F7F8FC",          card: "#FFFFFF",
    border: "#E5E7EB",    textDark: "#111827",     textMid: "#374151",   textLight: "#9CA3AF",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewType = "list" | "grid";
type TabType = "All Products" | "Active" | "Inactive" | "Out of Stock" | "Low Stock";
type SortType = "Latest" | "Oldest" | "Price: Low-High" | "Price: High-Low" | "Name A-Z";

export interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    subcategory: string;
    subSubcategory: string;
    color: string;
    size: string;
    price: number;
    stock: number;
    status: "Active" | "Inactive" | "Out of Stock";
    image: string;
    updated: string;
}

// ─── Mock Data — replace with useSellerProducts() ────────────────────────────
const MOCK_PRODUCTS: Product[] = [
    { id: "1",  name: "Air Max Running Shoes",       sku: "SKU-00124", category: "Footwear",    subcategory: "Sneakers",   subSubcategory: "Running",     color: "Black",  size: "42",   price: 4299,  stock: 24, status: "Active",       image: "", updated: "2 days ago"    },
    { id: "2",  name: "Sony WH-1000XM5 Headphones",  sku: "SKU-00118", category: "Electronics", subcategory: "Audio",      subSubcategory: "Headphones",  color: "Black",  size: "Free", price: 28990, stock: 7,  status: "Active",       image: "", updated: "5 days ago"    },
    { id: "3",  name: "Wildcraft Laptop Backpack",   sku: "SKU-00109", category: "Bags",        subcategory: "Backpacks",  subSubcategory: "Laptop",      color: "Blue",   size: "Free", price: 1849,  stock: 0,  status: "Out of Stock", image: "", updated: "1 week ago"    },
    { id: "4",  name: "Uniqlo Graphic Tee",          sku: "SKU-00097", category: "Clothing",    subcategory: "T-Shirts",   subSubcategory: "Graphic",     color: "White",  size: "L",    price: 899,   stock: 56, status: "Inactive",     image: "", updated: "2 weeks ago"   },
    { id: "5",  name: "Ray-Ban Polarized Sunglasses",sku: "SKU-00083", category: "Accessories", subcategory: "Eyewear",    subSubcategory: "Polarized",   color: "Brown",  size: "Free", price: 6500,  stock: 14, status: "Active",       image: "", updated: "3 weeks ago"   },
    { id: "6",  name: "Puma Sneakers Low Top",       sku: "SKU-00076", category: "Footwear",    subcategory: "Sneakers",   subSubcategory: "Casual",      color: "White",  size: "40",   price: 3299,  stock: 8,  status: "Active",       image: "", updated: "3 weeks ago"   },
    { id: "7",  name: "Samsung Galaxy Buds Pro",     sku: "SKU-00071", category: "Electronics", subcategory: "Audio",      subSubcategory: "Earbuds",     color: "Purple", size: "Free", price: 11999, stock: 3,  status: "Active",       image: "", updated: "1 month ago"   },
    { id: "8",  name: "Levi's 511 Slim Fit Jeans",   sku: "SKU-00065", category: "Clothing",    subcategory: "Jeans",      subSubcategory: "Slim Fit",    color: "Blue",   size: "32",   price: 2499,  stock: 0,  status: "Out of Stock", image: "", updated: "1 month ago"   },
    { id: "9",  name: "Fossil Analog Watch",         sku: "SKU-00058", category: "Accessories", subcategory: "Watches",    subSubcategory: "Analog",      color: "Brown",  size: "Free", price: 8999,  stock: 19, status: "Active",       image: "", updated: "1 month ago"   },
    { id: "10", name: "Nike Dri-FIT Training Shorts",sku: "SKU-00044", category: "Clothing",    subcategory: "Shorts",     subSubcategory: "Training",    color: "Black",  size: "M",    price: 1299,  stock: 45, status: "Active",       image: "", updated: "2 months ago"  },
    { id: "11", name: "Adidas Ultraboost 22",        sku: "SKU-00038", category: "Footwear",    subcategory: "Sneakers",   subSubcategory: "Running",     color: "Gray",   size: "43",   price: 14999, stock: 6,  status: "Active",       image: "", updated: "2 months ago"  },
    { id: "12", name: "American Tourister Trolley",  sku: "SKU-00029", category: "Bags",        subcategory: "Travel Bags",subSubcategory: "Trolley",     color: "Red",    size: "Free", price: 4599,  stock: 0,  status: "Inactive",     image: "", updated: "3 months ago"  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const PRICE_MIN = 0;
const PRICE_MAX = 30000;
const SLIDER_W  = SW - 80;
const THUMB_S   = 24;
const LOW_STOCK_THRESHOLD = 10;

const TABS: { label: TabType; icon: string; color: string; bg: string }[] = [
    { label: "All Products", icon: "package-variant",      color: C.navy,   bg: "#EEF1FF"    },
    { label: "Active",       icon: "check-circle-outline", color: C.green,  bg: C.greenPale  },
    { label: "Inactive",     icon: "pause-circle-outline", color: C.yellow, bg: C.yellowPale },
    { label: "Out of Stock", icon: "close-circle-outline", color: C.red,    bg: C.redPale    },
    { label: "Low Stock",    icon: "alert-circle-outline", color: C.orange, bg: C.orangePale },
];

const CATEGORIES = ["All", "Footwear", "Electronics", "Bags", "Clothing", "Accessories", "Sports"];

const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
    Footwear:    { Sneakers: ["Running","Casual","Basketball","Training"], Formal: ["Oxford","Derby","Loafers"], Sandals: ["Flip Flops","Slides"], Boots: ["Ankle Boots","Chelsea Boots","Hiking Boots"] },
    Electronics: { Audio: ["Headphones","Earbuds","Speakers"], Wearables: ["Smartwatches","Fitness Bands"], Cameras: ["DSLR","Mirrorless","Action Cams"], Tablets: ["Android","iPad","Windows"] },
    Bags:        { Backpacks: ["Travel","Laptop","School"], Handbags: ["Tote","Clutch","Shoulder"], "Laptop Bags": ["Sleeves","Briefcases"], "Travel Bags": ["Trolley","Duffel"], Wallets: ["Bi-fold","Tri-fold"] },
    Clothing:    { "T-Shirts": ["Casual","Graphic","Polo"], Shirts: ["Formal","Casual"], Jeans: ["Slim Fit","Straight","Skinny"], Shorts: ["Training","Casual"], Jackets: ["Bomber","Denim","Leather"] },
    Accessories: { Wallets: ["Bi-fold","Tri-fold","Card Holders"], Eyewear: ["Polarized","Blue Light","Sports"], Watches: ["Analog","Digital","Smartwatch"], Headwear: ["Caps","Hats","Beanies"] },
    Sports:      { Gym: ["Gloves","Equipment","Hydration"], Yoga: ["Mats","Accessories","Blocks"], Cricket: ["Bats","Balls","Pads","Helmets"], Football: ["Boots","Balls","Shin Guards"] },
};

const SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(
    Object.entries(CATEGORY_TREE).map(([cat, subs]) => [cat, ["All", ...Object.keys(subs)]])
);

const COLOR_OPTIONS  = ["All","Red","Blue","Green","Black","White","Yellow","Pink","Purple","Orange","Gray","Brown"];
const SIZE_OPTIONS   = ["All","XS","S","M","L","XL","XXL","Free Size","28","30","32","34","36","38","40","42","43"];

const DOT_COLORS: Record<string, string> = {
    Red: "#EF4444", Blue: "#3B82F6", Green: "#22C55E", Black: "#1F2937",
    White: "#F9FAFB", Yellow: "#F59E0B", Pink: "#EC4899", Purple: "#8B5CF6",
    Orange: "#F97316", Gray: "#6B7280", Brown: "#92400E", All: C.navy,
};

const SORT_OPTIONS: { value: SortType; icon: string; desc: string }[] = [
    { value: "Latest",          icon: "clock-outline",               desc: "Newest first"       },
    { value: "Oldest",          icon: "clock-time-eight-outline",    desc: "Oldest first"       },
    { value: "Price: Low-High", icon: "trending-up",                 desc: "Cheapest first"     },
    { value: "Price: High-Low", icon: "trending-down",               desc: "Priciest first"     },
    { value: "Name A-Z",        icon: "sort-alphabetical-ascending", desc: "Alphabetical order" },
];

const VIEW_RANGE_OPTIONS = [20, 30, 50] as const;

const PRODUCT_ACTIONS = [
    { icon: "eye-outline",        label: "View Product",    color: C.blue,   bg: C.bluePale   },
    { icon: "pencil-outline",     label: "Edit Product",    color: C.purple, bg: C.purplePale },
    { icon: "map-marker-outline", label: "Update Location", color: C.teal,   bg: "#F0FDFA"    },
    { icon: "star-outline",       label: "Reviews",         color: C.yellow, bg: C.yellowPale },
    { icon: "trash-can-outline",  label: "Delete Product",  color: C.red,    bg: C.redPale    },
];

const truncateTitle = (title: string) => {
    if (!title) return "";
    let cleanTitle = title.replace(/[\x00-\x1F\x7F-\x9F\u2018-\u201F\u00B4\u0060\u25A1\uFFFD\u0092]/g, "'").replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x2019;/gi, "'");
    const words = cleanTitle.split(" ");
    return words.length > 3 ? words.slice(0, 3).join(" ") + "....." : cleanTitle;
};

// ─────────────────────────────────────────────────────────────────────────────
// RANGE SLIDER (mobile)
// ─────────────────────────────────────────────────────────────────────────────
interface RangeSliderProps {
    low: number; high: number; min?: number; max?: number; step?: number;
    onLowChange: (v: number) => void; onHighChange: (v: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
    low, high, min = PRICE_MIN, max = PRICE_MAX, step = 500,
    onLowChange, onHighChange,
}) => {
    const lowRef  = useRef(low);
    const highRef = useRef(high);
    lowRef.current  = low;
    highRef.current = high;

    const valToPos = useCallback((v: number) => ((v - min) / (max - min)) * SLIDER_W, [min, max]);
    const posToVal = useCallback((pos: number) => {
        const raw = (pos / SLIDER_W) * (max - min) + min;
        return Math.max(min, Math.min(max, Math.round(raw / step) * step));
    }, [min, max, step]);

    const lowStartX  = useRef(0);
    const highStartX = useRef(0);

    const lowPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { lowStartX.current = valToPos(lowRef.current); },
        onPanResponderMove: (_, gs) => {
            const newPos = Math.max(0, Math.min(lowStartX.current + gs.dx, valToPos(highRef.current) - THUMB_S));
            onLowChange(posToVal(newPos));
        },
    })).current;

    const highPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { highStartX.current = valToPos(highRef.current); },
        onPanResponderMove: (_, gs) => {
            const newPos = Math.max(valToPos(lowRef.current) + THUMB_S, Math.min(highStartX.current + gs.dx, SLIDER_W));
            onHighChange(posToVal(newPos));
        },
    })).current;

    const lowX  = valToPos(low);
    const highX = valToPos(high);

    return (
        <View style={rs.container}>
            <View style={rs.track}>
                <View style={[rs.fill, { left: lowX, width: Math.max(0, highX - lowX) }]} />
                <View {...lowPan.panHandlers} style={[rs.thumb, { left: lowX - THUMB_S / 2 }]}>
                    <View style={rs.thumbInner} />
                </View>
                <View {...highPan.panHandlers} style={[rs.thumb, { left: highX - THUMB_S / 2 }]}>
                    <View style={rs.thumbInner} />
                </View>
            </View>
            <View style={rs.labelRow}>
                <View style={rs.labelPill}><Text style={rs.labelTxt}>₹{low.toLocaleString()}</Text></View>
                <View style={rs.dash} />
                <View style={rs.labelPill}><Text style={rs.labelTxt}>₹{high.toLocaleString()}</Text></View>
            </View>
        </View>
    );
};

const rs = StyleSheet.create({
    container:   { paddingTop: 8, paddingBottom: 12 },
    track:       { height: 4, backgroundColor: C.border, borderRadius: 2, position: "relative", marginHorizontal: THUMB_S / 2, marginTop: 16 },
    fill:        { position: "absolute", height: 4, backgroundColor: C.navy, borderRadius: 2 },
    thumb:       { position: "absolute", top: -(THUMB_S / 2 - 2), width: THUMB_S, height: THUMB_S, borderRadius: THUMB_S / 2, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.navy, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 6 },
    thumbInner:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navy },
    labelRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 8 },
    labelPill:   { flex: 1, backgroundColor: C.bg, borderRadius: 9, borderWidth: 1, borderColor: C.border, paddingVertical: 8, alignItems: "center" },
    labelTxt:    { fontSize: 13, color: C.navy },
    dash:        { width: 16, height: 1.5, backgroundColor: C.border, borderRadius: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE FILTER CHIP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const WrapChipGroup = ({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {options.map(opt => (
            <TouchableOpacity key={opt} style={[fs.chip, selected === opt && fs.chipActive]} onPress={() => onSelect(opt)}>
                <Text style={[fs.chipText, selected === opt && fs.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

const WrapColorGroup = ({ selected, onSelect }: { selected: string; onSelect: (v: string) => void }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {COLOR_OPTIONS.map(col => {
            const isSelected = selected === col;
            return (
                <TouchableOpacity key={col} style={[fs.colorChip, isSelected && { borderColor: DOT_COLORS[col] ?? C.navy, borderWidth: 2.5 }]} onPress={() => onSelect(col)}>
                    {col !== "All" && (
                        <View style={[fs.colorDot, { backgroundColor: DOT_COLORS[col] ?? "#ccc", borderWidth: col === "White" ? 1 : 0, borderColor: C.border }]} />
                    )}
                    <Text style={[fs.chipText, isSelected && { color: C.navy, }]}>{col}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY LOCATIONS MODAL (UI only — wire up your API calls)
// ─────────────────────────────────────────────────────────────────────────────
interface DeliveryLocationsModalProps {
    product: Product | undefined;
    onClose: () => void;
}

const DeliveryLocationsModal: React.FC<DeliveryLocationsModalProps> = ({ product, onClose }) => {
    if (!product) return null;

    const [deliverAll, setDeliverAll]           = useState(true);
    const [pincodeQuery, setPincodeQuery]       = useState("");
    const [selectedCountry, setSelectedCountry] = useState("India");
    const [selectedState, setSelectedState]     = useState("All States");
    const [selectedCity, setSelectedCity]       = useState("All Cities");
    const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
    const [selectAll, setSelectAll]             = useState(false);
    const [saving, setSaving]                   = useState(false);

    type SelectorType = "country" | "state" | "city" | null;
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [selectorType, setSelectorType]       = useState<SelectorType>(null);
    const [selectorOptions, setSelectorOptions] = useState<string[]>([]);

    // ── Mock pincode data — replace with fetchProductDeliverySettings() ──────
    const MOCK_PINCODES = [
        { id: "p1", pincode: "110001", area: "Connaught Place", city: "New Delhi",  state: "Delhi"       },
        { id: "p2", pincode: "110001", area: "Bengali Market",  city: "New Delhi",  state: "Delhi"       },
        { id: "p3", pincode: "400001", area: "Churchgate",      city: "Mumbai",     state: "Maharashtra" },
        { id: "p4", pincode: "500001", area: "Abids",           city: "Hyderabad",  state: "Telangana"   },
        { id: "p5", pincode: "500001", area: "Koti",            city: "Hyderabad",  state: "Telangana"   },
        { id: "p6", pincode: "560001", area: "MG Road",         city: "Bengaluru",  state: "Karnataka"   },
        { id: "p7", pincode: "600001", area: "George Town",     city: "Chennai",    state: "Tamil Nadu"  },
        { id: "p8", pincode: "700001", area: "BBD Bagh",        city: "Kolkata",    state: "West Bengal" },
    ];

    const COUNTRIES = ["India"];
    const STATES_BY_COUNTRY: Record<string, string[]> = { India: ["All States", "Delhi", "Maharashtra", "Telangana", "Karnataka", "Tamil Nadu", "West Bengal"] };
    const CITIES_BY_STATE: Record<string, string[]> = {
        "All States": ["All Cities"], Delhi: ["All Cities","New Delhi"],
        Maharashtra: ["All Cities","Mumbai","Pune"], Telangana: ["All Cities","Hyderabad"],
        Karnataka: ["All Cities","Bengaluru"], "Tamil Nadu": ["All Cities","Chennai"],
        "West Bengal": ["All Cities","Kolkata"],
    };

    const stateOptions = STATES_BY_COUNTRY[selectedCountry] ?? ["All States"];
    const cityOptions  = CITIES_BY_STATE[selectedState] ?? ["All Cities"];

    const filteredData = useMemo(() => {
        let data = MOCK_PINCODES;
        if (pincodeQuery.trim()) {
            const q = pincodeQuery.toLowerCase();
            data = data.filter(d => d.pincode.includes(q) || d.area.toLowerCase().includes(q));
        }
        if (selectedState !== "All States") data = data.filter(d => d.state === selectedState);
        if (selectedCity  !== "All Cities") data = data.filter(d => d.city  === selectedCity);
        return data;
    }, [pincodeQuery, selectedState, selectedCity]);

    const toggleSelector = (type: SelectorType, opts: string[]) => {
        if (selectorType === type && selectorVisible) {
            setSelectorVisible(false); setSelectorType(null);
        } else {
            setSelectorType(type); setSelectorOptions(opts); setSelectorVisible(true);
        }
    };
    const handleSelectorSelect = (val: string) => {
        if (selectorType === "country") { setSelectedCountry(val); setSelectedState("All States"); setSelectedCity("All Cities"); }
        else if (selectorType === "state") { setSelectedState(val); setSelectedCity("All Cities"); }
        else if (selectorType === "city") { setSelectedCity(val); }
        setSelectorVisible(false);
    };
    const togglePincode = (id: string) =>
        setSelectedPincodes(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
    const toggleSelectAll = () => {
        if (selectAll) { setSelectedPincodes([]); } else { setSelectedPincodes(filteredData.map(d => d.id)); }
        setSelectAll(!selectAll);
    };
    const handleApply = async () => {
        setSaving(true);
        // ── TODO: call updateProductDeliverySettings(product.id, { deliverAll, pincodeIds: selectedPincodes }) ──
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        onClose();
    };

    const ModalContent = () => (
        <View style={isWeb ? dlp.popupCard : dlp.fullCard}>
            {selectorVisible && (
                <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} activeOpacity={1} onPress={() => setSelectorVisible(false)} />
            )}
            {/* Header */}
            <View style={dlp.header}>
                <TouchableOpacity style={dlp.backBtn} onPress={onClose}>
                    <Ionicons name="arrow-back" size={20} color={C.white} />
                </TouchableOpacity>
                <View style={dlp.headerCenter}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={C.orange} />
                    <View style={{ flex: 1 }}>
                        <Text style={dlp.headerTitle}>Delivery Locations</Text>
                        <Text style={dlp.headerSub} numberOfLines={1}>{product.name}</Text>
                    </View>
                </View>
                <View style={dlp.headerRight}>
                    <Text style={dlp.deliverAllLabel}>All India</Text>
                    <Switch value={deliverAll} onValueChange={setDeliverAll} trackColor={{ false: "rgba(255,255,255,0.3)", true: C.orange }} thumbColor={C.white} ios_backgroundColor="rgba(255,255,255,0.3)" />
                </View>
            </View>

            <ScrollView style={dlp.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {/* Info banner */}
                <View style={dlp.infoBanner}>
                    <MaterialCommunityIcons name="information-outline" size={14} color={C.orange} />
                    <View style={{ flex: 1 }}>
                        <Text style={dlp.infoText}>
                            <Text style={dlp.infoBold}>ON: </Text>Ships anywhere.
                            <Text style={dlp.infoBold}> OFF: </Text>Only selected pincodes.
                        </Text>
                    </View>
                    <TouchableOpacity style={dlp.indiaWideBtn} onPress={() => setDeliverAll(true)}>
                        <Text style={dlp.indiaWideBtnTxt}>Set All</Text>
                    </TouchableOpacity>
                </View>

                {/* Dropdowns */}
                <View style={[dlp.dropdownsRow, { zIndex: selectorVisible ? 101 : 10 }]}>
                    {(["country","state","city"] as SelectorType[]).map((type) => {
                        const label    = type === "country" ? "Country" : type === "state" ? "State" : "City";
                        const value    = type === "country" ? selectedCountry : type === "state" ? selectedState : selectedCity;
                        const opts     = type === "country" ? COUNTRIES : type === "state" ? stateOptions : cityOptions;
                        const isActive = selectorType === type && selectorVisible;
                        return (
                            <View key={type} style={[dlp.dropdownWrap, { zIndex: isActive ? 10 : 1 }]}>
                                <Text style={dlp.dropdownLabel}>{label}</Text>
                                <TouchableOpacity style={dlp.dropdownInput} onPress={() => toggleSelector(type, opts)}>
                                    <Text style={dlp.dropdownText}>{value}</Text>
                                    <Ionicons name={isActive ? "chevron-up" : "chevron-down"} size={14} color={C.textMid} />
                                </TouchableOpacity>
                                {isActive && (
                                    <View style={dlp.inlineDropdownMenu}>
                                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                            {opts.map((opt, idx) => (
                                                <TouchableOpacity key={idx} style={[dlp.inlineDropdownItem, opt === value && dlp.inlineDropdownItemActive]} onPress={() => handleSelectorSelect(opt)}>
                                                    <Text style={[dlp.inlineDropdownText, opt === value && dlp.inlineDropdownTextActive]}>{opt}</Text>
                                                    {opt === value && <Ionicons name="checkmark" size={16} color={C.navy} />}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Search */}
                <View style={dlp.searchRow}>
                    <View style={dlp.searchIconBox}><Feather name="search" size={13} color={C.white} /></View>
                    <TextInput style={dlp.searchInput} placeholder="Search by pincode or area..." placeholderTextColor={C.textLight} value={pincodeQuery} onChangeText={setPincodeQuery} />
                </View>

                {/* Table */}
                <View style={dlp.tableCard}>
                    <View style={dlp.tableHeader}>
                        <TouchableOpacity style={dlp.checkboxWrap} onPress={toggleSelectAll}>
                            <View style={[dlp.checkbox, selectAll && dlp.checkboxChecked]}>
                                {selectAll && <Ionicons name="checkmark" size={9} color={C.white} />}
                            </View>
                        </TouchableOpacity>
                        <Text style={[dlp.tableHeaderTxt, { flex: 1 }]}>Pincode</Text>
                        <Text style={[dlp.tableHeaderTxt, { flex: 2 }]}>Area</Text>
                        <Text style={[dlp.tableHeaderTxt, { flex: 1.5 }]}>City</Text>
                        <Text style={[dlp.tableHeaderTxt, { flex: 1.2 }]}>State</Text>
                    </View>
                    {filteredData.length === 0 ? (
                        <View style={dlp.emptyTable}>
                            <MaterialCommunityIcons name="map-search-outline" size={32} color={C.textLight} />
                            <Text style={dlp.emptyTableTitle}>No locations found</Text>
                        </View>
                    ) : (
                        filteredData.map((d, i) => {
                            const isChecked = selectedPincodes.includes(d.id);
                            return (
                                <TouchableOpacity key={d.id} style={[dlp.tableRow, isChecked && dlp.tableRowChecked, i % 2 === 1 && dlp.tableRowAlt]} onPress={() => togglePincode(d.id)} activeOpacity={0.7}>
                                    <View style={dlp.checkboxWrap}>
                                        <View style={[dlp.checkbox, isChecked && dlp.checkboxChecked]}>
                                            {isChecked && <Ionicons name="checkmark" size={9} color={C.white} />}
                                        </View>
                                    </View>
                                    <Text style={[dlp.tableCellTxt, { flex: 1 }]}>{d.pincode}</Text>
                                    <Text style={[dlp.tableCellTxt, { flex: 2 }]} numberOfLines={1}>{d.area}</Text>
                                    <Text style={[dlp.tableCellHighlight, { flex: 1.5 }]}>{d.city}</Text>
                                    <Text style={[dlp.tableCellHighlight, { flex: 1.2 }]}>{d.state}</Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                    {selectedPincodes.length > 0 && (
                        <View style={dlp.selectionBanner}>
                            <MaterialCommunityIcons name="check-circle" size={14} color={C.orange} />
                            <Text style={dlp.selectionBannerTxt}>{selectedPincodes.length} location{selectedPincodes.length > 1 ? "s" : ""} selected</Text>
                            <TouchableOpacity onPress={() => { setSelectedPincodes([]); setSelectAll(false); }}>
                                <Text style={dlp.selectionClearTxt}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={dlp.footer}>
                <TouchableOpacity style={dlp.cancelBtn} onPress={onClose}><Text style={dlp.cancelBtnTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={dlp.applyBtn} onPress={handleApply} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={C.white} /> : <Text style={dlp.applyBtnTxt}>Apply Selection</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isWeb) {
        return (
            <Modal visible transparent animationType="fade" onRequestClose={onClose}>
                <View style={dlp.webOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                    <ModalContent />
                </View>
            </Modal>
        );
    }
    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={dlp.mobileFullScreen}>
                <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
                <ModalContent />
            </SafeAreaView>
        </Modal>
    );
};

const dlp = StyleSheet.create({
    webOverlay:              { flex: 1, backgroundColor: "rgba(10,14,40,0.6)", justifyContent: "center", alignItems: "center" },
    popupCard:               { width: 680, maxHeight: "85%" as any, backgroundColor: C.white, borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 30, flexDirection: "column" },
    mobileFullScreen:        { flex: 1, backgroundColor: C.navyDeep },
    fullCard:                { flex: 1, flexDirection: "column" },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, backgroundColor: C.navyDeep },
    backBtn:                 { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    headerCenter:            { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle:             { fontSize: 14, color: C.white },
    headerSub:               { fontSize: 10, color: "rgba(255,255,255,0.6)" },
    headerRight:             { flexDirection: "row", alignItems: "center", gap: 6 },
    deliverAllLabel:         { fontSize: 10, color: "rgba(255,255,255,0.8)" },
    body:                    { flex: 1, backgroundColor: C.bg },
    infoBanner:              { flexDirection: "row", alignItems: "flex-start", gap: 8, margin: 12, backgroundColor: C.orangePale, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.orange + "30" },
    infoText:                { fontSize: 11, color: C.textMid, lineHeight: 17 },
    infoBold:                { color: C.textDark },
    indiaWideBtn:            { backgroundColor: C.orange, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
    indiaWideBtnTxt:         { fontSize: 10, color: C.white },
    dropdownsRow:            { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 10 },
    dropdownWrap:            { flex: 1, position: "relative" },
    inlineDropdownMenu:      { position: "absolute", top: 62, left: 0, right: 0, backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10, maxHeight: 180 },
    inlineDropdownItem:      { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.bg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    inlineDropdownItemActive:{ backgroundColor: C.bluePale },
    inlineDropdownText:      { fontSize: 13, color: C.textDark },
    inlineDropdownTextActive:{ color: C.navy },
    dropdownLabel:           { fontSize: 10, color: C.textLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
    dropdownInput:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
    dropdownText:            { fontSize: 12, color: C.textDark, flex: 1 },
    searchRow:               { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginBottom: 10, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.border },
    searchIconBox:           { backgroundColor: C.orange, padding: 9 },
    searchInput:             { flex: 1, fontSize: 12, color: C.textDark, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: C.white },
    tableCard:               { backgroundColor: C.white, borderRadius: 12, marginHorizontal: 12, marginBottom: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tableHeader:             { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 9, backgroundColor: C.navyDeep },
    tableHeaderTxt:          { fontSize: 10, color: C.white },
    checkboxWrap:            { width: 32, alignItems: "center" },
    checkbox:                { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
    checkboxChecked:         { backgroundColor: C.orange, borderColor: C.orange },
    tableRow:                { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    tableRowAlt:             { backgroundColor: "#FAFAFA" },
    tableRowChecked:         { backgroundColor: C.orangePale },
    tableCellTxt:            { fontSize: 11, color: C.textDark, paddingHorizontal: 4 },
    tableCellHighlight:      { fontSize: 11, color: C.orange, paddingHorizontal: 4 },
    emptyTable:              { alignItems: "center", paddingVertical: 28, gap: 8 },
    emptyTableTitle:         { fontSize: 13, color: C.textMid },
    selectionBanner:         { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.orangePale, borderTopWidth: 1, borderTopColor: C.orange + "30" },
    selectionBannerTxt:      { flex: 1, fontSize: 11, color: C.orange },
    selectionClearTxt:       { fontSize: 11, color: C.red },
    footer:                  { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
    cancelBtn:               { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.border },
    cancelBtnTxt:            { fontSize: 13, color: C.textMid },
    applyBtn:                { flex: 2, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, backgroundColor: C.orange },
    applyBtnTxt:             { fontSize: 13, color: C.white },
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE PRODUCT ACTION SHEET
// ─────────────────────────────────────────────────────────────────────────────
interface ActionSheetProps {
    product: Product | undefined;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdateLocation: (id: string) => void;
}

const ProductActionSheet: React.FC<ActionSheetProps> = ({ product, onClose, onDelete, onUpdateLocation }) => {
    if (!product) return null;

    const handleAction = (label: string) => {
        if (label === "Delete Product") {
            onClose();
            setTimeout(() => {
                // ── TODO: show your confirmation dialog then call deleteProduct(product.id) ──
                onDelete(product.id);
            }, 300);
        } else if (label === "View Product") {
            onClose();
            router.push({ pathname: '/productDetails', params: { id: product.id } });
        } else if (label === "Edit Product") {
            onClose();
            router.push('/Editproduct');
        } else if (label === "Update Location") {
            onClose();
            setTimeout(() => onUpdateLocation(product.id), 200);
        } else if (label === "Reviews") {
            onClose();
            router.push('/Reviews');
        } else {
            onClose();
        }
    };

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={as.root}>
                <TouchableOpacity style={as.overlay} activeOpacity={1} onPress={onClose} />
                <View style={as.sheet}>
                    <View style={as.drag} />
                    <View style={as.productRow}>
                        {product.image ? (
                            <Image source={{ uri: product.image }} style={as.productThumb} />
                        ) : (
                            <View style={[as.productThumb, { alignItems: "center", justifyContent: "center", backgroundColor: C.bg }]}>
                                <MaterialCommunityIcons name="package-variant" size={28} color={C.textLight} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={as.productName} numberOfLines={1}>{product.name}</Text>
                            <Text style={as.productSku}>SKU: {product.sku}</Text>
                            <Text style={as.productPrice}>₹{product.price.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={as.divider} />
                    {PRODUCT_ACTIONS.map((action, i) => (
                        <TouchableOpacity key={i} style={[as.actionItem, action.label === "Delete Product" && as.actionItemDanger]} onPress={() => handleAction(action.label)} activeOpacity={0.75}>
                            <View style={[as.actionIcon, { backgroundColor: action.bg }]}>
                                <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
                            </View>
                            <Text style={[as.actionLabel, { color: action.label === "Delete Product" ? C.red : C.textDark }]}>{action.label}</Text>
                            <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={as.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={as.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const as = StyleSheet.create({
    root:            { flex: 1, justifyContent: "flex-end" },
    overlay:         { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet:           { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 36, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 28 },
    drag:            { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 14, marginBottom: 18 },
    productRow:      { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 16 },
    productThumb:    { width: 56, height: 56, borderRadius: 12, backgroundColor: C.bg },
    productName:     { fontSize: 14, color: C.textDark, marginBottom: 3 },
    productSku:      { fontSize: 11, color: C.textLight, marginBottom: 4 },
    productPrice:    { fontSize: 14, color: C.navy },
    divider:         { height: 1, backgroundColor: C.border, marginBottom: 8 },
    actionItem:      { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, borderRadius: 12 },
    actionItemDanger:{ marginTop: 4 },
    actionIcon:      { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    actionLabel:     { flex: 1, fontSize: 14 },
    cancelBtn:       { marginTop: 10, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    cancelTxt:       { fontSize: 14, color: C.textMid },
});

// ─────────────────────────────────────────────────────────────────────────────
// WEB PRODUCT ACTION POPUP
// ─────────────────────────────────────────────────────────────────────────────
const WebProductActionPopup: React.FC<ActionSheetProps> = ({ product, onClose, onDelete, onUpdateLocation }) => {
    if (!product) return null;

    const handleAction = (label: string) => {
        if (label === "Delete Product") {
            onClose();
            if (typeof window !== "undefined") {
                const confirmed = window.confirm(`Delete "${product.name}"?`);
                if (confirmed) onDelete(product.id);
            }
        } else if (label === "View Product") {
            onClose();
            router.push({ pathname: '/productDetails', params: { id: product.id } });
        } else if (label === "Edit Product") {
            onClose();
            router.push('/Editproduct');
        } else if (label === "Update Location") {
            onClose();
            setTimeout(() => onUpdateLocation(product.id), 200);
        } else if (label === "Reviews") {
            onClose();
            router.push('/Reviews');
        } else {
            onClose();
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === "Active")       return { bg: "#DCFCE7", color: "#16A34A" };
        if (status === "Inactive")     return { bg: "#FEF9C3", color: "#B45309" };
        if (status === "Out of Stock") return { bg: "#FEE2E2", color: "#DC2626" };
        return { bg: C.orangePale, color: C.orange };
    };
    const sb = getStatusBadge(product.status);

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={wp.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                <View style={wp.popup}>
                    <View style={wp.popupHeader}>
                        {product.image ? (
                            <Image source={{ uri: product.image }} style={wp.popupImg} />
                        ) : (
                            <View style={[wp.popupImg, { alignItems: "center", justifyContent: "center", backgroundColor: C.bg }]}>
                                <MaterialCommunityIcons name="package-variant" size={24} color={C.textLight} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={wp.popupName} numberOfLines={2}>{product.name}</Text>
                            <Text style={wp.popupSku}>SKU: {product.sku}</Text>
                            <View style={wp.popupMeta}>
                                <Text style={wp.popupPrice}>₹{product.price.toLocaleString()}</Text>
                                <View style={[wp.popupStatusBadge, { backgroundColor: sb.bg }]}>
                                    <Text style={[wp.popupStatusTxt, { color: sb.color }]}>{product.status}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={wp.popupCloseBtn} onPress={onClose} activeOpacity={0.75}>
                            <Ionicons name="close" size={16} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <View style={wp.divider} />
                    <View style={wp.stockRow}>
                        <MaterialCommunityIcons name="package-variant" size={13} color={C.textLight} />
                        <Text style={wp.stockTxt}>Stock: </Text>
                        <Text style={[wp.stockVal, product.stock === 0 && { color: C.red }, product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD && { color: C.orange }]}>
                            {product.stock} units{product.stock === 0 ? " · Out of stock" : product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 ? " · Low ⚠" : ""}
                        </Text>
                    </View>
                    <View style={wp.divider} />
                    <View style={wp.actionsContainer}>
                        {PRODUCT_ACTIONS.map((action, i) => (
                            <TouchableOpacity key={i} style={[wp.actionItem, action.label === "Delete Product" && wp.actionItemDanger, i < PRODUCT_ACTIONS.length - 1 && wp.actionItemBorder]} onPress={() => handleAction(action.label)} activeOpacity={0.75}>
                                <View style={[wp.actionIconBox, { backgroundColor: action.bg }]}>
                                    <MaterialCommunityIcons name={action.icon as any} size={17} color={action.color} />
                                </View>
                                <Text style={[wp.actionLabel, { color: action.label === "Delete Product" ? C.red : C.textDark }]}>{action.label}</Text>
                                <Ionicons name="chevron-forward" size={14} color={action.label === "Delete Product" ? C.redLight : C.textLight} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={wp.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={wp.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const wp = StyleSheet.create({
    overlay:          { flex: 1, backgroundColor: "rgba(10,14,40,0.55)", justifyContent: "center", alignItems: "center" },
    popup:            { backgroundColor: C.white, borderRadius: 18, width: 320, shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 36, elevation: 30, overflow: "hidden" },
    popupHeader:      { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, paddingBottom: 12 },
    popupImg:         { width: 54, height: 54, borderRadius: 12, backgroundColor: C.bg },
    popupName:        { fontSize: 13.5, color: C.textDark, marginBottom: 3, lineHeight: 19 },
    popupSku:         { fontSize: 11, color: C.textLight, marginBottom: 6 },
    popupMeta:        { flexDirection: "row", alignItems: "center", gap: 8 },
    popupPrice:       { fontSize: 14, color: C.navyDeep },
    popupStatusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    popupStatusTxt:   { fontSize: 10 },
    popupCloseBtn:    { width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    divider:          { height: 1, backgroundColor: "#F1F2F6", marginHorizontal: 16 },
    stockRow:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
    stockTxt:         { fontSize: 12, color: C.textLight },
    stockVal:         { fontSize: 12, color: C.textDark },
    actionsContainer: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },
    actionItem:       { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10 },
    actionItemDanger: { marginTop: 2 },
    actionItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    actionIconBox:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    actionLabel:      { flex: 1, fontSize: 13.5 },
    cancelBtn:        { marginHorizontal: 16, marginTop: 4, marginBottom: 14, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 11, alignItems: "center", backgroundColor: C.bg },
    cancelTxt:        { fontSize: 13, color: C.textMid },
});

// ─────────────────────────────────────────────────────────────────────────────
// WEB DESKTOP SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const WebProductsScreen: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchAdminCatalogProducts({ size: 500 });
            setProducts((res.items ?? []).map((p) => mapProductListRow(p as Record<string, unknown>)));
        } catch (e) {
            setError(getApiErrorMessage(e));
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void reload(); }, [reload]);

    const params = useLocalSearchParams<{ tab?: string }>();
    const [viewType, setViewType]               = useState<ViewType>("list");
    const [selectedTab, setSelectedTab]         = useState<TabType>("All Products");

    useEffect(() => {
        if (params.tab) {
            const validTabs: TabType[] = ["All Products", "Active", "Inactive", "Out of Stock", "Low Stock"];
            if (validTabs.includes(params.tab as TabType)) {
                setSelectedTab(params.tab as TabType);
            }
        }
    }, [params.tab]);
    const [sortBy, setSortBy]                   = useState<SortType>("Latest");
    const [searchQuery, setSearchQuery]         = useState("");
    const [visibleCount, setVisibleCount]       = useState(20);
    const [productActionId, setProductActionId] = useState<string | null>(null);
    const [locationProductId, setLocationProductId] = useState<string | null>(null);

    const [filterCategory, setFilterCategory]               = useState("All");
    const [filterSubcategory, setFilterSubcategory]         = useState("All");
    const [filterSubSubcategory, setFilterSubSubcategory]   = useState("All");
    const [filterColor, setFilterColor]                     = useState("All");
    const [filterSize, setFilterSize]                       = useState("All");
    const [filterLowPrice, setFilterLowPrice]               = useState<number>(PRICE_MIN);
    const [filterHighPrice, setFilterHighPrice]             = useState<number>(PRICE_MAX);
    const [applied, setApplied] = useState({
        category: "All", subcategory: "All", subSubcategory: "All",
        color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX,
    });
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedSubcat, setExpandedSubcat]     = useState<string | null>(null);

    const activeActionProduct = products.find(p => p.id === productActionId);
    const locationProduct     = products.find(p => p.id === locationProductId);

    // ── TODO: replace with actual deleteProduct() call ──
    const handleDelete = useCallback(async (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    }, []);
    const handleUpdateLocation = useCallback((id: string) => setLocationProductId(id), []);

    const totalCount      = products.length;
    const activeCount     = products.filter(p => p.status === "Active").length;
    const inactiveCount   = products.filter(p => p.status === "Inactive").length;
    const outOfStockCount = products.filter(p => p.status === "Out of Stock").length;
    const lowStockCount   = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    const processedProducts = useMemo(() => {
        let list = [...products];
        if (selectedTab === "Low Stock") list = list.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        else if (selectedTab !== "All Products") list = list.filter(p => p.status === selectedTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        }
        if (applied.category !== "All")       list = list.filter(p => p.category       === applied.category);
        if (applied.subcategory !== "All")    list = list.filter(p => p.subcategory    === applied.subcategory);
        if (applied.subSubcategory !== "All") list = list.filter(p => p.subSubcategory === applied.subSubcategory);
        if (applied.color !== "All")          list = list.filter(p => p.color          === applied.color);
        if (applied.size !== "All")           list = list.filter(p => p.size           === applied.size);
        list = list.filter(p => p.price >= applied.lowPrice && p.price <= applied.highPrice);
        switch (sortBy) {
            case "Price: Low-High": list.sort((a, b) => a.price - b.price); break;
            case "Price: High-Low": list.sort((a, b) => b.price - a.price); break;
            case "Name A-Z":        list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "Oldest":          list.sort((a, b) => parseInt(a.id) - parseInt(b.id)); break;
            default:                list.sort((a, b) => parseInt(b.id) - parseInt(a.id)); break;
        }
        return list;
    }, [products, selectedTab, searchQuery, applied, sortBy]);

    const visibleProducts = processedProducts.slice(0, visibleCount);
    const hasMore = visibleCount < processedProducts.length;

    const applyFilters = () => {
        setApplied({ category: filterCategory, subcategory: filterSubcategory, subSubcategory: filterSubSubcategory, color: filterColor, size: filterSize, lowPrice: filterLowPrice, highPrice: filterHighPrice });
        setVisibleCount(20);
    };
    const clearFilters = () => {
        setFilterCategory("All"); setFilterSubcategory("All"); setFilterSubSubcategory("All");
        setFilterColor("All"); setFilterSize("All"); setFilterLowPrice(PRICE_MIN); setFilterHighPrice(PRICE_MAX);
        setExpandedCategory(null); setExpandedSubcat(null);
        setApplied({ category: "All", subcategory: "All", subSubcategory: "All", color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX });
        setVisibleCount(20);
    };
    const activeFilterCount = [
        applied.category !== "All", applied.subcategory !== "All", applied.subSubcategory !== "All",
        applied.color !== "All", applied.size !== "All", applied.lowPrice > PRICE_MIN, applied.highPrice < PRICE_MAX,
    ].filter(Boolean).length;

    const getStatusStyle = (status: string) => {
        if (status === "Active")       return { bg: "#DCFCE7", color: "#16A34A", dot: "#16A34A" };
        if (status === "Inactive")     return { bg: "#FEF9C3", color: "#B45309", dot: "#F59E0B" };
        if (status === "Out of Stock") return { bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444" };
        return { bg: "#FEF3C7", color: "#D97706", dot: "#F97316" };
    };

    const catTree       = filterCategory !== "All" ? (CATEGORY_TREE[filterCategory] ?? {}) : {};
    const subSubOptions = filterSubcategory !== "All" ? (catTree[filterSubcategory] ?? []) : [];



    return (
        <AdminLayout>
        <View style={wst.root}>
            <ScrollView style={wst.pageScroll} showsVerticalScrollIndicator={false} contentContainerStyle={wst.pageContent}>
                {error ? (
                    <View style={{ marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: C.redPale, borderWidth: 1, borderColor: "#FECACA" }}>
                        <Text style={{ fontSize: 12, color: C.red }}>{error}</Text>
                        <TouchableOpacity onPress={reload} style={{ marginTop: 8, alignSelf: "flex-start" }}>
                            <Text style={{ fontSize: 12, color: C.navy }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Page header */}
                <View style={wst.pageHeader}>
                    <View style={wst.titleContainer}>
                        <Text style={wst.pageTitle}>Product Management</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                        <TouchableOpacity
                            style={wst.navAddBtn}
                            onPress={() => router.push('/Addproduct')}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons name="plus" size={18} color={C.navy} />
                            <Text style={wst.navAddBtnTxt}>Add Product</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={wst.navBulkBtn}
                            onPress={() => router.push('/Bulkupload')}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={C.white} />
                            <Text style={wst.navBulkBtnTxt}>Bulk Upload</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats row */}
                <View style={wst.statsRow}>
                    {[
                        { label: "Total Products", value: totalCount,      icon: "package-variant-closed", color: C.navy,    bg: "#EEF1FF",    trend: "+3 this week" },
                        { label: "Active",          value: activeCount,     icon: "check-circle",           color: "#16A34A", bg: "#DCFCE7",    trend: "Selling well" },
                        { label: "Inactive",        value: inactiveCount,   icon: "pause-circle",           color: "#B45309", bg: "#FEF9C3",    trend: "Needs review" },
                        { label: "Out of Stock",    value: outOfStockCount, icon: "close-circle-outline",   color: "#DC2626", bg: "#FEE2E2",    trend: "Restock soon" },
                        { label: "Low Stock",       value: lowStockCount,   icon: "alert-circle-outline",   color: C.orange,  bg: C.orangePale, trend: "≤10 units"    },
                    ].map((stat, i) => (
                        <View key={i} style={wst.statCard}>
                            <View style={wst.statCardTop}>
                                <View style={[wst.statCardIcon, { backgroundColor: stat.bg }]}>
                                    <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                                </View>
                                <Text style={[wst.statCardVal, { color: stat.color }]}>{stat.value}</Text>
                            </View>
                            <Text style={wst.statCardLabel}>{stat.label}</Text>
                            <Text style={wst.statCardTrend}>{stat.trend}</Text>
                        </View>
                    ))}
                </View>

                {/* Main area */}
                <View style={wst.contentArea}>

                    {/* LEFT FILTER PANEL */}
                    <View style={wst.filterPanel}>
                        <View style={wst.filterPanelHeader}>
                            <View style={wst.filterPanelHeaderLeft}>
                                <Feather name="sliders" size={14} color={C.navy} />
                                <Text style={wst.filterPanelTitle}>Filters</Text>
                                {activeFilterCount > 0 && (
                                    <View style={wst.filterCountBadge}>
                                        <Text style={wst.filterCountBadgeTxt}>{activeFilterCount}</Text>
                                    </View>
                                )}
                            </View>
                            {activeFilterCount > 0 && (
                                <TouchableOpacity onPress={clearFilters}>
                                    <Text style={wst.filterClearAll}>Clear all</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>

                            {/* Status */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Status</Text>
                                {TABS.map(tab => {
                                    const isActive = selectedTab === tab.label;
                                    return (
                                        <TouchableOpacity key={tab.label} style={[wst.filterTabItem, isActive && { backgroundColor: tab.bg }]} onPress={() => { setSelectedTab(tab.label); setVisibleCount(20); }} activeOpacity={0.75}>
                                            <View style={[wst.filterTabDot, { backgroundColor: tab.color }]} />
                                            <Text style={[wst.filterTabLabel, isActive && { color: tab.color, }]}>{tab.label}</Text>
                                            {tab.label === "Low Stock" && (
                                                <View style={[wst.filterTabBadge, { backgroundColor: tab.color }]}>
                                                    <Text style={wst.filterTabBadgeTxt}>{lowStockCount}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={wst.filterDivider} />

                            {/* Sort */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Sort By</Text>
                                {SORT_OPTIONS.map(opt => {
                                    const isActive = sortBy === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.value} style={[wst.sortSidebarItem, isActive && wst.sortSidebarItemActive]} onPress={() => { setSortBy(opt.value); setVisibleCount(20); }} activeOpacity={0.75}>
                                            <View style={[wst.sortSidebarIconBox, { backgroundColor: isActive ? C.navy : C.bg }]}>
                                                <MaterialCommunityIcons name={opt.icon as any} size={13} color={isActive ? C.white : C.textMid} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[wst.sortSidebarLabel, isActive && { color: C.navy, }]}>{opt.value}</Text>
                                                <Text style={wst.sortSidebarDesc}>{opt.desc}</Text>
                                            </View>
                                            {isActive && <Ionicons name="checkmark-circle" size={15} color={C.navy} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={wst.filterDivider} />

                            {/* 3-level category tree */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Category</Text>
                                <TouchableOpacity style={[wst.catMainItem, filterCategory === "All" && wst.catMainItemActive]} onPress={() => { setFilterCategory("All"); setFilterSubcategory("All"); setFilterSubSubcategory("All"); setExpandedCategory(null); setExpandedSubcat(null); }} activeOpacity={0.7}>
                                    <View style={[wst.catRadio, filterCategory === "All" && wst.catRadioFilled]}>{filterCategory === "All" && <View style={wst.catRadioInner} />}</View>
                                    <Text style={[wst.catMainLabel, filterCategory === "All" && { color: C.navy, }]}>All</Text>
                                </TouchableOpacity>
                                {CATEGORIES.filter(c => c !== "All").map(cat => {
                                    const isSelected = filterCategory === cat;
                                    const isExpanded = expandedCategory === cat;
                                    const subKeys = Object.keys(CATEGORY_TREE[cat] ?? {});
                                    return (
                                        <View key={cat}>
                                            <TouchableOpacity style={[wst.catMainItem, isSelected && wst.catMainItemActive]} onPress={() => {
                                                if (isSelected && isExpanded) { setExpandedCategory(null); }
                                                else { setFilterCategory(cat); setFilterSubcategory("All"); setFilterSubSubcategory("All"); setExpandedCategory(cat); setExpandedSubcat(null); }
                                            }} activeOpacity={0.7}>
                                                <View style={[wst.catRadio, isSelected && wst.catRadioFilled]}>{isSelected && <View style={wst.catRadioInner} />}</View>
                                                <Text style={[wst.catMainLabel, isSelected && { color: C.navy, }]}>{cat}</Text>
                                                {subKeys.length > 0 && <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={isSelected ? C.navy : C.textLight} />}
                                            </TouchableOpacity>
                                            {isExpanded && subKeys.map(sub => {
                                                const isSubSelected = filterSubcategory === sub;
                                                const isSubExpanded = expandedSubcat === sub;
                                                const subSubList = CATEGORY_TREE?.[cat]?.[sub] ?? [];
                                                return (
                                                    <View key={sub}>
                                                        <TouchableOpacity style={[wst.catSubItem, isSubSelected && wst.catSubItemActive]} onPress={() => {
                                                            if (isSubSelected && isSubExpanded) { setExpandedSubcat(null); }
                                                            else { setFilterSubcategory(sub); setFilterSubSubcategory("All"); setExpandedSubcat(sub); }
                                                        }} activeOpacity={0.7}>
                                                            <View style={wst.catSubIndent} />
                                                            <View style={[wst.catSubRadio, isSubSelected && wst.catSubRadioFilled]}>{isSubSelected && <View style={wst.catSubRadioInner} />}</View>
                                                            <Text style={[wst.catSubLabel, isSubSelected && { color: C.purple, }]}>{sub}</Text>
                                                            {subSubList.length > 0 && <Ionicons name={isSubExpanded ? "chevron-up" : "chevron-down"} size={11} color={isSubSelected ? C.purple : C.textLight} />}
                                                        </TouchableOpacity>
                                                        {isSubExpanded && subSubList.map(subSub => {
                                                            const isActive = filterSubSubcategory === subSub;
                                                            return (
                                                                <TouchableOpacity key={subSub} style={[wst.catSubSubItem, isActive && wst.catSubSubItemActive]} onPress={() => setFilterSubSubcategory(isActive ? "All" : subSub)} activeOpacity={0.75}>
                                                                    <View style={wst.catSubSubIndent} />
                                                                    <View style={[wst.catSubSubDot, isActive && wst.catSubSubDotActive]} />
                                                                    <Text style={[wst.catSubSubLabel, isActive && { color: C.teal, }]}>{subSub}</Text>
                                                                    {isActive && <Ionicons name="checkmark" size={11} color={C.teal} />}
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={wst.filterDivider} />

                            {/* Price range */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Price Range</Text>
                                <View style={wst.priceRangeInputs}>
                                    <View style={wst.priceInput}>
                                        <Text style={wst.priceInputLabel}>Min (₹)</Text>
                                        <TextInput style={wst.priceInputField} value={String(filterLowPrice)} onChangeText={v => { const n = parseInt(v) || 0; setFilterLowPrice(Math.min(n, filterHighPrice)); }} keyboardType="numeric" />
                                    </View>
                                    <View style={wst.priceDash} />
                                    <View style={wst.priceInput}>
                                        <Text style={wst.priceInputLabel}>Max (₹)</Text>
                                        <TextInput style={wst.priceInputField} value={String(filterHighPrice)} onChangeText={v => { const n = parseInt(v) || PRICE_MAX; setFilterHighPrice(Math.max(n, filterLowPrice)); }} keyboardType="numeric" />
                                    </View>
                                </View>
                                <View style={wst.priceSliderTrack}>
                                    <View style={[wst.priceSliderFill, { left: `${(filterLowPrice / PRICE_MAX) * 100}%` as any, width: `${((filterHighPrice - filterLowPrice) / PRICE_MAX) * 100}%` as any }]} />
                                </View>
                            </View>

                            <View style={wst.filterDivider} />

                            {/* Color */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Color</Text>
                                <View style={wst.colorGrid}>
                                    {COLOR_OPTIONS.filter(c => c !== "All").map(col => (
                                        <TouchableOpacity key={col} style={[wst.colorDot, { backgroundColor: DOT_COLORS[col] ?? "#ccc", borderWidth: filterColor === col ? 3 : 1.5, borderColor: filterColor === col ? C.navy : "rgba(0,0,0,0.12)" }]} onPress={() => setFilterColor(filterColor === col ? "All" : col)}>
                                            {filterColor === col && <Ionicons name="checkmark" size={10} color={col === "White" || col === "Yellow" ? C.textDark : C.white} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={wst.filterDivider} />

                            {/* Size */}
                            <View style={wst.filterSection}>
                                <Text style={wst.filterSectionLabel}>Size</Text>
                                <View style={wst.sizeGrid}>
                                    {SIZE_OPTIONS.map(sz => {
                                        const isActive = filterSize === sz;
                                        return (
                                            <TouchableOpacity key={sz} style={[wst.sizeChip, isActive && wst.sizeChipActive]} onPress={() => setFilterSize(isActive ? "All" : sz)} activeOpacity={0.75}>
                                                <Text style={[wst.sizeChipTxt, isActive && wst.sizeChipTxtActive]}>{sz}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TouchableOpacity style={wst.applyFilterBtn} onPress={applyFilters} activeOpacity={0.85}>
                                <Feather name="check" size={13} color={C.white} />
                                <Text style={wst.applyFilterBtnTxt}>Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* RIGHT TABLE AREA */}
                    <View style={wst.tableArea}>
                        {/* Search */}
                        <View style={wst.searchBarWrap}>
                            <Feather name="search" size={15} color={C.textLight} style={{ marginRight: 8 }} />
                            <TextInput style={wst.searchBarInput} placeholder="Search by name, SKU or category..." placeholderTextColor={C.textLight} value={searchQuery} onChangeText={v => { setSearchQuery(v); setVisibleCount(20); }} />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Ionicons name="close-circle" size={16} color={C.textLight} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Toolbar */}
                        <View style={wst.tableToolbar}>
                            <View style={wst.tableToolbarLeft}>
                                <Text style={wst.tableResultCount}>
                                    <Text style={{ color: C.navy }}>{processedProducts.length}</Text>{" "}products
                                </Text>
                                {(searchQuery || activeFilterCount > 0) && (
                                    <TouchableOpacity style={wst.clearChip} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                        <Text style={wst.clearChipTxt}>Clear filters</Text>
                                        <Ionicons name="close" size={11} color={C.navy} />
                                    </TouchableOpacity>
                                )}
                                <View style={wst.activeSortIndicator}>
                                    <MaterialCommunityIcons name={SORT_OPTIONS.find(o => o.value === sortBy)?.icon as any ?? "sort-variant"} size={12} color={C.purple} />
                                    <Text style={wst.activeSortTxt}>{sortBy}</Text>
                                </View>
                            </View>
                            <View style={wst.viewToggle}>
                                <TouchableOpacity style={[wst.viewBtn, viewType === "list" && wst.viewBtnActive]} onPress={() => setViewType("list")}>
                                    <MaterialCommunityIcons name="format-list-bulleted" size={15} color={viewType === "list" ? C.white : C.textMid} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[wst.viewBtn, viewType === "grid" && wst.viewBtnActive]} onPress={() => setViewType("grid")}>
                                    <MaterialCommunityIcons name="grid" size={15} color={viewType === "grid" ? C.white : C.textMid} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* LIST VIEW */}
                        {viewType === "list" && (
                            <ScrollView style={wst.tableScroll} showsVerticalScrollIndicator={false}>
                                <View style={wst.tableHead}>
                                    <Text style={[wst.tableHeadCell, { flex: 2.7 }]}>Product</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1.6 }]}>SKU</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1.5 }]}>Category</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.7 }]}>Size</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.9 }]}>Price</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.7 }]}>Stock</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 1.0 }]}>Status</Text>
                                    <Text style={[wst.tableHeadCell, { flex: 0.7, textAlign: "right" }]}>Actions</Text>
                                </View>
                                {visibleProducts.length === 0 ? (
                                    <View style={wst.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={C.textLight} />
                                        <Text style={wst.emptyTitle}>
                                            {products.length === 0 ? "No admin products yet" : "No products found"}
                                        </Text>
                                        <Text style={wst.emptyDesc}>
                                            {products.length === 0
                                                ? "Products you add via Add Product appear here (not seller listings)."
                                                : "Try adjusting your search or filters"}
                                        </Text>
                                        {products.length === 0 ? (
                                            <TouchableOpacity style={wst.emptyBtn} onPress={() => router.push('/Addproduct')}>
                                                <Text style={wst.emptyBtnTxt}>Add Product</Text>
                                            </TouchableOpacity>
                                        ) : (
                                        <TouchableOpacity style={wst.emptyBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                            <Text style={wst.emptyBtnTxt}>Clear Filters</Text>
                                        </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    visibleProducts.map((product, idx) => {
                                        const st    = getStatusStyle(product.status);
                                        const isLow = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
                                        return (
                                            <TouchableOpacity
                                                key={product.id}
                                                style={[wst.tableRow, idx % 2 === 1 && wst.tableRowAlt]}
                                                onPress={() => router.push({ pathname: '/productDetails', params: { id: product.id } })}
                                                activeOpacity={0.7}
                                            >
                                                {/* Product */}
                                                <View style={[wst.tableCell, { flex: 2.7 }]}>
                                                    {product.image ? (
                                                        <Image source={{ uri: product.image }} style={wst.tableProductImg} />
                                                    ) : (
                                                        <View style={[wst.tableProductImg, { alignItems: "center", justifyContent: "center" }]}>
                                                            <MaterialCommunityIcons name="package-variant" size={20} color={C.textLight} />
                                                        </View>
                                                    )}
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={wst.tableProductName} numberOfLines={1}>{truncateTitle(product.name)}</Text>
                                                        <Text style={wst.tableProductSub}>{product.color}</Text>
                                                        <Text style={wst.tableProductUpdated}>Updated {product.updated}</Text>
                                                    </View>
                                                </View>
                                                {/* SKU */}
                                                <View style={[wst.tableCell, { flex: 1.6 }]}>
                                                    <Text style={wst.tableCellSku}>{product.sku}</Text>
                                                </View>
                                                {/* Category */}
                                                <View style={[wst.tableCell, { flex: 1.5, flexDirection: "column", alignItems: "flex-start", gap: 3 }]}>
                                                    <View style={wst.categoryTag}><Text style={wst.categoryTagTxt} numberOfLines={1}>{product.category}</Text></View>
                                                    <Text style={wst.subcategoryTxt}>{product.subcategory}</Text>
                                                </View>
                                                {/* Size */}
                                                <View style={[wst.tableCell, { flex: 0.7, flexDirection: "column", alignItems: "flex-start" }]}>
                                                    <View style={wst.sizePill}><Text style={wst.sizePillTxt}>{product.size}</Text></View>
                                                </View>
                                                {/* Price */}
                                                <View style={[wst.tableCell, { flex: 0.9 }]}>
                                                    <Text style={wst.tablePriceVal}>₹{product.price.toLocaleString()}</Text>
                                                </View>
                                                {/* Stock */}
                                                <View style={[wst.tableCell, { flex: 0.7, flexDirection: "column", alignItems: "flex-start", gap: 2 }]}>
                                                    <Text style={[wst.tableStockVal, isLow && { color: C.orange }]}>{product.stock}</Text>
                                                    {isLow && <Text style={wst.lowStockHint}>Low ⚠</Text>}
                                                    {product.stock === 0 && <Text style={wst.outStockHint}>Out</Text>}
                                                </View>
                                                {/* Status */}
                                                <View style={[wst.tableCell, { flex: 1.0 }]}>
                                                    <View style={[wst.statusPill, { backgroundColor: st.bg }]}>
                                                        <View style={[wst.statusDot, { backgroundColor: st.dot }]} />
                                                        <Text style={[wst.statusPillTxt, { color: st.color }]} numberOfLines={1}>{product.status}</Text>
                                                    </View>
                                                </View>
                                                {/* Actions */}
                                                <View style={[wst.tableCell, { flex: 0.7, justifyContent: "flex-end" }]}>
                                                    <TouchableOpacity style={wst.actionBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }} activeOpacity={0.75}>
                                                        <MaterialCommunityIcons name="dots-horizontal" size={16} color={C.textMid} />
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                                {hasMore && (
                                    <TouchableOpacity style={wst.loadMoreBtn} onPress={() => setVisibleCount(c => c + 20)} activeOpacity={0.8}>
                                        <MaterialCommunityIcons name="chevron-down-circle-outline" size={15} color={C.navy} />
                                        <Text style={wst.loadMoreTxt}>Load more ({processedProducts.length - visibleCount} remaining)</Text>
                                    </TouchableOpacity>
                                )}
                                {visibleProducts.length > 0 && (
                                    <Text style={wst.pageInfo}>Showing {visibleProducts.length} of {processedProducts.length}</Text>
                                )}
                            </ScrollView>
                        )}

                        {/* GRID VIEW */}
                        {viewType === "grid" && (
                            <ScrollView style={wst.tableScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {visibleProducts.length === 0 ? (
                                    <View style={wst.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={C.textLight} />
                                        <Text style={wst.emptyTitle}>
                                            {products.length === 0 ? "No admin products yet" : "No products found"}
                                        </Text>
                                        <Text style={wst.emptyDesc}>
                                            {products.length === 0
                                                ? "Products you add via Add Product appear here (not seller listings)."
                                                : "Try adjusting your search or filters"}
                                        </Text>
                                        {products.length === 0 ? (
                                            <TouchableOpacity style={wst.emptyBtn} onPress={() => router.push('/Addproduct')}>
                                                <Text style={wst.emptyBtnTxt}>Add Product</Text>
                                            </TouchableOpacity>
                                        ) : (
                                        <TouchableOpacity style={wst.emptyBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                                            <Text style={wst.emptyBtnTxt}>Clear Filters</Text>
                                        </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View style={wst.webGridContainer}>
                                        {visibleProducts.map(product => {
                                            const st = getStatusStyle(product.status);
                                            return (
                                                <TouchableOpacity
                                                    key={product.id}
                                                    style={wst.webGridCard}
                                                    onPress={() => router.push({ pathname: '/productDetails', params: { id: product.id } })}
                                                    activeOpacity={0.75}
                                                >
                                                    <View style={wst.webGridImgWrap}>
                                                        {product.image ? (
                                                            <Image source={{ uri: product.image }} style={wst.webGridImg} resizeMode="contain" />
                                                        ) : (
                                                            <View style={[wst.webGridImg, { alignItems: "center", justifyContent: "center" }]}>
                                                                <MaterialCommunityIcons name="package-variant" size={48} color={C.textLight} />
                                                            </View>
                                                        )}
                                                        <View style={[wst.webGridStatusBadge, { backgroundColor: st.bg }]}>
                                                            <View style={[wst.statusDot, { backgroundColor: st.dot }]} />
                                                            <Text style={[wst.webGridStatusTxt, { color: st.color }]}>{product.status}</Text>
                                                        </View>
                                                        <TouchableOpacity style={wst.webGridMoreBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}>
                                                            <MaterialCommunityIcons name="dots-horizontal" size={15} color={C.textMid} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={wst.webGridInfo}>
                                                        <Text style={wst.webGridName} numberOfLines={2}>{truncateTitle(product.name)}</Text>
                                                        <Text style={wst.webGridSku}>{product.sku}</Text>
                                                        <View style={wst.webGridMeta}>
                                                            <Text style={wst.webGridPrice}>₹{product.price.toLocaleString()}</Text>
                                                            <Text style={wst.webGridStock}>Stock: {product.stock}</Text>
                                                        </View>
                                                        <View style={wst.webGridCatRow}>
                                                            <View style={wst.categoryTag}><Text style={wst.categoryTagTxt}>{product.category}</Text></View>
                                                            {product.subSubcategory && (
                                                                <View style={wst.subSubPill}><Text style={wst.subSubPillTxt}>{product.subSubcategory}</Text></View>
                                                            )}
                                                        </View>
                                                        <View style={wst.webGridSizeRow}>
                                                            <MaterialCommunityIcons name="ruler" size={10} color={C.textLight} />
                                                            <Text style={wst.webGridSizeTxt}>Size: {product.size}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                                {hasMore && (
                                    <TouchableOpacity style={wst.loadMoreBtn} onPress={() => setVisibleCount(c => c + 20)} activeOpacity={0.8}>
                                        <Text style={wst.loadMoreTxt}>Load more ({processedProducts.length - visibleCount} remaining)</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </ScrollView>

            {productActionId && (
                <WebProductActionPopup product={activeActionProduct} onClose={() => setProductActionId(null)} onDelete={handleDelete} onUpdateLocation={handleUpdateLocation} />
            )}
            {locationProductId && (
                <DeliveryLocationsModal product={locationProduct} onClose={() => setLocationProductId(null)} />
            )}
        </View>
        </AdminLayout>
    );
};

const wst = StyleSheet.create({
    root:                  { flex: 1, flexDirection: "column", backgroundColor: "#F4F5FA", minHeight: "100%" as any },
    pageScroll:            { flex: 1 },
    pageContent:           { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
    pageHeader:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.navyDeep, paddingHorizontal: 32, paddingVertical: 28, paddingBottom: 68, borderRadius: 22, marginHorizontal: 2, marginTop: 12, shadowColor: C.navyDeep, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
    titleContainer:        { paddingLeft: 0, marginVertical: 0 },
    breadcrumb:            { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    breadcrumbDim:         { fontSize: 13, color: "rgba(255,255,255,0.75)" },
    breadcrumbActive:      { fontSize: 13, color: C.white },
    pageTitle:             { fontSize: 26, color: C.white, letterSpacing: -0.5 },
    navAddBtn:             { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    navAddBtnTxt:          { fontSize: 14, color: C.navy },
    navBulkBtn:            { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
    navBulkBtnTxt:         { fontSize: 14, color: C.white },
    statsRow:              { flexDirection: "row", gap: 12, marginBottom: 18, marginTop: -42, marginHorizontal: 6, zIndex: 10 },
    statCard:              { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    statCardTop:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    statCardIcon:          { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    statCardVal:           { fontSize: 26 },
    statCardLabel:         { fontSize: 12, color: C.textMid, marginBottom: 3 },
    statCardTrend:         { fontSize: 11, color: C.textLight },
    contentArea:           { flexDirection: "row", gap: 14, flex: 1, minHeight: 600 },
    // Search
    searchBarWrap:         { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: C.border },
    searchBarInput:        { flex: 1, fontSize: 13, color: C.textDark, ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
    // Filter panel
    filterPanel:           { width: 240, backgroundColor: C.white, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    filterPanelHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    filterPanelHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    filterPanelTitle:      { fontSize: 14, color: C.navyDeep },
    filterCountBadge:      { backgroundColor: C.navy, borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    filterCountBadgeTxt:   { fontSize: 10, color: C.white },
    filterClearAll:        { fontSize: 11.5, color: C.purple },
    filterSection:         { marginBottom: 12 },
    filterSectionLabel:    { fontSize: 10.5, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 },
    filterDivider:         { height: 1, backgroundColor: C.border, marginBottom: 14 },
    filterTabItem:         { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, marginBottom: 2 },
    filterTabDot:          { width: 6, height: 6, borderRadius: 3 },
    filterTabLabel:        { flex: 1, fontSize: 12.5, color: C.textMid },
    filterTabBadge:        { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7 },
    filterTabBadgeTxt:     { fontSize: 9.5, color: C.white },
    // Sort sidebar
    sortSidebarItem:       { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8, marginBottom: 3 },
    sortSidebarItemActive: { backgroundColor: "#EEF1FF" },
    sortSidebarIconBox:    { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    sortSidebarLabel:      { fontSize: 12, color: C.textMid },
    sortSidebarDesc:       { fontSize: 10, color: C.textLight },
    // Category tree
    catMainItem:           { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 7, marginBottom: 1 },
    catMainItemActive:     { backgroundColor: "#EEF1FF" },
    catRadio:              { width: 15, height: 15, borderRadius: 7.5, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    catRadioFilled:        { borderColor: C.navy },
    catRadioInner:         { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.navy },
    catMainLabel:          { flex: 1, fontSize: 12.5, color: C.textMid },
    catSubItem:            { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 6, marginBottom: 1 },
    catSubItemActive:      { backgroundColor: C.purplePale },
    catSubIndent:          { width: 14 },
    catSubRadio:           { width: 13, height: 13, borderRadius: 6.5, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    catSubRadioFilled:     { borderColor: C.purple },
    catSubRadioInner:      { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.purple },
    catSubLabel:           { flex: 1, fontSize: 11.5, color: C.textMid },
    catSubSubItem:         { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 5, marginBottom: 1 },
    catSubSubItemActive:   { backgroundColor: "#F0FDF8" },
    catSubSubIndent:       { width: 26 },
    catSubSubDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
    catSubSubDotActive:    { backgroundColor: C.teal },
    catSubSubLabel:        { flex: 1, fontSize: 11, color: C.textLight },
    // Price
    priceRangeInputs:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
    priceInput:            { flex: 1 },
    priceInputLabel:       { fontSize: 10, color: C.textLight, marginBottom: 3 },
    priceInputField:       { backgroundColor: C.bg, borderRadius: 7, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12.5, color: C.textDark, ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
    priceDash:             { width: 10, height: 1.5, backgroundColor: C.border, marginTop: 12 },
    priceSliderTrack:      { height: 3, backgroundColor: C.border, borderRadius: 2, position: "relative" },
    priceSliderFill:       { position: "absolute", height: 3, backgroundColor: C.navy, borderRadius: 2 },
    // Color
    colorGrid:             { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    colorDot:              { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    // Size
    sizeGrid:              { flexDirection: "row", flexWrap: "wrap", gap: 5 },
    sizeChip:              { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, minWidth: 36, alignItems: "center" },
    sizeChipActive:        { backgroundColor: C.navy, borderColor: C.navy },
    sizeChipTxt:           { fontSize: 11, color: C.textMid },
    sizeChipTxtActive:     { color: C.white, },
    applyFilterBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy, borderRadius: 9, paddingVertical: 10, marginTop: 8 },
    applyFilterBtnTxt:     { fontSize: 12.5, color: C.white },
    // Table
    tableArea:             { flex: 1, backgroundColor: C.white, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: "hidden", flexDirection: "column" },
    tableToolbar:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#FAFBFF" },
    tableToolbarLeft:      { flexDirection: "row", alignItems: "center", gap: 10 },
    tableResultCount:      { fontSize: 13, color: C.textMid },
    clearChip:             { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF1FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    clearChipTxt:          { fontSize: 11, color: C.navy },
    activeSortIndicator:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.purplePale, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
    activeSortTxt:         { fontSize: 11, color: C.purple },
    viewToggle:            { flexDirection: "row", backgroundColor: C.bg, borderRadius: 7, padding: 2, borderWidth: 1, borderColor: C.border },
    viewBtn:               { width: 28, height: 28, borderRadius: 5, alignItems: "center", justifyContent: "center" },
    viewBtnActive:         { backgroundColor: C.navy },
    tableScroll:           { flex: 1 },
    tableHead:             { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 11, backgroundColor: "#F8F9FC", borderBottomWidth: 1.5, borderBottomColor: C.border, gap: 24 },
    tableHeadCell:         { fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 },
    tableRow:              { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 24 },
    tableRowAlt:           { backgroundColor: "#FAFBFF" },
    tableCell:             { flexDirection: "row", alignItems: "center", gap: 10 },
    tableProductImg:       { width: 44, height: 44, borderRadius: 9, backgroundColor: C.bg },
    tableProductName:      { fontSize: 13, color: C.textDark, marginBottom: 2 },
    tableProductSub:       { fontSize: 11, color: C.textLight, marginBottom: 1 },
    tableProductUpdated:   { fontSize: 10.5, color: C.textLight },
    tableCellSku:          { fontSize: 12, color: C.purple, backgroundColor: C.purplePale, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    categoryTag:           { backgroundColor: "#EEF1FF", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" },
    categoryTagTxt:        { fontSize: 10.5, color: C.navy },
    subcategoryTxt:        { fontSize: 10, color: C.textLight },
    subSubPill:            { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F0FDF8", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "#CCFBEF", alignSelf: "flex-start" },
    subSubPillTxt:         { fontSize: 10.5, color: C.teal },
    sizePill:              { backgroundColor: "#F3F4F6", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: C.border, alignSelf: "flex-start" },
    sizePillTxt:           { fontSize: 10.5, color: C.textMid },
    tablePriceVal:         { fontSize: 13.5, color: C.navyDeep },
    tableStockVal:         { fontSize: 13, color: C.textDark },
    lowStockHint:          { fontSize: 10, color: C.orange },
    outStockHint:          { fontSize: 10, color: C.red },
    statusPill:            { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
    statusDot:             { width: 5, height: 5, borderRadius: 2.5 },
    statusPillTxt:         { fontSize: 11 },
    actionBtn:             { width: 30, height: 30, borderRadius: 7, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    // Grid
    webGridContainer:      { flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 16 },
    webGridCard:           { width: "22%" as any, minWidth: 180, backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    webGridImgWrap:        { position: "relative" },
    webGridImg:            { width: "100%", height: 200, backgroundColor: C.bg },
    webGridStatusBadge:    { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    webGridStatusTxt:      { fontSize: 10 },
    webGridMoreBtn:        { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.93)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    webGridInfo:           { padding: 12, gap: 4 },
    webGridName:           { fontSize: 12.5, color: C.textDark, lineHeight: 17 },
    webGridSku:            { fontSize: 10.5, color: C.textLight },
    webGridMeta:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    webGridPrice:          { fontSize: 13.5, color: C.navy },
    webGridStock:          { fontSize: 10.5, color: C.textLight },
    webGridCatRow:         { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 2 },
    webGridSizeRow:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    webGridSizeTxt:        { fontSize: 10, color: C.textLight },
    loadMoreBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginHorizontal: 18, marginVertical: 14, paddingVertical: 10, borderRadius: 9, borderWidth: 1.5, borderColor: C.navy, backgroundColor: "#EEF1FF" },
    loadMoreTxt:           { fontSize: 12.5, color: C.navy },
    pageInfo:              { fontSize: 11.5, color: C.textLight, textAlign: "center", paddingBottom: 14 },
    emptyState:            { alignItems: "center", paddingVertical: 60 },
    emptyTitle:            { fontSize: 15, color: C.textMid, marginTop: 12 },
    emptyDesc:             { fontSize: 12.5, color: C.textLight, marginTop: 4 },
    emptyBtn:              { marginTop: 14, backgroundColor: C.navy, borderRadius: 9, paddingHorizontal: 22, paddingVertical: 9 },
    emptyBtnTxt:           { fontSize: 13, color: C.white },
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const MobileProductsScreen: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchAdminCatalogProducts({ size: 500 });
            setProducts((res.items ?? []).map((p) => mapProductListRow(p as Record<string, unknown>)));
        } catch (e) {
            setError(getApiErrorMessage(e));
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void reload(); }, [reload]);

    const params = useLocalSearchParams<{ tab?: string }>();
    const [viewType, setViewType]               = useState<ViewType>("list");
    const [selectedTab, setSelectedTab]         = useState<TabType>("All Products");

    useEffect(() => {
        if (params.tab) {
            const validTabs: TabType[] = ["All Products", "Active", "Inactive", "Out of Stock", "Low Stock"];
            if (validTabs.includes(params.tab as TabType)) {
                setSelectedTab(params.tab as TabType);
            }
        }
    }, [params.tab]);
    const [sortBy, setSortBy]                   = useState<SortType>("Latest");
    const [showSortMenu, setShowSortMenu]       = useState(false);
    const [showFilter, setShowFilter]           = useState(false);
    const [showSearch, setShowSearch]           = useState(false);
    const [searchQuery, setSearchQuery]         = useState("");
    const [viewRange, setViewRange]             = useState<number>(20);
    const [visibleCount, setVisibleCount]       = useState(20);
    const [productActionId, setProductActionId] = useState<string | null>(null);
    const [locationProductId, setLocationProductId] = useState<string | null>(null);

    const activeActionProduct = products.find(p => p.id === productActionId);
    const locationProduct     = products.find(p => p.id === locationProductId);

    const [filterCategory, setFilterCategory]       = useState("All");
    const [filterSubcategory, setFilterSubcategory] = useState("All");
    const [filterColor, setFilterColor]             = useState("All");
    const [filterSize, setFilterSize]               = useState("All");
    const [filterLowPrice, setFilterLowPrice]       = useState<number>(PRICE_MIN);
    const [filterHighPrice, setFilterHighPrice]     = useState<number>(PRICE_MAX);
    const [applied, setApplied] = useState({ category: "All", subcategory: "All", color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX });

    // ── TODO: replace with actual deleteProduct() call ──
    const handleDelete = useCallback(async (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    }, []);
    const handleUpdateLocation = useCallback((id: string) => setLocationProductId(id), []);

    const totalCount      = products.length;
    const activeCount     = products.filter(p => p.status === "Active").length;
    const inactiveCount   = products.filter(p => p.status === "Inactive").length;
    const outOfStockCount = products.filter(p => p.status === "Out of Stock").length;
    const lowStockCount   = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    const PRODUCT_STATS = [
        { icon: "shopping-outline",     label: "Total",        value: String(totalCount),      color: C.navy,   bg: "rgba(30,43,107,0.10)" },
        { icon: "check-circle",         label: "Active",       value: String(activeCount),     color: C.green,  bg: C.greenPale            },
        { icon: "pause-circle",         label: "Inactive",     value: String(inactiveCount),   color: C.yellow, bg: C.yellowPale           },
        { icon: "close-circle-outline", label: "Out of Stock", value: String(outOfStockCount), color: C.red,    bg: C.redPale              },
    ];

    const processedProducts = useMemo(() => {
        let list = [...products];
        if (selectedTab === "Low Stock") list = list.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        else if (selectedTab !== "All Products") list = list.filter(p => p.status === selectedTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        }
        if (applied.category !== "All")    list = list.filter(p => p.category    === applied.category);
        if (applied.subcategory !== "All") list = list.filter(p => p.subcategory === applied.subcategory);
        if (applied.color !== "All")       list = list.filter(p => p.color       === applied.color);
        if (applied.size !== "All")        list = list.filter(p => p.size        === applied.size);
        list = list.filter(p => p.price >= applied.lowPrice && p.price <= applied.highPrice);
        switch (sortBy) {
            case "Price: Low-High": list.sort((a, b) => a.price - b.price); break;
            case "Price: High-Low": list.sort((a, b) => b.price - a.price); break;
            case "Name A-Z":        list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "Oldest":          list.sort((a, b) => parseInt(a.id) - parseInt(b.id)); break;
            default:                list.sort((a, b) => parseInt(b.id) - parseInt(a.id)); break;
        }
        return list;
    }, [products, selectedTab, searchQuery, applied, sortBy]);

    const visibleProducts = processedProducts.slice(0, visibleCount);
    const hasMore = visibleCount < processedProducts.length;

    const getStatusColor = (status: string) => {
        if (status === "Active")   return { bg: C.greenPale,  color: C.green  };
        if (status === "Inactive") return { bg: C.yellowPale, color: C.yellow };
        return                            { bg: C.redPale,    color: C.red    };
    };

    const applyFilters = () => {
        setApplied({ category: filterCategory, subcategory: filterSubcategory, color: filterColor, size: filterSize, lowPrice: filterLowPrice, highPrice: filterHighPrice });
        setVisibleCount(viewRange);
        setShowFilter(false);
    };
    const clearFilters = () => {
        setFilterCategory("All"); setFilterSubcategory("All"); setFilterColor("All"); setFilterSize("All");
        setFilterLowPrice(PRICE_MIN); setFilterHighPrice(PRICE_MAX);
        setApplied({ category: "All", subcategory: "All", color: "All", size: "All", lowPrice: PRICE_MIN, highPrice: PRICE_MAX });
        setVisibleCount(viewRange);
    };
    const activeFilterCount = [
        applied.category !== "All", applied.subcategory !== "All",
        applied.color !== "All", applied.size !== "All",
        applied.lowPrice > PRICE_MIN, applied.highPrice < PRICE_MAX,
    ].filter(Boolean).length;

    const subcatOptions     = filterCategory !== "All" ? (SUBCATEGORIES[filterCategory] ?? ["All"]) : ["All"];
    const currentSortOption = SORT_OPTIONS.find(o => o.value === sortBy);



    return (
        <AdminLayout>
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

            {/* Header */}
            {showSearch ? (
                <View style={s.headerWrapper}>
                    <View style={s.searchBarRow}>
                        <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(""); setVisibleCount(viewRange); }} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <TextInput style={s.searchInput} placeholder="Search products, SKU, category..." placeholderTextColor="rgba(255,255,255,0.5)" value={searchQuery} onChangeText={t => { setSearchQuery(t); setVisibleCount(viewRange); }} autoFocus />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(""); setVisibleCount(viewRange); }}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            ) : (
                <View style={s.headerWrapper}>
                    <View style={s.headerRow}>
                        <View style={s.headerContent}>
                            <Text style={s.headerTitle}>Products</Text>
                            <Text style={s.headerSub}>Manage and view your products</Text>
                        </View>
                        <TouchableOpacity style={s.headerIcon} onPress={() => setShowSearch(true)}>
                            <Feather name="search" size={21} color={C.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.headerIcon} onPress={() => setShowFilter(true)}>
                            <View style={{ position: "relative" }}>
                                <Feather name="filter" size={21} color={C.white} />
                                {activeFilterCount > 0 && (
                                    <View style={s.filterBadge}><Text style={s.filterBadgeText}>{activeFilterCount}</Text></View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {error ? (
                    <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: C.redPale, borderWidth: 1, borderColor: "#FECACA" }}>
                        <Text style={{ fontSize: 12, color: C.red }}>{error}</Text>
                        <TouchableOpacity onPress={reload} style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 12, color: C.navy }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Action cards */}
                <View style={s.actionRow}>
                    <TouchableOpacity
                        style={s.actionCard}
                        activeOpacity={0.75}
                        onPress={() => router.push('/Addproduct')}
                    >
                        <View style={[s.actionIconBox, { backgroundColor: "rgba(30,43,107,0.10)" }]}>
                            <MaterialCommunityIcons name="plus-box-outline" size={28} color={C.navy} />
                        </View>
                        <Text style={s.actionTitle}>Add New Product</Text>
                        <Text style={s.actionDesc}>Create and add a new product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.actionCard}
                        activeOpacity={0.75}
                        onPress={() => router.push('/Bulkupload')}
                    >
                        <View style={[s.actionIconBox, { backgroundColor: C.greenPale }]}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={28} color={C.green} />
                        </View>
                        <Text style={[s.actionTitle, { color: C.green }]}>Bulk Upload</Text>
                        <Text style={s.actionDesc}>Upload products via CSV</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={s.statsCard}>
                    {PRODUCT_STATS.map((stat, i) => (
                        <React.Fragment key={i}>
                            <View style={s.statItem}>
                                <View style={[s.statIconBox, { backgroundColor: stat.bg }]}>
                                    <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
                                </View>
                                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                                <Text style={s.statLabel}>{stat.label}</Text>
                            </View>
                            {i < PRODUCT_STATS.length - 1 && <View style={s.statDivider} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScrollContent} style={s.tabScrollWrapper}>
                    {TABS.map(tab => {
                        const isActive = selectedTab === tab.label;
                        return (
                            <TouchableOpacity key={tab.label} style={[s.tabBtn, isActive && { backgroundColor: tab.color, borderColor: tab.color }, !isActive && { borderColor: C.border }]} onPress={() => { setSelectedTab(tab.label); setVisibleCount(viewRange); }} activeOpacity={0.75}>
                                <MaterialCommunityIcons name={tab.icon as any} size={14} color={isActive ? C.white : tab.color} />
                                <Text style={[s.tabBtnText, { color: isActive ? C.white : C.textMid }, isActive && { }]}>{tab.label}</Text>
                                {tab.label === "Low Stock" && (
                                    <View style={[s.tabBadgePill, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : C.orangePale }]}>
                                        <Text style={[s.tabBadgePillTxt, { color: isActive ? C.white : C.orange }]}>{lowStockCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Controls */}
                <View>
                    <View style={s.controlsRow}>
                        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)} activeOpacity={0.8}>
                            <View style={s.sortBtnLeft}>
                                <View style={s.sortIconWrap}>
                                    <MaterialCommunityIcons name={currentSortOption?.icon as any ?? "sort-variant"} size={14} color={C.white} />
                                </View>
                                <View>
                                    <Text style={s.sortBtnLabel}>Sort by</Text>
                                    <Text style={s.sortBtnValue} numberOfLines={1}>{sortBy}</Text>
                                </View>
                            </View>
                            <View style={s.sortBtnRight}>
                                <View style={s.viewRangePill}><Text style={s.viewRangePillTxt}>{viewRange >= processedProducts.length ? "All" : viewRange}</Text></View>
                                <Ionicons name={showSortMenu ? "chevron-up" : "chevron-down"} size={14} color={C.navy} />
                            </View>
                        </TouchableOpacity>
                        <View style={s.viewToggle}>
                            <TouchableOpacity style={[s.viewBtn, viewType === "list" && s.viewBtnActive]} onPress={() => setViewType("list")}>
                                <MaterialCommunityIcons name="format-list-bulleted" size={17} color={viewType === "list" ? C.white : C.textLight} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.viewBtn, viewType === "grid" && s.viewBtnActive]} onPress={() => setViewType("grid")}>
                                <MaterialCommunityIcons name="grid" size={17} color={viewType === "grid" ? C.white : C.textLight} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showSortMenu && (
                        <View style={s.sortMenuWrapper}>
                            <View style={s.sortMenu}>
                                <View style={s.sortMenuHeader}>
                                    <MaterialCommunityIcons name="sort-variant" size={14} color={C.navy} />
                                    <Text style={s.sortMenuTitle}>Sort By</Text>
                                </View>
                                {SORT_OPTIONS.map((opt, idx) => {
                                    const isActive = sortBy === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.value} style={[s.sortRow, isActive && s.sortRowActive, idx < SORT_OPTIONS.length - 1 && s.sortRowBorder]} onPress={() => { setSortBy(opt.value); setShowSortMenu(false); setVisibleCount(viewRange); }} activeOpacity={0.75}>
                                            <View style={[s.sortRowIconWrap, { backgroundColor: isActive ? C.navy : C.bg }]}>
                                                <MaterialCommunityIcons name={opt.icon as any} size={16} color={isActive ? C.white : C.textMid} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.sortRowLabel, isActive && s.sortRowLabelActive]}>{opt.value}</Text>
                                                <Text style={[s.sortRowDesc, isActive && s.sortRowDescActive]}>{opt.desc}</Text>
                                            </View>
                                            {isActive ? <Ionicons name="checkmark-circle" size={20} color={C.navy} /> : <Ionicons name="radio-button-off" size={20} color={C.border} />}
                                        </TouchableOpacity>
                                    );
                                })}
                                <View style={s.sortMenuDivider} />
                                <View style={s.viewRangeSection}>
                                    <View style={s.viewRangeLabelRow}>
                                        <View style={s.viewRangeIconWrap}><MaterialCommunityIcons name="eye-outline" size={14} color={C.navy} /></View>
                                        <Text style={s.viewRangeLabel}>Show per page</Text>
                                    </View>
                                    <View style={s.viewRangeChips}>
                                        {VIEW_RANGE_OPTIONS.map(vr => (
                                            <TouchableOpacity key={vr} style={[s.viewRangeChip, viewRange === vr && s.viewRangeChipActive]} onPress={() => { setViewRange(vr); setVisibleCount(vr); }} activeOpacity={0.75}>
                                                <Text style={[s.viewRangeChipTxt, viewRange === vr && s.viewRangeChipTxtActive]}>{vr}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity style={[s.viewRangeChip, viewRange >= products.length && s.viewRangeChipActive]} onPress={() => { setViewRange(products.length); setVisibleCount(products.length); }} activeOpacity={0.75}>
                                            <Text style={[s.viewRangeChipTxt, viewRange >= products.length && s.viewRangeChipTxtActive]}>All</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Result count */}
                <View style={s.resultCountRow}>
                    <Text style={s.resultCountText}>{processedProducts.length} product{processedProducts.length !== 1 ? "s" : ""} found</Text>
                    {(searchQuery || activeFilterCount > 0) && (
                        <TouchableOpacity onPress={() => { setSearchQuery(""); clearFilters(); }}>
                            <Text style={s.clearAllText}>Clear all</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {visibleProducts.length === 0 && (
                    <View style={s.emptyState}>
                        <MaterialCommunityIcons name="package-variant-closed" size={52} color={C.textLight} />
                        <Text style={s.emptyTitle}>
                            {products.length === 0 ? "No admin products yet" : "No products found"}
                        </Text>
                        <Text style={s.emptyDesc}>
                            {products.length === 0
                                ? "Products you add via Add Product appear here (not seller listings)."
                                : "Try adjusting your search or filters"}
                        </Text>
                        {products.length === 0 ? (
                            <TouchableOpacity style={s.clearBtn} onPress={() => router.push('/Addproduct')}>
                                <Text style={s.clearBtnText}>Add Product</Text>
                            </TouchableOpacity>
                        ) : (
                        <TouchableOpacity style={s.clearBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                            <Text style={s.clearBtnText}>Clear All</Text>
                        </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* List view */}
                {viewType === "list" && visibleProducts.length > 0 && (
                    <View style={s.listContainer}>
                        {visibleProducts.map(product => {
                            const st    = getStatusColor(product.status);
                            const isLow = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
                            return (
                                <TouchableOpacity
                                    key={product.id}
                                    style={s.productRow}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/productDetails', params: { id: product.id } })}
                                >
                                    {product.image ? (
                                        <Image source={{ uri: product.image }} style={s.productImage} />
                                    ) : (
                                        <View style={[s.productImage, { alignItems: "center", justifyContent: "center", backgroundColor: C.bg }]}>
                                            <MaterialCommunityIcons name="package-variant" size={32} color={C.textLight} />
                                        </View>
                                    )}
                                    <View style={s.productInfo}>
                                        <Text style={s.productName} numberOfLines={1}>{product.name}</Text>
                                        <Text style={s.productSku}>SKU: {product.sku}</Text>
                                        <Text style={s.productCategory}>{product.category} · {product.subcategory}</Text>
                                        <Text style={s.productUpdated}>Updated: {product.updated}</Text>
                                        <Text style={s.productPrice}>₹{product.price.toLocaleString()}</Text>
                                    </View>
                                    <View style={s.productRight}>
                                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                            <Text style={[s.statusText, { color: st.color }]}>{product.status}</Text>
                                        </View>
                                        <Text style={[s.stockText, isLow && { color: C.orange }]}>Stock: {product.stock}{isLow ? " ⚠" : ""}</Text>
                                        <TouchableOpacity style={s.moreBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}>
                                            <MaterialCommunityIcons name="dots-vertical" size={18} color={C.textMid} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Grid view */}
                {viewType === "grid" && visibleProducts.length > 0 && (
                    <View style={s.gridContainer}>
                        {visibleProducts.map(product => {
                            const st = getStatusColor(product.status);
                            return (
                                <TouchableOpacity
                                    key={product.id}
                                    style={s.gridCard}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/productDetails', params: { id: product.id } })}
                                >
                                    {product.image ? (
                                        <Image source={{ uri: product.image }} style={s.gridImage} resizeMode="contain" />
                                    ) : (
                                        <View style={[s.gridImage, { alignItems: "center", justifyContent: "center" }]}>
                                            <MaterialCommunityIcons name="package-variant" size={40} color={C.textLight} />
                                        </View>
                                    )}
                                    <View style={[s.statusBadgeSmall, { backgroundColor: st.bg }]}>
                                        <Text style={[s.statusTextSmall, { color: st.color }]}>{product.status}</Text>
                                    </View>
                                    <Text style={s.gridName} numberOfLines={2}>{product.name}</Text>
                                    <Text style={s.gridPrice}>₹{product.price.toLocaleString()}</Text>
                                    <Text style={s.gridStock}>Stock: {product.stock}</Text>
                                    <TouchableOpacity style={s.gridMoreBtn} onPress={(e) => { e.stopPropagation(); setProductActionId(product.id); }}>
                                        <MaterialCommunityIcons name="dots-horizontal" size={18} color={C.textLight} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Load more */}
                {hasMore && processedProducts.length > 0 && (
                    <TouchableOpacity style={s.viewMoreBtn} onPress={() => setVisibleCount(c => c + viewRange)} activeOpacity={0.75}>
                        <MaterialCommunityIcons name="chevron-down-circle-outline" size={18} color={C.navy} />
                        <Text style={s.viewMoreTxt}>View More ({processedProducts.length - visibleCount} remaining)</Text>
                    </TouchableOpacity>
                )}
                {visibleProducts.length > 0 && (
                    <Text style={s.pageInfo}>Showing {visibleProducts.length} of {processedProducts.length} products</Text>
                )}
            </ScrollView>



            {/* Mobile filter modal */}
            <Modal visible={showFilter} animationType="slide" transparent onRequestClose={() => setShowFilter(false)}>
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFilter(false)} />
                <View style={s.filterSheet}>
                    <View style={s.filterHeader}>
                        <Text style={s.filterTitle}>Filter Products</Text>
                        <TouchableOpacity onPress={() => setShowFilter(false)}><Ionicons name="close" size={24} color={C.textDark} /></TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                        <Text style={fs.sectionLabel}>Category</Text>
                        <WrapChipGroup options={CATEGORIES} selected={filterCategory} onSelect={v => { setFilterCategory(v); setFilterSubcategory("All"); }} />
                        {filterCategory !== "All" && (
                            <>
                                <Text style={fs.sectionLabel}>Subcategory</Text>
                                <WrapChipGroup options={subcatOptions} selected={filterSubcategory} onSelect={setFilterSubcategory} />
                            </>
                        )}
                        <Text style={fs.sectionLabel}>Color</Text>
                        <WrapColorGroup selected={filterColor} onSelect={setFilterColor} />
                        <Text style={fs.sectionLabel}>Size</Text>
                        <View style={fs.sizeGrid}>
                            {SIZE_OPTIONS.map(sz => (
                                <TouchableOpacity key={sz} style={[fs.sizeChip, filterSize === sz && fs.sizeChipActive]} onPress={() => setFilterSize(sz)}>
                                    <Text style={[fs.sizeChipTxt, filterSize === sz && fs.sizeChipTxtActive]}>{sz}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={fs.sectionLabel}>Price Range</Text>
                        <View style={s.sliderWrap}>
                            <RangeSlider low={filterLowPrice} high={filterHighPrice} min={PRICE_MIN} max={PRICE_MAX} step={500} onLowChange={setFilterLowPrice} onHighChange={setFilterHighPrice} />
                        </View>
                    </ScrollView>
                    <View style={s.filterActions}>
                        <TouchableOpacity style={s.clearFilterBtn} onPress={clearFilters}><Text style={s.clearFilterText}>Clear All</Text></TouchableOpacity>
                        <TouchableOpacity style={s.applyFilterBtn} onPress={applyFilters}><Text style={s.applyFilterText}>Apply Filters</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Action sheet & delivery modal */}
            {productActionId && (
                <ProductActionSheet product={activeActionProduct} onClose={() => setProductActionId(null)} onDelete={handleDelete} onUpdateLocation={handleUpdateLocation} />
            )}
            {locationProductId && (
                <DeliveryLocationsModal product={locationProduct} onClose={() => setLocationProductId(null)} />
            )}
        </SafeAreaView>
        </AdminLayout>
    );
};

const s = StyleSheet.create({
    root:               { flex: 1, backgroundColor: C.bg },
    headerWrapper:      { backgroundColor: C.navyDeep, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 4 : 0, paddingBottom: 4 },
    headerRow:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    searchBarRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
    backBtn:            { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    headerContent:      { flex: 1 },
    headerTitle:        { fontSize: 19, color: C.white, marginBottom: 1 },
    headerSub:          { fontSize: 12, color: "rgba(255,255,255,0.65)" },
    headerIcon:         { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    searchInput:        { flex: 1, fontSize: 14, color: C.white, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.4)", paddingVertical: 4 },
    filterBadge:        { position: "absolute", top: -4, right: -4, backgroundColor: C.orange, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    filterBadgeText:    { fontSize: 9, color: C.white },
    actionRow:          { flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 12 },
    actionCard:         { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, alignItems: "flex-start", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, height: 130 },
    actionIconBox:      { width: 48, height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    actionTitle:        { fontSize: 13, color: C.navy, marginBottom: 3 },
    actionDesc:         { fontSize: 11, color: C.textLight, lineHeight: 15 },
    statsCard:          { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginTop: 4, marginBottom: 10, paddingVertical: 16, paddingHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    statItem:           { flex: 1, alignItems: "center", gap: 4 },
    statIconBox:        { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    statValue:          { fontSize: 18 },
    statLabel:          { fontSize: 9.5, color: C.textLight, textAlign: "center" },
    statDivider:        { width: 1, height: 52, backgroundColor: C.border, marginHorizontal: 2 },
    tabScrollWrapper:   { marginBottom: 8 },
    tabScrollContent:   { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
    tabBtn:             { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, backgroundColor: C.card },
    tabBtnText:         { fontSize: 12 },
    tabBadgePill:       { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
    tabBadgePillTxt:    { fontSize: 10 },
    controlsRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8, marginBottom: 0 },
    sortBtn:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderRadius: 12, paddingLeft: 6, paddingRight: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    sortBtnLeft:        { flexDirection: "row", alignItems: "center", gap: 10 },
    sortIconWrap:       { width: 34, height: 34, borderRadius: 10, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
    sortBtnLabel:       { fontSize: 10, color: C.textLight },
    sortBtnValue:       { fontSize: 12, color: C.navy, maxWidth: SW * 0.3 },
    sortBtnRight:       { flexDirection: "row", alignItems: "center", gap: 6 },
    viewRangePill:      { backgroundColor: C.navyDeep + "12", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    viewRangePillTxt:   { fontSize: 11, color: C.navy },
    viewToggle:         { flexDirection: "row", backgroundColor: C.card, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: C.border },
    viewBtn:            { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    viewBtnActive:      { backgroundColor: C.navy },
    sortMenuWrapper:    { paddingHorizontal: 18, paddingTop: 4, marginBottom: 6, width: 320 },
    sortMenu:           { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14 },
    sortMenuHeader:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    sortMenuTitle:      { fontSize: 14, color: C.navy },
    sortRow:            { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    sortRowActive:      { backgroundColor: "#F0F2FF" },
    sortRowBorder:      { borderBottomWidth: 1, borderBottomColor: C.border },
    sortRowIconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    sortRowLabel:       { fontSize: 13, color: C.textDark, marginBottom: 1 },
    sortRowLabelActive: { color: C.navy, },
    sortRowDesc:        { fontSize: 11, color: C.textLight },
    sortRowDescActive:  { color: C.navyLight },
    sortMenuDivider:    { height: 1, backgroundColor: C.border, marginVertical: 4, marginHorizontal: 16 },
    viewRangeSection:   { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6 },
    viewRangeLabelRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    viewRangeIconWrap:  { width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(30,43,107,0.10)", alignItems: "center", justifyContent: "center" },
    viewRangeLabel:     { fontSize: 13, color: C.textMid },
    viewRangeChips:     { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    viewRangeChip:      { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, minWidth: 48, alignItems: "center" },
    viewRangeChipActive:    { backgroundColor: C.navy, borderColor: C.navy },
    viewRangeChipTxt:       { fontSize: 12, color: C.textMid },
    viewRangeChipTxtActive: { color: C.white },
    resultCountRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
    resultCountText:    { fontSize: 12, color: C.textLight },
    clearAllText:       { fontSize: 12, color: C.navy },
    emptyState:         { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
    emptyTitle:         { fontSize: 16, color: C.textMid, marginTop: 12 },
    emptyDesc:          { fontSize: 13, color: C.textLight, marginTop: 4, textAlign: "center" },
    clearBtn:           { marginTop: 16, backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
    clearBtnText:       { fontSize: 13, color: C.white },
    listContainer:      { paddingHorizontal: 16, gap: 12, marginBottom: 10 },
    productRow:         { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    productImage:       { width: 90, height: 90, borderRadius: 12, backgroundColor: C.bg },
    productInfo:        { flex: 1 },
    productName:        { fontSize: 14, color: C.textDark, marginBottom: 3 },
    productSku:         { fontSize: 11, color: C.textLight, marginBottom: 2 },
    productCategory:    { fontSize: 11, color: C.purple, marginBottom: 2 },
    productUpdated:     { fontSize: 11, color: C.textLight, marginBottom: 6 },
    productPrice:       { fontSize: 15, color: C.navy },
    productRight:       { alignItems: "flex-end", gap: 6 },
    statusBadge:        { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
    statusText:         { fontSize: 10 },
    stockText:          { fontSize: 11, color: C.textMid },
    moreBtn:            { width: 32, height: 32, borderRadius: 9, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    gridContainer:      { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, marginBottom: 10 },
    gridCard:           { width: (SW - 52) / 2, backgroundColor: C.card, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
    gridImage:          { width: "100%", height: 130, backgroundColor: C.bg },
    statusBadgeSmall:   { position: "absolute", top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
    statusTextSmall:    { fontSize: 10 },
    gridName:           { fontSize: 12, color: C.textDark, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2 },
    gridPrice:          { fontSize: 13, color: C.navy, paddingHorizontal: 10, marginBottom: 2 },
    gridStock:          { fontSize: 11, color: C.textLight, paddingHorizontal: 10, paddingBottom: 10 },
    gridMoreBtn:        { position: "absolute", bottom: 8, right: 8, width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    viewMoreBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 4, marginBottom: 4, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.navy, backgroundColor: C.card },
    viewMoreTxt:        { fontSize: 13, color: C.navy },
    pageInfo:           { fontSize: 12, color: C.textLight, textAlign: "center", paddingBottom: 8, marginTop: 4 },

    modalOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    filterSheet:        { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, maxHeight: "85%", position: "absolute", bottom: 0, left: 0, right: 0 },
    filterHeader:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18 },
    filterTitle:        { fontSize: 18, color: C.textDark },
    sliderWrap:         { paddingHorizontal: 4 },
    filterActions:      { flexDirection: "row", gap: 12, paddingTop: 8 },
    clearFilterBtn:     { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.navy, alignItems: "center" },
    clearFilterText:    { fontSize: 14, color: C.navy },
    applyFilterBtn:     { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: C.navy, alignItems: "center" },
    applyFilterText:    { fontSize: 14, color: C.white },
});

const fs = StyleSheet.create({
    sectionLabel:       { fontSize: 13, color: C.textMid, marginBottom: 10, marginTop: 14 },
    chip:               { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    chipActive:         { backgroundColor: C.navy, borderColor: C.navy },
    chipText:           { fontSize: 12, color: C.textMid },
    chipTextActive:     { color: C.white },
    colorChip:          { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    colorDot:           { width: 14, height: 14, borderRadius: 7 },
    sizeGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
    sizeChip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, minWidth: 48, alignItems: "center" },
    sizeChipActive:     { backgroundColor: C.navy, borderColor: C.navy },
    sizeChipTxt:        { fontSize: 12, color: C.textMid },
    sizeChipTxtActive:  { color: C.white, },
});

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const ProductsScreenTemplate: React.FC = () => {
    return Platform.OS === "web" ? <WebProductsScreen /> : <MobileProductsScreen />;
};

export default ProductsScreenTemplate;