
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, StatusBar, SafeAreaView, Switch,
    Dimensions, Modal, Animated, Image, Alert, ActivityIndicator,
    type LayoutChangeEvent,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AdminLayout from "@/components/admin-layout";
import { buildCreateProductPayload } from "@/lib/product/buildCreateProductPayload";
import { getApiErrorMessage } from "@/lib/api/client";
import { getHsnForMaterial, MATERIAL_TYPES } from "@/lib/product/materialHsn";
import {
    buildCategoryPathOptions,
    buildLeafSubcategoryOptions,
    formatCategoryPath,
    materialsForSelection,
    resolveCategoryPathSelection,
    resolveGstForMaterial,
    resolveLeafSubcategory,
    resolveMaterialOption,
    resolveWeightSlab,
    type AdminProductFormCatalog,
} from "@/lib/product/catalogHelpers";
import { createProduct, fetchDeliveryChargesForWeight, fetchProductCatalog } from "@/services/productApi";

const AppText = Text;

const fontFamilies = {
    regular: "System",
    medium: "System",
    semiBold: "System",
    bold: "System",
} as const;

const fontSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
} as const;

const useResponsive = () => {
    const [isDesktop, setIsDesktop] = useState(Dimensions.get("window").width >= 1024);

    useEffect(() => {
        const onChange = ({ window }: { window: { width: number } }) => setIsDesktop(window.width >= 1024);
        const listener = Dimensions.addEventListener("change", onChange);
        return () => listener.remove();
    }, []);

    return { isDesktop };
};

type ProductFormCatalog = AdminProductFormCatalog & {
    colors?: Array<{ id: number; name: string; code?: string }>;
    sizes?: Array<{ id: number; name: string; code?: string }>;
};

type ImagePickerAsset = { uri: string; type?: string; width?: number; height?: number };
type ImagePickerResult = { cancelled: boolean; assets?: ImagePickerAsset[] };

const ImagePicker = {
    MediaTypeOptions: { Images: "Images", Videos: "Videos" } as const,
    async requestCameraPermissionsAsync(): Promise<{ status: "granted" }> {
        return { status: "granted" };
    },
    async requestMediaLibraryPermissionsAsync(): Promise<{ status: "granted" }> {
        return { status: "granted" };
    },
    async launchCameraAsync(_: any): Promise<ImagePickerResult> {
        return { cancelled: true };
    },
    async launchImageLibraryAsync(_: any): Promise<ImagePickerResult> {
        if (Platform.OS === 'web') {
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,video/*';
                input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            resolve({ cancelled: false, assets: [{ uri: ev.target?.result as string }] });
                        };
                        reader.readAsDataURL(file);
                    } else {
                        resolve({ cancelled: true });
                    }
                };
                input.oncancel = () => resolve({ cancelled: true });
                input.click();
            });
        }
        return { cancelled: false, assets: [{ uri: "https://picsum.photos/400" }] };
    },
} as const;

const uniquePickerOptions = (options: string[]) => Array.from(new Set(options));

const fetchProductFormCatalog = async (): Promise<ProductFormCatalog> => {
    const data = await fetchProductCatalog();
    return {
        categories: data.categories ?? [],
        colors: (data.colors ?? []).map((c) => ({
            id: Number(c.id),
            name: c.name,
            code: c.code,
        })),
        sizes: (data.sizes ?? []).map((s) => ({
            id: Number(s.id),
            name: s.name,
            code: s.code ?? s.name,
        })),
        deliverySlabs: data.deliverySlabs ?? [],
    };
};

const applyDeliverySelection = (value: string, onChange: (field: string, value: any) => void) => {
    onChange("deliveryOption", value);
    if (value === "Standard Delivery") {
        onChange("minDays", "3");
        onChange("maxDays", "5");
        onChange("deliveryInfo", "Delivered via standard shipping partners.");
    } else if (value === "Express Delivery") {
        onChange("minDays", "1");
        onChange("maxDays", "2");
        onChange("deliveryInfo", "Expedited shipping for fast delivery.");
    } else if (value === "Same Day Delivery") {
        onChange("minDays", "0");
        onChange("maxDays", "1");
        onChange("deliveryInfo", "Orders placed before 2 PM will be delivered the same day.");
    } else if (value === "Pickup Only") {
        onChange("minDays", "0");
        onChange("maxDays", "0");
        onChange("deliveryInfo", "Customer must pick up the item from our store.");
    }
};

const applyReturnPolicySelection = (value: string, onChange: (field: string, value: any) => void) => {
    onChange("returnPolicy", value);
    if (value === "7 Days Return") {
        onChange("returnPolicyText", "Returns accepted within 7 days of delivery. Product must be in original condition with tags attached.");
    } else if (value === "14 Days Return") {
        onChange("returnPolicyText", "Returns accepted within 14 days of delivery. Product must be unused and in original packaging.");
    } else if (value === "30 Days Return") {
        onChange("returnPolicyText", "Enjoy peace of mind with our 30-day return policy. Returns accepted for unused items with original tags.");
    } else if (value === "No Return") {
        onChange("returnPolicyText", "This item is non-returnable unless defective or damaged upon arrival.");
    }
};

/** React 19 + RN Animated typing compatibility */
const AnimatedView = Animated.View as React.ComponentType<
    React.ComponentProps<typeof Animated.View>
>;

const { width: SW } = Dimensions.get("window");
const CONTENT_MAX = 1120;

/** Set false before production to start with empty forms */
const PREFILL_WITH_DUMMY = false;

const DUMMY_PRIMARY_IMAGE_URI =
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80";

const getStepScrollContent = (isDesktop: boolean) =>
    isDesktop
        ? {
            paddingHorizontal: 32,
            paddingTop: 24,
            paddingBottom: 80,
            width: "100%" as const,
            maxWidth: CONTENT_MAX,
            alignSelf: "center" as const,
            ...(Platform.OS === "web" ? ({ alignSelf: "center", marginHorizontal: "auto" } as object) : {}),
        }
        : { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 };

// ─── Design Tokens ───────────────────────────────────────────
const C = {
    navy: "#1A2B6D",
    navyDeep: "#0F1A4A",
    navyMid: "#243380",
    navyLight: "#3D52A0",
    navyGhost: "#EEF1FA",
    navyBorder: "#C5CCEA",
    white: "#FFFFFF",
    bg: "#F4F6FB",
    cardBg: "#FFFFFF",
    border: "#E8EBF4",
    inputBg: "#F8F9FD",
    textDark: "#0D1340",
    textMid: "#4B5680",
    textLight: "#9AA3C2",
    textPlaceholder: "#B8BDD6",
    red: "#E53E3E",
    redPale: "#FFF5F5",
    green: "#2ECC71",
    greenPale: "#EAFAF2",
    greenText: "#1A9B52",
    accent1: "#7C3AED",
    accent2: "#0078A8",
    accent3: "#6C3FC5",
    accent4: "#C47D0E",
    accent5: "#1A8A5A",
    toastBg: "#1A2B6D",
    toastErr: "#C0392B",
};

// ─── Data ────────────────────────────────────────────────────
const SUBCATEGORIES: Record<string, string[]> = {
    "Clothing": [
        "T-Shirts", "Shirts", "Jeans", "Dresses", "Jackets", "Shorts", "Innerwear",
        "Capris", "Clothing Set", "Dungarees & Jumpsuits", "Ethnic Wear", "Kurta Set",
        "Leggings", "Lehenga-Cholis", "Skirts & Jeans", "Tops & T-Shirts", "Track Pants",
        "Saree Fall", "Poplin"
    ],
    "Electronics": ["Mobiles", "Laptops", "Headphones", "Cameras", "Tablets", "Audio", "Wearables"],
    "Footwear": [
        "Sneakers", "Sandals", "Formal", "Sports", "Boots",
        "Ballet Flats", "Casual Shoes", "Flats", "Heels", "Wedges",
        "Cleats", "Cycling Shoes", "Hiking Shoes", "Running Shoes", "Sports Sandals", "Training Shoes",
        "Flip Flops", "Formal Shoes", "Loafers", "Booties", "Flats Shoes", "School Shoes", "Socks"
    ],
    "Bags": ["Backpacks", "Handbags", "Wallets", "Travel Bags", "Laptop Bags", "Lunch Carry Bags", "Sling Bags", "Wallets & Clutches"],
    "Accessories": [
        "Watches", "Sunglasses", "Jewelry", "Belts",
        "Wallets", "Eyewear", "Headwear", "Caps", "Fitness Gloves", "Gym Bags", "Sweatbands", "Water Bottles",
        "Brooches", "Cufflinks", "Hair Accessories", "Mufflers", "Scarves"
    ],
    "Sports": ["Cricket", "Football", "Tennis", "Yoga", "Gym"],
    "Home & Living": [
        "Furniture", "Decor", "Kitchen", "Bedding",
        "Cushion Covers", "Customized Mugs", "Desk Name Plates", "Keychains", "Printed Cushions", "Water Bottle",
        "Artificial Flower Frames", "Canva Prints", "Digital Clock", "Name Plates", "Photo Wall Collages", "Table D cor Showpieces", "Wall Clock"
    ],
    "Books": ["Fiction", "Non-Fiction", "Academic", "Comics"],
    "Jewellery": [
        "Anklets", "Anti Tarnish Chains", "Bangles", "Bracelet", "Bridal Necklace",
        "Chains", "Couple Bracelets", "Customized Name Pendants", "Earrings", "Jewellery Set",
        "Key-lock Couple Sets", "Necklaces", "Nose Pins", "Pearl Necklace Set", "Pendants", "Rings", "Vaddanam"
    ],
    "Innerwear & Nightwear": ["Briefs & Boxers", "Loungewear", "Sleepwear", "Thermals", "Trunks", "Vests"],
    "Gadgets Accessories": ["Clothing Accessories"],
    "Other Accessories": ["Brooches", "Cufflinks", "Hair Accessories", "Mufflers", "Scarves"],
    "Belts & Caps": ["Belts", "Caps", "Gloves", "Goggles", "Hats", "Sunglasses"],
    "Women s Footwear": ["Ballet Flats", "Boots", "Casual Shoes", "Flats", "Heels", "Wedges"],
    "Milk Sweets": ["Gulab Jamun", "Kalakand"],
    "Preschool Furniture": ["Chairs", "Dustbins"],
    "Women s Sportswear": ["Gym Wear", "Leggings", "Shorts", "Sports Bras", "Sports Tops", "Tracksuits", "Yoga Pants"],
    "Everyday Utility ": ["Cushion Covers", "Customized Mugs", "Desk Name Plates", "Keychains", "Printed Cushions", "Water Bottle"],
    "Wearable & Personal Gifts": ["Caps", "Customized T-Shirts", "Hoodies", "Mask", "Personalized Towels & Handkerchiefs"],
    "Skincare Tools & Devices": ["Facial Devices"],
    "Art & Creative Gifts": ["Canvas Painting Prints", "Minimalist Line Art", "Pencil Sketches"],
    "Kids & Baby Gifts": ["Baby Name Frames", "Cartoon-Theme Photo Frames", "Growth Charts", "Soft Toys with Name"],
    "Home Decor Gifits": ["Artificial Flower Frames", "Canva Prints", "Digital Clock", "Name Plates", "Photo Wall Collages", "Table D cor Showpieces", "Wall Clock"],
    "Formal Wear": ["Formal Shirts", "Suits & Blazers", "Ties"],
    "Sports Footwear": ["Cleats", "Cycling Shoes", "Hiking Shoes", "Running Shoes", "Sports Sandals", "Training Shoes"],
    "Watches": ["Fitness Bands", "Men s Watches", "Women s Watches"],
    " Girls Clothing": [
        "Capris", "Clothing Set", "Dresses", "Dungarees & Jumpsuits", "Ethnic Wear", "Jackets",
        "Kurta Set", "Leggings", "Lehenga-Cholis", "Shorts", "Skirts & Jeans", "Tops & T-Shirts", "Track Pants"
    ],
    "Bottom Wear": ["Cargo Pants", "Casual Trousers", "Jeans", "Joggers", "Shorts / Bermudas", "Track Pants / Lower Wear", "Trousers (Formal / Regular)"],
    "Lingerie & Sleepwear": ["Bottom Wear Inners", "Bras", "Camisoles", "Nightwear", "Panties", "Shapewear", "Swimwear", "Top Wear Inners"],
    "Boys  Clothing": ["Clothing Set", "Ethnic Wear", "Jackets", "Jeans", "Nightwear", "Pyjamas", "Shorts", "Sweaters", "Sweatshirts", "T-Shirts", "Trousers"],
    "Western Wear": ["Dresses", "Jeans", "Jeggings", "Jumpsuits", "Skirts & Shorts", "T-Shirts", "Tops", "Trousers"],
    "Spiritual & Festival Gifts": ["Customized Temple Frames", "Festival Hampers", "God Photo Frames"],
    "Dry Sweets": ["Boondhi Laddu", "Dryfruit Laddu", "Sununda"],
    "Pre Indoor Play Items": ["Rocking Toys", "Slides"],
    "Men s Sportswear": ["Compression Wear", "Jerseys", "Shorts", "T-Shirts", "Track Pants"],
    "School Essentials": ["Bags", "Lunch Boxes", "School Uniforms", "Water Bottles"],
    "Corporate & Promotional Gifts": ["Company Logo Frames", "Diaries", "Medal", "Pens", "Trophies", "Welcome Combo Kits"],
    "Winter Wear": ["Cardigans", "Coats", "Jackets", "Shawls", "Sweaters"],
    "Women s Clothing": ["Leggings", "Poplin", "Saree Fall"],
    "Top Wear": ["Casual Shirts", "Coats", "Couple Wear", "Hoodies & Sweatshirts", "Jackets", "Polo Shirts", "Rain Jackets", "Shirts", "Sweaters", "T-Shirts"],
    "Gifts for Couples": ["Explosion Gift Boxes", "Gift Items Novelties", "Love Scrapbooks"],
    "Ethnic Wear": ["Dress Material", "Embroidery Work Blouse", "JUMPSUITS", "Kurtas & Kurtis", "Kurtha Set With Duppatta", "Lehenga Cholis", "Long Frock", "Salwar Suits", "Sarees", "Slik-Dupattas"],
    "Educational Materials": ["Building Blocks/Block Construction Set", "Lacing & Threading Toys", "Linking Toys", "Shape Sorter & Stacking Toys"],
    "Men s Footwear": ["Casual Shoes", "Flip Flops", "Formal Shoes", "Loafers", "Sandals", "Sneakers"],
    "Kids  Footwear": ["Booties", "Casual Shoes", "Flats Shoes", "Flip Flops", "Heels", "Sandals", "School Shoes", "Socks"],
    "Event-Based Gifts": ["Birthday Combo Hampers", "Gifits Hampers"]
};
const CATEGORIES = Object.keys(SUBCATEGORIES);
const COLORS_LIST = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Orange", "Gray"];
const SIZES_LIST = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "38", "40"];
const DELIVERY_OPTIONS = ["Standard Delivery", "Express Delivery", "Same Day Delivery", "Pickup Only"];
const RETURN_POLICIES = ["7 Days Return", "14 Days Return", "30 Days Return", "No Return"];

const STEPS = [
    { key: "basic", label: "Basic Info", icon: "information-outline", color: "#7C3AED" },
    { key: "variants", label: "Variants", icon: "tune-variant", color: "#0891B2" },
    { key: "images", label: "Images", icon: "image-multiple-outline", color: "#059669" },
    { key: "details", label: "Details", icon: "clipboard-text-outline", color: "#D97706" },
];

// ─────────────────────────────────────────────────────────────
// SWEET ALERT — Confirm + Success (two-stage)
// ─────────────────────────────────────────────────────────────
type SweetAlertStage = "confirm" | "success";

interface SweetAlertProps {
    visible: boolean;
    stage: SweetAlertStage;
    productName?: string;
    savedProductId?: string | null;
    isSaving?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    onDone: () => void;
}

// Tiny floating dot for success confetti
const ConfettiDot = ({
    color,
    delay,
    startX,
    startY,
}: {
    color: string;
    delay: number;
    startX: number;
    startY: number;
}) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: startY, duration: 700, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: startX, duration: 700, useNativeDriver: true }),
            ]),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]);
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <AnimatedView
            style={{
                position: "absolute",
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
            }}
        />
    );
};

const CONFETTI_DOTS = [
    { color: "#F97316", dx: -48, dy: -52, delay: 0 },
    { color: "#7C3AED", dx: 52, dy: -44, delay: 60 },
    { color: "#0891B2", dx: -62, dy: -20, delay: 120 },
    { color: "#059669", dx: 64, dy: -28, delay: 90 },
    { color: "#F59E0B", dx: -32, dy: -70, delay: 30 },
    { color: "#EC4899", dx: 36, dy: -68, delay: 150 },
    { color: "#1A2B6D", dx: -70, dy: 10, delay: 180 },
    { color: "#10B981", dx: 72, dy: 14, delay: 200 },
];

const SweetAlert = ({
    visible,
    stage,
    productName,
    savedProductId,
    isSaving = false,
    onConfirm,
    onCancel,
    onDone,
}: SweetAlertProps) => {
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.85)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.7)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;
    const checkScale = useRef(new Animated.Value(0)).current;
    const checkOpacity = useRef(new Animated.Value(0)).current;
    const iconBgScale = useRef(new Animated.Value(0.6)).current;
    const textSlide = useRef(new Animated.Value(20)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiKey, setConfettiKey] = useState(0);

    useEffect(() => {
        if (visible) {
            overlayOpacity.setValue(0);
            cardScale.setValue(0.85);
            cardOpacity.setValue(0);
            ringScale.setValue(0.7);
            ringOpacity.setValue(0);
            checkScale.setValue(0);
            checkOpacity.setValue(0);
            iconBgScale.setValue(0.6);
            textSlide.setValue(20);
            textOpacity.setValue(0);
            setShowConfetti(false);

            Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(cardScale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
                Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start(() => {
                if (stage === "confirm") {
                    Animated.parallel([
                        Animated.spring(ringScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
                        Animated.timing(ringOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                    ]).start();
                } else {
                    Animated.spring(iconBgScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
                    Animated.sequence([
                        Animated.delay(100),
                        Animated.parallel([
                            Animated.spring(checkScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
                            Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                        ]),
                    ]).start();
                    Animated.sequence([
                        Animated.delay(200),
                        Animated.parallel([
                            Animated.timing(textSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
                            Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                        ]),
                    ]).start();
                    setTimeout(() => {
                        setConfettiKey((k) => k + 1);
                        setShowConfetti(true);
                    }, 120);
                }
            });
        } else {
            setShowConfetti(false);
        }
    }, [visible, stage]);

    const animateOut = (cb: () => void) => {
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(cardScale, { toValue: 0.9, duration: 180, useNativeDriver: true }),
        ]).start(cb);
    };

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none" onRequestClose={onCancel}>
            <AnimatedView style={[sa.overlay, { opacity: overlayOpacity }]}>
                <AnimatedView
                    style={[
                        sa.card,
                        {
                            opacity: cardOpacity,
                            transform: [{ scale: cardScale }],
                        },
                    ]}
                >
                    {stage === "confirm" ? (
                        <>
                            <View style={sa.iconWrap}>
                                <AnimatedView
                                    style={[
                                        sa.iconRing,
                                        { transform: [{ scale: ringScale }], opacity: ringOpacity },
                                    ]}
                                />
                                <View style={sa.iconCircleConfirm}>
                                    <MaterialCommunityIcons
                                        name="content-save-check-outline"
                                        size={34}
                                        color="#fff"
                                    />
                                </View>
                            </View>

                            <AppText style={sa.title}>Save Product?</AppText>
                            <AppText style={sa.subtitle}>
                                {productName
                                    ? `"${productName}" will be submitted for review. Once approved, it goes live on the marketplace.`
                                    : "Your product will be submitted for review. Once approved, it goes live on the marketplace."}
                            </AppText>

                            <View style={sa.infoPill}>
                                <MaterialCommunityIcons name="clock-fast" size={14} color={C.accent4} />
                                <AppText style={sa.infoPillTxt}>
                                    Approval typically takes 24–48 hours
                                </AppText>
                            </View>

                            <View style={sa.btnRow}>
                                <TouchableOpacity
                                    style={sa.cancelBtn}
                                    onPress={() => animateOut(onCancel)}
                                    activeOpacity={0.8}
                                    disabled={isSaving}
                                >
                                    <AppText style={sa.cancelTxt}>Cancel</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[sa.confirmBtn, isSaving && { opacity: 0.75 }]}
                                    onPress={onConfirm}
                                    activeOpacity={0.88}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                                    )}
                                    <AppText style={sa.confirmTxt}>
                                        {isSaving ? "Saving…" : "Yes, Save"}
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {showConfetti && (
                                <View style={sa.confettiAnchor} pointerEvents="none">
                                    {CONFETTI_DOTS.map((d, i) => (
                                        <ConfettiDot
                                            key={`${confettiKey}-${i}`}
                                            color={d.color}
                                            delay={d.delay}
                                            startX={d.dx}
                                            startY={d.dy}
                                        />
                                    ))}
                                </View>
                            )}

                            <View style={sa.iconWrap}>
                                <AnimatedView
                                    style={[
                                        sa.iconCircleSuccess,
                                        { transform: [{ scale: iconBgScale }] },
                                    ]}
                                >
                                    <AnimatedView
                                        style={{
                                            opacity: checkOpacity,
                                            transform: [{ scale: checkScale }],
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name="check-bold"
                                            size={38}
                                            color="#fff"
                                        />
                                    </AnimatedView>
                                </AnimatedView>
                            </View>

                            <AnimatedView
                                style={{
                                    opacity: textOpacity,
                                    transform: [{ translateY: textSlide }],
                                    alignItems: "center",
                                }}
                            >
                                <AppText style={sa.successTitle}>Product Saved!</AppText>
                                <AppText style={sa.successSubtitle}>
                                    {productName
                                        ? `"${productName}" has been submitted for review.`
                                        : "Your product has been submitted for review."}
                                    {savedProductId ? `\nProduct ID: ${savedProductId}` : ""}
                                    {"\n"}You&apos;ll be notified once it goes live.
                                </AppText>

                                <View style={sa.statsRow}>
                                    {[
                                        { icon: "clock-check-outline", label: "24–48 hr approval", color: C.accent4 },
                                        { icon: "storefront-outline", label: "Goes live after approval", color: C.accent5 },
                                    ].map((item) => (
                                        <View key={item.label} style={sa.statChip}>
                                            <MaterialCommunityIcons
                                                name={item.icon as any}
                                                size={14}
                                                color={item.color}
                                            />
                                            <AppText style={[sa.statChipTxt, { color: item.color }]}>
                                                {item.label}
                                            </AppText>
                                        </View>
                                    ))}
                                </View>
                            </AnimatedView>

                            <AnimatedView style={{ opacity: textOpacity, width: "100%", marginTop: 24 }}>
                                <TouchableOpacity
                                    style={sa.doneBtn}
                                    onPress={() => animateOut(onDone)}
                                    activeOpacity={0.88}
                                >
                                    <AppText style={sa.doneTxt}>Done</AppText>
                                    <Ionicons name="checkmark" size={17} color="#fff" />
                                </TouchableOpacity>
                            </AnimatedView>
                        </>
                    )}
                </AnimatedView>
            </AnimatedView>
        </Modal>
    );
};

const sa = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,20,60,0.55)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: C.white,
        borderRadius: 28,
        paddingHorizontal: 28,
        paddingTop: 36,
        paddingBottom: 28,
        alignItems: "center",
        shadowColor: "#0F1A4A",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.22,
        shadowRadius: 40,
        elevation: 28,
    },
    iconWrap: {
        width: 90,
        height: 90,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 22,
    },
    iconRing: {
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: C.accent5 + "40",
        backgroundColor: C.accent5 + "12",
    },
    iconCircleConfirm: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: C.accent5,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: C.accent5,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        elevation: 10,
    },
    iconCircleSuccess: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: C.green,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: C.green,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.42,
        shadowRadius: 20,
        elevation: 12,
    },
    confettiAnchor: {
        position: "absolute",
        top: 72,
        alignSelf: "center",
        width: 0,
        height: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontFamily: fontFamilies.bold,
        fontSize: 22,
        color: C.textDark,
        textAlign: "center",
        marginBottom: 10,
        letterSpacing: 0.1,
    },
    subtitle: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    infoPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "#FEF3C7",
        borderRadius: 50,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#FCD34D",
        marginBottom: 24,
    },
    infoPillTxt: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 12,
        color: C.accent4,
    },
    btnRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    cancelBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: C.bg,
    },
    cancelTxt: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 15,
        color: C.textMid,
    },
    confirmBtn: {
        flex: 1.6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: C.accent5,
        shadowColor: C.accent5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    confirmTxt: {
        fontFamily: fontFamilies.bold,
        fontSize: 15,
        color: C.white,
    },
    successTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 24,
        color: C.textDark,
        textAlign: "center",
        marginBottom: 10,
        letterSpacing: 0.1,
    },
    successSubtitle: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 18,
        paddingHorizontal: 4,
    },
    statsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
    },
    statChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.bg,
        borderRadius: 50,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: C.border,
    },
    statChipTxt: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 11.5,
    },
    doneBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 15,
        borderRadius: 14,
        backgroundColor: C.navy,
        width: "100%",
        shadowColor: C.navyDeep,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
    },
    doneTxt: {
        fontFamily: fontFamilies.bold,
        fontSize: 15,
        color: C.white,
    },
});

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────
type ToastItem = { id: number; message: string; type: "error" | "success" };

let toastIdCounter = 0;

const ToastContainer = ({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) => {
    const { isDesktop } = useResponsive();
    return (
        <View style={[ts.container, isDesktop && ts.containerDesktop]} pointerEvents="none">
            {toasts.map((t) => (
                <ToastBubble key={t.id} item={t} onRemove={onRemove} />
            ))}
        </View>
    );
};

const ToastBubble = ({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) => {
    const translateX = useRef(new Animated.Value(SW + 20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateX, { toValue: SW + 20, duration: 280, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
            ]).start(() => onRemove(item.id));
        }, 2800);

        return () => clearTimeout(timer);
    }, []);

    const bg = item.type === "error" ? C.toastErr : C.accent5;

    return (
        <AnimatedView style={[ts.bubble, { backgroundColor: bg, transform: [{ translateX }], opacity }]}>
            <View style={ts.iconWrap}>
                <MaterialCommunityIcons
                    name={item.type === "error" ? "alert-circle-outline" : "check-circle-outline"}
                    size={18} color={C.white}
                />
            </View>
            <AppText style={ts.msg} numberOfLines={2}>{item.message}</AppText>
        </AnimatedView>
    );
};

const ts = StyleSheet.create({
    container: {
        position: "absolute", top: 90, right: 0, left: 0,
        zIndex: 9999, alignItems: "flex-end", paddingRight: 14, gap: 8,
    },
    containerDesktop: {
        top: 24,
        left: "auto",
        right: 0,
        paddingRight: 32,
        maxWidth: 420,
        alignSelf: "flex-end",
    },
    bubble: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 14, maxWidth: SW * 0.82,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22, shadowRadius: 12, elevation: 10,
        borderTopRightRadius: 4,
    },
    iconWrap: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
    },
    msg: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white, flex: 1, lineHeight: 18 },
});

function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
        const id = ++toastIdCounter;
        setToasts(p => [...p, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(p => p.filter(t => t.id !== id));
    }, []);

    const showErrors = useCallback((errors: string[]) => {
        errors.forEach((msg, i) => {
            setTimeout(() => showToast(msg, "error"), i * 150);
        });
    }, [showToast]);

    return { toasts, showToast, showErrors, removeToast };
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
const validateBasicInfo = (data: any): string[] => {
    const e: string[] = [];
    if (!data.name?.trim()) e.push("Product Name is required");
    if (!data.category) e.push("Category is required");
    if (!data.subcategory) e.push("Subcategory is required");
    if (!data.materialType) e.push("Material Type is required");
    if (!data.hsnCode?.trim()) e.push("HSN Code is required");
    if (!data.shortDesc?.trim()) e.push("Short Description is required");
    if (!data.fullDesc?.trim()) e.push("Full Description is required");
    if (!data.length?.trim()) e.push("Length (cm) is required");
    if (!data.width?.trim()) e.push("Width (cm) is required");
    if (!data.height?.trim()) e.push("Height (cm) is required");
    if (!data.weight?.trim()) e.push("Weight (kg) is required");
    if (data.customized) {
        if (!data.custTitle?.trim()) e.push("Customization title is required");
        if (!data.custInstructions?.trim()) e.push("Customization instructions are required");
        if (data.custAllowPhoto && !data.custImageLabel?.trim()) e.push("Image upload label is required");
        if (data.custAllowText && !data.custTextLabel?.trim()) e.push("Custom text field label is required");
    }
    return e;
};

const validateVariants = (variants: any[]): string[] => {
    const e: string[] = [];
    variants.forEach((v, i) => {
        const n = i + 1;
        if (!v.color) e.push(`Variant #${n}: Color is required`);
        if (!v.size) e.push(`Variant #${n}: Size is required`);
        if (!v.stock?.trim()) e.push(`Variant #${n}: Stock Qty is required`);
        if (!v.mrp?.trim()) e.push(`Variant #${n}: MRP is required`);
        if (!v.sellingPrice?.trim()) e.push(`Variant #${n}: Selling Price is required`);
    });
    return e;
};

const validateImages = (data: any): string[] => {
    const e: string[] = [];
    if (!data.primaryImage) e.push("Primary product image is required");
    return e;
};

const validateDetails = (data: any): string[] => {
    const e: string[] = [];
    if (!data.returnPolicy) e.push("Return Policy is required");
    if (!data.deliveryOption) e.push("Delivery Option is required");
    return e;
};

// ─────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style, onLayout, zIndex, ...props }: any) => {
    const { isDesktop } = useResponsive();
    return <View onLayout={onLayout} style={[at.card, isDesktop && ds.card, style, Platform.OS === 'web' && zIndex !== undefined && { zIndex }]} {...props}>{children}</View>;
};

const SecHead = ({ icon, title, accent = C.accent1 }: { icon: string; title: string; accent?: string }) => (
    <View style={[at.secHead, { borderLeftColor: accent }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
        <AppText style={[at.secHeadText, { color: accent }]}>{title}</AppText>
    </View>
);

const Lbl = ({ text, required }: { text: string; required?: boolean }) => (
    <AppText style={at.lbl}>{text}{required && <AppText style={{ color: C.red }}> *</AppText>}</AppText>
);

const Field = ({ placeholder, value, onChangeText, keyboardType = "default", multiline = false, lines = 1, maxLength, prefix, hasError }: any) => {
    const [focused, setFocused] = useState(false);
    const { isDesktop } = useResponsive();
    return (
        <View style={[at.fieldWrap, isDesktop && ds.fieldWrap, focused && at.fieldFocused, focused && isDesktop && ds.fieldFocused, multiline && { height: lines * (isDesktop ? 24 : 22) + (isDesktop ? 30 : 26), alignItems: "flex-start" }, hasError && at.fieldError]}>
            {prefix && <AppText style={at.fieldPfx}>{prefix}</AppText>}
            <TextInput
                style={[at.fieldInput, multiline && { textAlignVertical: "top", paddingTop: 10 }]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                maxLength={maxLength}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
};

const Drop = ({ placeholder, value, onPress, hasError, options, onSelect }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <View style={Platform.OS === 'web' ? { zIndex: open ? 9999 : 1, position: 'relative' } : undefined}>
            <TouchableOpacity style={[at.drop, hasError && at.fieldError, open && Platform.OS === 'web' && { borderColor: C.navy }]} onPress={() => { if (Platform.OS === 'web' && options) { setOpen(!open); } else { if (onPress) onPress(); } }} activeOpacity={0.85}>
                <AppText style={[at.dropText, !value && at.dropPh]} numberOfLines={1}>{value || placeholder}</AppText>
                <Ionicons name={open && Platform.OS === 'web' ? "chevron-up" : "chevron-down"} size={15} color={C.textLight} />
            </TouchableOpacity>
            {Platform.OS === 'web' && open && options && (
                <>
                    <TouchableOpacity style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} activeOpacity={1} onPress={() => setOpen(false)} />
                    <View style={{ position: 'absolute' as any, top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20, zIndex: 10000, maxHeight: 220 }}>
                        <ScrollView style={{ paddingVertical: 8, maxHeight: 200 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {options.map((opt: string, idx: number) => (
                                <TouchableOpacity key={idx} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: value === opt ? C.navyGhost : 'transparent' }} onPress={() => { if (onSelect) onSelect(opt); setOpen(false); }}>
                                    <AppText style={{ fontFamily: value === opt ? fontFamilies.semiBold : fontFamilies.medium, fontSize: 13.5, color: value === opt ? C.navy : C.textMid }}>{opt}</AppText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );
};

const Divider = () => <View style={at.divider} />;
const Hint = ({ text }: { text: string }) => <AppText style={at.hint}>{text}</AppText>;
const CC = ({ cur, max }: { cur: number; max: number }) => <AppText style={at.cc}>{cur}/{max}</AppText>;

// ─── Picker Modal ─────────────────────────────────────────────
const PM = ({ visible, title, options, selected, onSelect, onClose }: any) => {
    const { isDesktop } = useResponsive();
    const items = uniquePickerOptions(options ?? []);
    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[pm.overlay, isDesktop && pm.overlayCenter]}>
                <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[pm.sheet, isDesktop && pm.popup]}>
                    {!isDesktop && <View style={pm.drag} />}
                    <View style={pm.hdr}>
                        <AppText style={pm.title}>{title}</AppText>
                        <TouchableOpacity onPress={onClose} style={pm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={isDesktop} bounces={false} style={isDesktop ? pm.listDesktop : undefined}>
                        {items.map((opt: string, index: number) => (
                            <TouchableOpacity key={`${title}-${index}-${opt}`} style={[pm.item, isDesktop && pm.itemDesktop, selected === opt && pm.itemOn]} onPress={() => { onSelect(opt); onClose(); }}>
                                <AppText style={[pm.itemTxt, selected === opt && pm.itemTxtOn]}>{opt}</AppText>
                                {selected === opt && <View style={pm.chk}><Ionicons name="checkmark" size={13} color={C.white} /></View>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const pm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(10,20,60,0.35)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "65%", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24 },
    popup: {
        position: "relative",
        bottom: undefined,
        left: undefined,
        right: undefined,
        width: "100%",
        maxWidth: 380,
        maxHeight: "75%",
        borderRadius: 20,
        paddingBottom: 16,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 32,
        elevation: 28,
        zIndex: 2,
        backgroundColor: C.white,
        overflow: "hidden",
    },
    listDesktop: { maxHeight: 280 },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
    itemDesktop: { paddingHorizontal: 20, paddingVertical: 12 },
    itemOn: { backgroundColor: C.navyGhost },
    itemTxt: { fontFamily: fontFamilies.medium, fontSize: 14, color: C.textMid },
    itemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    chk: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
});

/** Inline picker for use inside FormPopupModal */
const InlinePicker = ({
    visible, title, options, selected, onSelect, onClose,
}: {
    visible: boolean;
    title: string;
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
    onClose: () => void;
}) => {
    if (!visible) return null;
    const items = uniquePickerOptions(options ?? []);
    return (
        <View style={fp.inlinePickerWrap} pointerEvents="box-none">
            <TouchableOpacity style={fp.inlinePickerBackdrop} activeOpacity={1} onPress={onClose} />
            <View style={fp.inlinePickerSheet}>
                <View style={fp.inlinePickerHdr}>
                    <AppText style={fp.inlinePickerTitle}>{title}</AppText>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={18} color={C.textMid} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={fp.inlinePickerList} bounces={false} keyboardShouldPersistTaps="handled">
                    {items.map((opt, index) => (
                        <TouchableOpacity
                            key={`${title}-${index}-${opt}`}
                            style={[fp.inlinePickerItem, selected === opt && fp.inlinePickerItemOn]}
                            onPress={() => { onSelect(opt); onClose(); }}
                        >
                            <AppText style={[fp.inlinePickerItemTxt, selected === opt && fp.inlinePickerItemTxtOn]}>
                                {opt}
                            </AppText>
                            {selected === opt && (
                                <View style={pm.chk}>
                                    <Ionicons name="checkmark" size={13} color={C.white} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

// ─── Rich Text Editor ─────────────────────────────────────────
type Format = { bold: boolean; italic: boolean; underline: boolean; heading: "none" | "h1" | "h2" | "h3" };
const defaultFormat: Format = { bold: false, italic: false, underline: false, heading: "none" };

const RichEditor = ({ placeholder, value, onChangeText, maxLength, hasError }: any) => {
    const [fmt, setFmt] = useState<Format>(defaultFormat);
    const [focused, setFocused] = useState(false);

    const toggle = (key: keyof Format, val?: any) => {
        setFmt(f => {
            if (key === "heading") return { ...f, heading: f.heading === val ? "none" : val };
            return { ...f, [key]: !f[key] };
        });
    };

    const insertText = (insertion: string) => onChangeText(value + insertion);

    const textStyle: any = {
        fontFamily: fmt.bold ? "Outfit_700Bold" : "Outfit_400Regular",
        fontStyle: fmt.italic ? "italic" : "normal",
        textDecorationLine: fmt.underline ? "underline" : "none",
        fontSize: fmt.heading === "h1" ? 20 : fmt.heading === "h2" ? 16 : fmt.heading === "h3" ? 14 : 13,
        color: C.textDark,
    };

    const ToolBtn = ({ label, active, onPress, icon }: any) => (
        <TouchableOpacity style={[at.tbBtn, active && { backgroundColor: C.navy, borderRadius: 6 }]} onPress={onPress} activeOpacity={0.7}>
            {icon
                ? <MaterialCommunityIcons name={icon} size={14} color={active ? C.white : C.textMid} />
                : <AppText style={[at.tbTxt,
                label === "B" && { fontFamily: fontFamilies.bold },
                label === "I" && { fontStyle: "italic" },
                label === "U" && { textDecorationLine: "underline" },
                active && { color: C.white },
                ]}>{label}</AppText>
            }
        </TouchableOpacity>
    );

    return (
        <View style={[at.edCard, focused && { borderColor: C.navy }, hasError && { borderColor: C.red }]}>
            <View style={at.toolbar}>
                <ToolBtn label="B" active={fmt.bold} onPress={() => toggle("bold")} />
                <ToolBtn label="I" active={fmt.italic} onPress={() => toggle("italic")} />
                <ToolBtn label="U" active={fmt.underline} onPress={() => toggle("underline")} />
                <View style={at.tbSep} />
                <ToolBtn label="H1" active={fmt.heading === "h1"} onPress={() => toggle("heading", "h1")} />
                <ToolBtn label="H2" active={fmt.heading === "h2"} onPress={() => toggle("heading", "h2")} />
                <ToolBtn label="H3" active={fmt.heading === "h3"} onPress={() => toggle("heading", "h3")} />
                <View style={at.tbSep} />
                <ToolBtn icon="format-list-bulleted" active={false} onPress={() => insertText("\n• ")} />
                <ToolBtn icon="format-list-numbered" active={false} onPress={() => insertText("\n1. ")} />
                <ToolBtn icon="link" active={false} onPress={() => insertText("[link](url)")} />
            </View>
            <TextInput
                style={[at.edInput, textStyle, { minHeight: 72 }]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                multiline
                maxLength={maxLength}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            <View style={at.edFoot}><CC cur={(value || "").length} max={maxLength} /></View>
        </View>
    );
};

// ─────────────────────────────────────────────────────────────
// CUSTOMIZATION IMAGE PICKER
// ─────────────────────────────────────────────────────────────
const CustImagePicker = ({ uri, onPick, onRemove, hasError }: {
    uri: string | null;
    onPick: (uri: string) => void;
    onRemove: () => void;
    hasError?: boolean;
}) => {
    const [sourceModal, setSourceModal] = useState(false);

    const requestAndPick = async (source: "camera" | "gallery") => {
        setSourceModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to take a photo."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.cancelled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick a photo."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.cancelled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        }
    };

    return (
        <>
            {uri ? (
                <View style={cp.previewWrap}>
                    <Image source={{ uri }} style={cp.previewImg} resizeMode="cover" />
                    <View style={cp.previewOverlay}>
                        <TouchableOpacity style={cp.changeBtn} onPress={() => setSourceModal(true)}>
                            <MaterialCommunityIcons name="image-edit-outline" size={14} color={C.white} />
                            <AppText style={cp.changeTxt}>Change</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={cp.removeBtn} onPress={onRemove}>
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                            <AppText style={cp.removeTxt}>Remove</AppText>
                        </TouchableOpacity>
                    </View>
                    <View style={cp.checkBadge}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    style={[cp.uploadBox, hasError && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                    onPress={() => setSourceModal(true)}
                    activeOpacity={0.75}
                >
                    <View style={cp.uploadIconWrap}>
                        <MaterialCommunityIcons name="image-plus" size={28} color={C.navyLight} />
                    </View>
                    <AppText style={cp.uploadTitle}>Tap to upload reference image</AppText>
                    <AppText style={cp.uploadSub}>JPG · PNG · WebP · Max 5 MB</AppText>
                </TouchableOpacity>
            )}
            <ImageSourcePickerModal
                visible={sourceModal}
                onClose={() => setSourceModal(false)}
                title="Choose Image Source"
                onCamera={() => requestAndPick("camera")}
                onGallery={() => requestAndPick("gallery")}
            />
        </>
    );
};

const cp = StyleSheet.create({
    uploadBox: { marginTop: 10, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, gap: 6, backgroundColor: C.inputBg },
    uploadIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    uploadTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid, textAlign: "center" },
    uploadSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "center" },
    previewWrap: { marginTop: 10, borderRadius: 14, overflow: "hidden", height: 180, position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.3)" },
    modalOverlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: C.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 24,
    },
    modalPopup: {
        position: "relative",
        bottom: undefined,
        left: undefined,
        right: undefined,
        width: "100%",
        maxWidth: 440,
        borderRadius: 20,
        paddingTop: 20,
        paddingBottom: 24,
        paddingHorizontal: 24,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 28,
        zIndex: 2,
    },
    modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    modalTitle: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark, marginBottom: 16 },
    modalTitleDesktop: { fontSize: 18, marginBottom: 0, flex: 1 },
    modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    modalOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    modalOptionDesktop: { borderBottomWidth: 0, borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border },
    modalIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    modalOptTitle: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    modalOptSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 2 },
    modalCancel: { marginTop: 18, alignItems: "center", paddingVertical: 14, borderWidth: 1.2, borderColor: C.border, borderRadius: 14 },
    modalCancelDesktop: { marginTop: 8 },
    modalCancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
});

const ImageSourcePickerModal = ({
    visible, onClose, title, onCamera, onGallery, galleryHint = "Pick from your photo library",
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    onCamera: () => void;
    onGallery: () => void;
    galleryHint?: string;
}) => {
    const { isDesktop } = useResponsive();

    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[cp.modalOverlay, isDesktop && cp.modalOverlayCenter]}>
                <TouchableOpacity style={cp.modalBackdrop} activeOpacity={1} onPress={onClose} />
                <View style={[cp.modalSheet, isDesktop && cp.modalPopup]}>
                    {!isDesktop && <View style={cp.modalDrag} />}
                    {isDesktop ? (
                        <View style={cp.modalHeaderRow}>
                            <AppText style={[cp.modalTitle, cp.modalTitleDesktop]}>{title}</AppText>
                            <TouchableOpacity style={cp.modalCloseBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={20} color={C.textMid} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <AppText style={cp.modalTitle}>{title}</AppText>
                    )}
                    <TouchableOpacity style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]} onPress={onCamera} activeOpacity={0.85}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}>
                            <MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Take a Photo</AppText>
                            <AppText style={cp.modalOptSub}>Use your camera right now</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]} onPress={onGallery} activeOpacity={0.85}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}>
                            <MaterialCommunityIcons name="image-outline" size={22} color={C.accent5} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Choose from Gallery</AppText>
                            <AppText style={cp.modalOptSub}>{galleryHint}</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[cp.modalCancel, isDesktop && cp.modalCancelDesktop]} onPress={onClose} activeOpacity={0.85}>
                        <AppText style={cp.modalCancelTxt}>Cancel</AppText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── Responsive form popup ─────────────────────────────────────
const FormPopupModal = ({
    visible, onClose, title, children, overlay, wide = false, accentHeader = false, headerIcon = "ruler-square",
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    overlay?: React.ReactNode;
    wide?: boolean;
    accentHeader?: boolean;
    headerIcon?: string;
}) => {
    const { isDesktop } = useResponsive();

    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[fp.overlay, isDesktop && fp.overlayCenter]}>
                <TouchableOpacity style={fp.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[fp.sheet, isDesktop && fp.popup, isDesktop && wide && fp.popupWide, fp.sheetOverflow]}>
                    {!isDesktop && !accentHeader && <View style={fp.drag} />}
                    <View style={[fp.headerRow, accentHeader && fp.headerRowAccent]}>
                        {accentHeader && (
                            <MaterialCommunityIcons name={headerIcon as any} size={22} color={C.white} />
                        )}
                        <AppText style={[fp.title, isDesktop && fp.titleDesktop, accentHeader && fp.titleAccent]} numberOfLines={2}>
                            {title}
                        </AppText>
                        <TouchableOpacity style={[fp.closeBtn, accentHeader && fp.closeBtnAccent]} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={20} color={accentHeader ? C.white : C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={fp.bodyScroll} contentContainerStyle={fp.bodyContent} showsVerticalScrollIndicator={isDesktop} keyboardShouldPersistTaps="handled" bounces={false}>
                        {children}
                    </ScrollView>
                    {overlay}
                </View>
            </View>
        </Modal>
    );
};

const fp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.35)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "88%",
        backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: Platform.OS === "ios" ? 28 : 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 24,
    },
    popup: {
        position: "relative", bottom: undefined, left: undefined, right: undefined,
        width: "100%", maxWidth: 480, maxHeight: "85%", borderRadius: 20, paddingBottom: 24,
        shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 28, zIndex: 2,
    },
    popupWide: { maxWidth: 720 },
    sheetOverflow: { overflow: "hidden" },
    inlinePickerWrap: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: "flex-end" },
    inlinePickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,20,60,0.35)" },
    inlinePickerSheet: {
        maxHeight: "55%", backgroundColor: C.white,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        borderTopWidth: 1, borderTopColor: C.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 16,
    },
    inlinePickerHdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    inlinePickerTitle: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, flex: 1 },
    inlinePickerList: { maxHeight: 280 },
    inlinePickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
    inlinePickerItemOn: { backgroundColor: C.navyGhost },
    inlinePickerItemTxt: { fontFamily: fontFamilies.medium, fontSize: 14, color: C.textMid },
    inlinePickerItemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    headerRowAccent: { backgroundColor: C.accent4, borderBottomWidth: 0, paddingTop: 16, paddingBottom: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    titleAccent: { color: C.white, flex: 1 },
    closeBtnAccent: { backgroundColor: "rgba(255,255,255,0.2)" },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
    title: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark, flex: 1 },
    titleDesktop: { fontSize: 18 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    bodyScroll: { flexGrow: 0 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    footerRow: { flexDirection: "row", gap: 10, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
    footerRowDesktop: { justifyContent: "flex-end" },
    footerBtnSecondary: { flex: 1, maxWidth: 160, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, borderWidth: 1.2, borderColor: C.border, backgroundColor: C.white },
    footerBtnPrimary: { flex: 1, maxWidth: 180, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, backgroundColor: C.navy },
    footerBtnAccent: { backgroundColor: C.accent4 },
    footerBtnPrimaryFull: { maxWidth: undefined },
    footerBtnTxtSecondary: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    footerBtnTxtPrimary: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
});

const DEFAULT_SIZE_CHART_OPTIONS = ["No Size Chart", "Standard Apparel", "Small Chart", "Large Chart"];
const CHART_CATEGORY_ALL = "All Categories";
const CHART_SUB_ALL = "All Subcategories";
const ALL_CHART_SUBCATEGORIES = Array.from(new Set(Object.values(SUBCATEGORIES).flat()));
const MEASUREMENT_UNIT_OPTIONS = ["Centimetres (cm)", "Inches (in)"] as const;
const DEFAULT_CHART_UNIT = MEASUREMENT_UNIT_OPTIONS[0];

type SizeChartRow = {
    id: string;
    size: string;
    chest: string;
    waist: string;
    hip: string;
    length: string;
    sleeve: string;
};

let sizeRowId = 0;
const newRowId = () => `sz-${++sizeRowId}-${Date.now()}`;

const emptySizeRow = (size = ""): SizeChartRow => ({
    id: newRowId(), size, chest: "", waist: "", hip: "", length: "", sleeve: "",
});

const SIZE_TABLE_COLS = [
    { key: "size" as const, label: "Size", width: 72, placeholder: "S" },
    { key: "chest" as const, label: "Chest/Bust", width: 88, placeholder: "34-36" },
    { key: "waist" as const, label: "Waist", width: 80, placeholder: "28-30" },
    { key: "hip" as const, label: "Hip", width: 80, placeholder: "36-38" },
    { key: "length" as const, label: "Length", width: 72, placeholder: "28" },
    { key: "sleeve" as const, label: "Sleeve", width: 80, placeholder: "32-34" },
];

// ─────────────────────────────────────────────────────────────
// STEP 1 — Basic Info
// ─────────────────────────────────────────────────────────────
const StepBasicInfo = ({ data, onChange, errors, validationTrigger, catalog, isDesktop = false, actionBar }: any) => {
    const [catPick, setCatPick] = useState(false);
    const [subPick, setSubPick] = useState(false);
    const [matPick, setMatPick] = useState(false);

    const scrollRef = useRef<ScrollView>(null);
    const cardLayouts = useRef<Record<string, number>>({});
    const fieldLayouts = useRef<Record<string, number>>({});
    const fieldRefs = useRef<Record<string, any>>({});

    useEffect(() => {
        if (errors && errors.length > 0) {
            const getFieldKeyFromError = (error: string): string | null => {
                const err = error.toLowerCase();
                if (err.includes("product name") || err.includes("name is required")) return "name";
                if (err.includes("subcategory")) return "subcategory";
                if (err.includes("category")) return "category";
                if (err.includes("material")) return "materialType";
                if (err.includes("hsn")) return "hsnCode";
                if (err.includes("short description")) return "shortDesc";
                if (err.includes("full description")) return "fullDesc";
                if (err.includes("length")) return "length";
                if (err.includes("width")) return "width";
                if (err.includes("height")) return "height";
                if (err.includes("weight")) return "weight";
                if (err.includes("customization title")) return "custTitle";
                if (err.includes("customization instructions")) return "custInstructions";
                if (err.includes("image upload label")) return "custImageLabel";
                if (err.includes("text field label") || err.includes("custom text")) return "custTextLabel";
                return null;
            };

            const firstErr = errors[0];
            const fieldKey = getFieldKeyFromError(firstErr);
            if (fieldKey) {
                const targetRef = fieldRefs.current[fieldKey];
                const containerRef = scrollRef.current;

                if (Platform.OS === 'web' && targetRef && typeof targetRef.scrollIntoView === 'function') {
                    try { targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } catch (e) { }
                }

                const fallbackScroll = () => {
                    let cardKey = '';
                    if (['name', 'category', 'subcategory', 'materialType', 'hsnCode'].includes(fieldKey)) cardKey = 'identity';
                    else if (['shortDesc', 'fullDesc'].includes(fieldKey)) cardKey = 'desc';
                    else if (['length', 'width', 'height'].includes(fieldKey)) cardKey = 'dimensions';
                    else if (['weight'].includes(fieldKey)) cardKey = 'weight';
                    else if (['custTitle', 'custInstructions', 'custImageLabel', 'custTextLabel'].includes(fieldKey)) cardKey = 'custom';
                    const cardY = cardLayouts.current[cardKey] || 0;
                    const fieldY = fieldLayouts.current[fieldKey] || 0;
                    const targetY = Math.max(0, cardY + fieldY - 15);
                    containerRef?.scrollTo({ y: targetY, animated: true });
                };

                if (targetRef && containerRef) {
                    try {
                        targetRef.measureLayout(containerRef, (x: number, y: number) => {
                            containerRef.scrollTo({ y: Math.max(0, y - 15), animated: true });
                        }, () => { fallbackScroll(); });
                    } catch (e) { fallbackScroll(); }
                } else { fallbackScroll(); }
            }
        }
    }, [errors, validationTrigger]);

    const categoryPathOptions = uniquePickerOptions(buildCategoryPathOptions(catalog));
    const categoryDisplay = formatCategoryPath(data.category, data.categorySubName ?? "");
    const leafSubcats = uniquePickerOptions(
        buildLeafSubcategoryOptions(catalog, data.category, data.categorySubName ?? ""),
    );
    const materialCatalog = materialsForSelection(
        catalog,
        data.category,
        data.categorySubName ?? "",
        data.subcategory ?? "",
    );
    const materialOptions = materialCatalog.length > 0
        ? materialCatalog.map((m) => m.material)
        : MATERIAL_TYPES;

    const selectCategoryPath = (label: string) => {
        const resolved = resolveCategoryPathSelection(label, catalog);
        onChange("category", resolved.category);
        onChange("categoryId", resolved.categoryId);
        onChange("categorySubId", resolved.categorySubId);
        onChange("categorySubName", resolved.categorySubName);
        onChange("materialType", "");
        onChange("hsnCode", "");
        onChange("gstPercentage", "");
        const mid = catalog?.categories
            ?.find((c: { name: string }) => c.name === resolved.category)
            ?.subcategories?.find((s: { name: string }) => s.name === resolved.categorySubName);
        const children = mid?.children ?? [];
        if (children.length === 0) {
            const leaf = resolveLeafSubcategory(
                catalog,
                resolved.category,
                resolved.categorySubName,
                resolved.categorySubName,
            );
            onChange("subcategory", leaf.name);
            onChange("subcategoryId", leaf.id);
        } else {
            onChange("subcategory", "");
            onChange("subcategoryId", null);
        }
    };

    const selectSubcategory = (leafName: string) => {
        const leaf = resolveLeafSubcategory(
            catalog,
            data.category,
            data.categorySubName ?? "",
            leafName,
        );
        onChange("subcategory", leaf.name);
        onChange("subcategoryId", leaf.id);
        onChange("materialType", "");
        onChange("hsnCode", "");
        onChange("gstPercentage", "");
    };

    const applyMaterial = (materialName: string) => {
        onChange("materialType", materialName);
        const option = resolveMaterialOption(materialCatalog, materialName);
        const hsn = option?.hsnCode || getHsnForMaterial(materialName);
        if (hsn) onChange("hsnCode", hsn);
        const gst = resolveGstForMaterial(materialCatalog, materialName);
        if (gst != null) onChange("gstPercentage", String(gst));
    };

    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    return (
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={isDesktop} style={isDesktop ? ds.stepScroll : undefined} contentContainerStyle={getStepScrollContent(isDesktop)}>
            <Card zIndex={100} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['identity'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="tag-outline" title="Product Identity" accent={C.accent1} />
                <Divider />
                <View ref={el => { fieldRefs.current['name'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['name'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Product Name" required />
                    <Field placeholder="Enter product name" value={data.name} onChangeText={(v: string) => onChange("name", v)} hasError={hasErr("product name")} />
                </View>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }]} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['category'] = y;
                    fieldLayouts.current['subcategory'] = y;
                }}>
                    <View ref={el => { fieldRefs.current['category'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Category" required />
                        <Drop placeholder="Select category" value={categoryDisplay} onPress={() => setCatPick(true)} hasError={hasErr("category")} options={categoryPathOptions} onSelect={selectCategoryPath} />
                    </View>
                    <View ref={el => { fieldRefs.current['subcategory'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Subcategory" required />
                        <Drop placeholder="Select sub" value={data.subcategory} onPress={() => data.category && data.categorySubName && setSubPick(true)} hasError={hasErr("subcategory")} options={leafSubcats} onSelect={selectSubcategory} />
                    </View>
                </View>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 10 }]} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['materialType'] = y;
                    fieldLayouts.current['hsnCode'] = y;
                }}>
                    <View ref={el => { fieldRefs.current['materialType'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Material Type" required />
                        <Drop placeholder="Select material" value={data.materialType} onPress={() => setMatPick(true)} hasError={hasErr("material")} options={materialOptions} onSelect={applyMaterial} />
                        <Hint text="Primary material of the product" />
                    </View>
                    <View ref={el => { fieldRefs.current['hsnCode'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="HSN Code" required />
                        <View style={[at.hsnWrap, hasErr("hsn") && at.fieldError]}>
                            <MaterialCommunityIcons name="barcode-scan" size={15} color={C.navyLight} style={{ marginRight: 6 }} />
                            <TextInput style={at.hsnInput} placeholder="e.g. 6109" placeholderTextColor={C.textPlaceholder} value={data.hsnCode} onChangeText={(v: string) => onChange("hsnCode", v)} keyboardType="numeric" maxLength={8} />
                        </View>
                        <Hint text="Auto-filled from material; edit if needed" />
                    </View>
                </View>
            </Card>

            <Card zIndex={90} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['desc'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="text-box-edit-outline" title="Descriptions" accent={C.accent2} />
                <Divider />
                <View ref={el => { fieldRefs.current['shortDesc'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['shortDesc'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Short Description" required />
                    <RichEditor placeholder="Short, punchy summary of your product…" value={data.shortDesc} onChangeText={(v: string) => onChange("shortDesc", v)} maxLength={250} hasError={hasErr("short description")} />
                </View>
                <View style={{ height: 14 }} />
                <View ref={el => { fieldRefs.current['fullDesc'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['fullDesc'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Full Description" required />
                    <RichEditor placeholder="Full product description, features, highlights…" value={data.fullDesc} onChangeText={(v: string) => onChange("fullDesc", v)} maxLength={2000} hasError={hasErr("full description")} />
                </View>
            </Card>

            <Card zIndex={80} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['dimensions'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="cube-scan" title="Product Dimensions" accent={C.accent3} />
                <Divider />
                <AppText style={at.cardHint}>Enter gross dimensions (including packaging)</AppText>
                <View style={at.row3} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['length'] = y;
                    fieldLayouts.current['width'] = y;
                    fieldLayouts.current['height'] = y;
                }}>
                    {([["Length cm", "length", "30"], ["Width cm", "width", "20"], ["Height cm", "height", "10"]] as [string, string, string][]).map(([lbl, key, ph]) => (
                        <View key={key} ref={el => { fieldRefs.current[key] = el; }} style={{ flex: 1 }}>
                            <Lbl text={lbl} required />
                            <Field placeholder={ph} value={data[key]} onChangeText={(v: string) => onChange(key, v)} keyboardType="numeric" hasError={hasErr(key)} />
                        </View>
                    ))}
                </View>
            </Card>

            <Card zIndex={70} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['weight'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="weight-kilogram" title="Weight & Delivery" accent={C.accent4} />
                <Divider />
                <AppText style={at.cardHint}>Enter gross weight (including packaging)</AppText>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 10 }]} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['weight'] = e.nativeEvent.layout.y; }}>
                    <View ref={el => { fieldRefs.current['weight'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Weight (kg)" required />
                        <Field placeholder="e.g. 0.5" value={data.weight} onChangeText={(v: string) => onChange("weight", v)} keyboardType="decimal-pad" hasError={hasErr("weight")} />
                        <Hint text="Auto-calculates delivery charges" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Weight Slab" />
                        <Drop placeholder="Auto-selected" value={data.weightSlab} onPress={() => { }} />
                        <Hint text="Based on entered weight" />
                    </View>
                </View>
                {(data.intraCityCharge || data.metroMetroCharge) ? (
                    <AppText style={[at.cardHint, { marginTop: 6 }]}>
                        Intra-city ₹{data.intraCityCharge || "—"} · Metro–metro ₹{data.metroMetroCharge || "—"}
                    </AppText>
                ) : null}
                <Divider />
                <Lbl text="Fragile Item?" required />
                <View style={at.radioRow}>
                    {(["Yes", "No"] as const).map(opt => (
                        <TouchableOpacity key={opt} style={[at.radioPill, data.fragile === opt && at.radioPillOn]} onPress={() => onChange("fragile", opt)}>
                            <View style={[at.radioDot, data.fragile === opt && at.radioDotOn]} />
                            <AppText style={[at.radioPillTxt, data.fragile === opt && at.radioPillTxtOn]}>{opt}</AppText>
                        </TouchableOpacity>
                    ))}
                </View>
                <Hint text="Mark if special protective packaging is required" />
            </Card>

            <Card zIndex={60} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['custom'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="palette-outline" title="Customization" accent={C.accent5} />
                <Divider />
                <TouchableOpacity style={at.customRow} onPress={() => onChange("customized", !data.customized)} activeOpacity={0.7}>
                    <View style={[at.tog, data.customized && at.togOn]}>
                        <View style={[at.togThumb, data.customized && at.togThumbOn]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <AppText style={at.customTitle}>Customized Product</AppText>
                        <AppText style={at.customSub}>Enable if buyers can personalise this product</AppText>
                    </View>
                </TouchableOpacity>

                {data.customized && (
                    <View style={at.custExpandWrap}>
                        <Divider />
                        <View ref={el => { fieldRefs.current['custTitle'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custTitle'] = e.nativeEvent.layout.y; }}>
                            <Lbl text="Customization Title" required />
                            <Field placeholder="e.g. Personalised Name Engraving" value={data.custTitle} onChangeText={(v: string) => onChange("custTitle", v)} maxLength={100} hasError={hasErr("customization title")} />
                        </View>
                        <View ref={el => { fieldRefs.current['custInstructions'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custInstructions'] = e.nativeEvent.layout.y; }}>
                            <Lbl text="Instructions for Buyer" required />
                            <Field placeholder="e.g. Please share your name, preferred font, and colour preference…" value={data.custInstructions} onChangeText={(v: string) => onChange("custInstructions", v)} multiline lines={3} maxLength={500} hasError={hasErr("customization instructions")} />
                        </View>
                        <CC cur={(data.custInstructions || "").length} max={500} />

                        <Lbl text="Allow Reference Image Upload" />
                        <View style={at.custTogRow}>
                            <Switch value={data.custAllowPhoto} onValueChange={(v: boolean) => onChange("custAllowPhoto", v)} trackColor={{ false: C.border, true: C.accent5 }} thumbColor={C.white} />
                            <View style={{ flex: 1 }}>
                                <AppText style={at.custTogTitle}>Buyer can upload a reference image</AppText>
                                <AppText style={at.custTogSub}>Accepted: JPG / PNG · Max 5 MB · 1 image</AppText>
                            </View>
                        </View>
                        {data.custAllowPhoto && (
                            <View ref={el => { fieldRefs.current['custImageLabel'] = el; }} style={at.custSubField} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custImageLabel'] = e.nativeEvent.layout.y; }}>
                                <View style={at.custSubFieldBar} />
                                <View style={{ flex: 1 }}>
                                    <Lbl text="Image Upload Label" required />
                                    <Field placeholder="e.g. Upload your reference photo here" value={data.custImageLabel} onChangeText={(v: string) => onChange("custImageLabel", v)} maxLength={120} hasError={hasErr("image upload label")} />
                                    <Hint text="This label is shown to the buyer on the upload field" />
                                    <Lbl text="Sample / Reference Image" />
                                    <CustImagePicker uri={data.custPickedImage} onPick={(uri: string) => onChange("custPickedImage", uri)} onRemove={() => onChange("custPickedImage", null)} hasError={false} />
                                    <Hint text="Optionally upload a sample so buyers know what to send" />
                                </View>
                            </View>
                        )}

                        <Lbl text="Allow Custom Text / Name" />
                        <View style={at.custTogRow}>
                            <Switch value={data.custAllowText} onValueChange={(v: boolean) => onChange("custAllowText", v)} trackColor={{ false: C.border, true: C.accent5 }} thumbColor={C.white} />
                            <View style={{ flex: 1 }}>
                                <AppText style={at.custTogTitle}>Buyer can enter a name or message</AppText>
                                <AppText style={at.custTogSub}>Max 100 characters · any case allowed</AppText>
                            </View>
                        </View>
                        {data.custAllowText && (
                            <View ref={el => { fieldRefs.current['custTextLabel'] = el; }} style={at.custSubField} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custTextLabel'] = e.nativeEvent.layout.y; }}>
                                <View style={at.custSubFieldBar} />
                                <View style={{ flex: 1 }}>
                                    <Lbl text="Text Field Label" required />
                                    <Field placeholder="e.g. Enter the name to be printed" value={data.custTextLabel} onChangeText={(v: string) => onChange("custTextLabel", v)} maxLength={120} hasError={hasErr("custom text field label")} />
                                    <Hint text="This label is shown to the buyer on the text input field" />
                                </View>
                            </View>
                        )}

                        <View style={at.row2}>
                            <View style={{ flex: 1 }}>
                                <Lbl text="Extra Lead Time (days)" />
                                <Field placeholder="e.g. 3" value={data.custLeadDays} onChangeText={(v: string) => onChange("custLeadDays", v)} keyboardType="numeric" />
                                <Hint text="Additional days for customisation" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Lbl text="Extra Charge (₹)" />
                                <Field placeholder="0.00" value={data.custCharge} onChangeText={(v: string) => onChange("custCharge", v)} keyboardType="decimal-pad" prefix="₹" />
                                <Hint text="Leave blank if free" />
                            </View>
                        </View>

                        <View style={at.custNote}>
                            <MaterialCommunityIcons name="information-outline" size={15} color={C.accent5} />
                            <AppText style={at.custNoteTxt}>
                                Customised orders cannot be cancelled after production begins. Make sure your policy is clearly stated.
                            </AppText>
                        </View>
                    </View>
                )}
            </Card>

            <PM visible={catPick} title="Select Category" options={categoryPathOptions} selected={categoryDisplay}
                onSelect={selectCategoryPath}
                onClose={() => setCatPick(false)} />
            <PM visible={subPick} title="Select Subcategory" options={leafSubcats} selected={data.subcategory}
                onSelect={selectSubcategory}
                onClose={() => setSubPick(false)} />
            <PM visible={matPick} title="Select Material" options={materialOptions} selected={data.materialType}
                onSelect={applyMaterial}
                onClose={() => setMatPick(false)} />
            {actionBar}
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// REUSABLE IMAGE PICKER GRID
// ─────────────────────────────────────────────────────────────
const MAX_IMAGES = 6;

const ImagePickerGrid = ({
    images, onAdd, onRemove, maxCount = MAX_IMAGES, hasError = false, label = "Add Photo",
}: {
    images: string[]; onAdd: (uris: string[]) => void; onRemove: (index: number) => void;
    maxCount?: number; hasError?: boolean; label?: string;
}) => {
    const [srcModal, setSrcModal] = useState(false);

    const pickImages = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        const remaining = maxCount - images.length;
        if (remaining <= 0) return;

        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to take a photo."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.cancelled && result.assets?.[0]?.uri) onAdd([result.assets[0].uri]);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick photos."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: remaining > 1, selectionLimit: remaining, quality: 0.85 });
            if (!result.cancelled && result.assets?.length) onAdd(result.assets.map((a: any) => a.uri));
        }
    };

    const canAdd = images.length < maxCount;

    return (
        <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 6 }} style={{ marginTop: 10 }}>
                {canAdd && (
                    <TouchableOpacity style={[ipg.addSlot, hasError && images.length === 0 && { borderColor: C.red, backgroundColor: "#FFF8F8" }]} onPress={() => setSrcModal(true)} activeOpacity={0.75}>
                        <View style={ipg.addIcon}><MaterialCommunityIcons name="camera-plus-outline" size={22} color={C.navyLight} /></View>
                        <AppText style={ipg.addTxt}>{label}</AppText>
                        <AppText style={ipg.addCount}>{images.length}/{maxCount}</AppText>
                    </TouchableOpacity>
                )}
                {images.map((uri, i) => (
                    <View key={uri + i} style={ipg.thumb}>
                        <Image source={{ uri }} style={ipg.thumbImg} resizeMode="cover" />
                        {i === 0 && (
                            <View style={ipg.primaryBadge}><AppText style={ipg.primaryTxt}>Primary</AppText></View>
                        )}
                        <TouchableOpacity style={ipg.removeBtn} onPress={() => onRemove(i)}>
                            <Ionicons name="close" size={11} color={C.white} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            {images.length > 0 && <AppText style={ipg.hint}>First image is used as primary · tap × to remove</AppText>}
            <ImageSourcePickerModal visible={srcModal} onClose={() => setSrcModal(false)} title="Add Image" onCamera={() => pickImages("camera")} onGallery={() => pickImages("gallery")} galleryHint={`Pick up to ${maxCount - images.length} photo${maxCount - images.length !== 1 ? "s" : ""}`} />
        </>
    );
};

const ipg = StyleSheet.create({
    addSlot: { width: 90, height: 90, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: C.inputBg },
    addIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.navyLight, textAlign: "center" },
    addCount: { fontFamily: fontFamilies.regular, fontSize: 9, color: C.textLight },
    thumb: { width: 90, height: 90, borderRadius: 14, overflow: "hidden", position: "relative" },
    thumbImg: { width: "100%", height: "100%" },
    primaryBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(26,43,109,0.72)", paddingVertical: 3, alignItems: "center" },
    primaryTxt: { fontFamily: fontFamilies.semiBold, fontSize: 9, color: C.white, letterSpacing: 0.4 },
    removeBtn: { position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(200,30,30,0.85)", alignItems: "center", justifyContent: "center" },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 6 },
});

// ─────────────────────────────────────────────────────────────
// STEP 2 — Variants
// ─────────────────────────────────────────────────────────────
type Variant = {
    id: string; color: string; colorId?: number; size: string; sizeId?: number;
    sku: string; stock: string; mrp: string; sellingPrice: string; discount: string;
    images: string[]; videoUrl: string;
};

const StepVariants = ({ variants, setVariants, rmVariant, errors, catalog, isDesktop = false, actionBar }: any) => {
    const [clrPick, setClrPick] = useState<string | null>(null);
    const [szPick, setSzPick] = useState<string | null>(null);

    const hasErr = (id: string, field: string) =>
        errors.some((e: string) =>
            e.toLowerCase().includes(`variant #${variants.findIndex((v: Variant) => v.id === id) + 1}`) &&
            e.toLowerCase().includes(field.toLowerCase())
        );

    const addVariant = () => {
        const id = Date.now().toString();
        setVariants((p: Variant[]) => [...p, { id, color: "", size: "", sku: "", stock: "", mrp: "", sellingPrice: "", discount: "0", images: [], videoUrl: "" }]);
    };

    const addVariantImage = (id: string, uris: string[]) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => v.id !== id ? v : { ...v, images: [...v.images, ...uris].slice(0, MAX_IMAGES) }));
    };

    const removeVariantImage = (id: string, index: number) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => v.id !== id ? v : { ...v, images: v.images.filter((_, i) => i !== index) }));
    };

    const colorOptions = catalog?.colors?.map((c: { name: string }) => c.name) ?? COLORS_LIST;
    const sizeOptions = catalog?.sizes?.map((s: { name: string; code: string }) => s.name === s.code ? s.name : `${s.name} (${s.code})`) ?? SIZES_LIST;

    const upVariant = (id: string, field: string, value: string | number | undefined) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            let cleanVal = value;
            if (typeof value === "string" && ["mrp", "sellingPrice", "stock", "discount"].includes(field)) {
                cleanVal = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
            }
            const u = { ...v, [field]: cleanVal };
            if (field === "mrp" || field === "sellingPrice") {
                const mrpRaw = field === "mrp" ? cleanVal : u.mrp;
                const spRaw = field === "sellingPrice" ? cleanVal : u.sellingPrice;
                const mrp = parseFloat(String(mrpRaw ?? "")) || 0;
                const sp = parseFloat(String(spRaw ?? "")) || 0;
                if (mrp > 0 && sp > 0 && sp <= mrp) u.discount = String(Math.round(((mrp - sp) / mrp) * 100));
            }
            return u;
        }));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={isDesktop} style={isDesktop ? ds.stepScroll : undefined} contentContainerStyle={getStepScrollContent(isDesktop)}>
            {variants.map((v: Variant, idx: number) => (
                <Card key={v.id} zIndex={100 - idx} style={{ marginBottom: 12 }}>
                    <View style={vt.hdr}>
                        <View style={vt.badge}><AppText style={vt.badgeTxt}>#{idx + 1}</AppText></View>
                        <AppText style={vt.title}>Variant</AppText>
                        {variants.length > 1 && (
                            <TouchableOpacity onPress={() => rmVariant(v.id)} style={vt.rmBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                                <AppText style={vt.rmTxt}>Remove</AppText>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Divider />
                    <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }]}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Color" required />
                            <Drop placeholder="Select color" value={v.color} onPress={() => setClrPick(v.id)} hasError={hasErr(v.id, "color")} options={colorOptions} onSelect={(val: string) => {
                                const color = catalog?.colors?.find((c: { name: string }) => c.name === val);
                                upVariant(v.id, "color", val);
                                upVariant(v.id, "colorId", color?.id);
                            }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Size" required />
                            <Drop placeholder="Select size" value={v.size} onPress={() => setSzPick(v.id)} hasError={hasErr(v.id, "size")} options={sizeOptions} onSelect={(val: string) => {
                                const size = catalog?.sizes?.find((s: { name: string; code: string }) => s.name === val || `${s.name} (${s.code})` === val || s.code === val);
                                upVariant(v.id, "size", size?.name ?? val);
                                upVariant(v.id, "sizeId", size?.id);
                            }} />
                        </View>
                    </View>
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <View style={vt.lblRow}>
                                <Lbl text="SKU" />
                                <View style={vt.auto}><AppText style={vt.autoTxt}>Auto</AppText></View>
                            </View>
                            <Field placeholder="Auto-generated" value={v.sku} onChangeText={(val: string) => upVariant(v.id, "sku", val)} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Stock Qty" required />
                            <Field placeholder="0" value={v.stock} onChangeText={(val: string) => upVariant(v.id, "stock", val)} keyboardType="numeric" hasError={hasErr(v.id, "stock")} />
                        </View>
                    </View>
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="MRP (excl. GST)" required />
                            <Field placeholder="0.00" value={v.mrp} onChangeText={(val: string) => upVariant(v.id, "mrp", val)} keyboardType="decimal-pad" prefix="₹" hasError={hasErr(v.id, "mrp")} />
                            <Hint text="Maximum Retail Price" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Selling Price" required />
                            <Field placeholder="0.00" value={v.sellingPrice} onChangeText={(val: string) => upVariant(v.id, "sellingPrice", val)} keyboardType="decimal-pad" prefix="₹" hasError={hasErr(v.id, "selling")} />
                            <Hint text="Your price excl. GST" />
                        </View>
                    </View>
                    <View style={{ width: "50%" }}>
                        <View style={vt.lblRow}>
                            <Lbl text="Discount %" />
                            <View style={vt.auto}><AppText style={vt.autoTxt}>Auto</AppText></View>
                        </View>
                        <Field placeholder="0" value={v.discount} onChangeText={(val: string) => upVariant(v.id, "discount", val)} keyboardType="numeric" />
                    </View>
                    <Divider />
                    <Lbl text="Variant Images" />
                    <Hint text="Add up to 6 images · first image is used as primary" />
                    <ImagePickerGrid images={v.images} onAdd={(uris: string[]) => addVariantImage(v.id, uris)} onRemove={(i: number) => removeVariantImage(v.id, i)} maxCount={6} hasError={hasErr(v.id, "image")} label="Add Photo" />
                </Card>
            ))}

            <TouchableOpacity style={vt.addBtn} onPress={addVariant}>
                <View style={vt.addIcon}><Ionicons name="add" size={18} color={C.navy} /></View>
                <AppText style={vt.addTxt}>Add Another Variant</AppText>
            </TouchableOpacity>

            <View style={vt.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={C.navyLight} />
                <AppText style={vt.infoTxt}>Each variant can have its own price, stock, and images. At least one variant is required.</AppText>
            </View>

            <PM visible={!!clrPick} title="Select Color" options={colorOptions} selected={variants.find((v: Variant) => v.id === clrPick)?.color || ""}
                onSelect={(val: string) => {
                    if (!clrPick) return;
                    const color = catalog?.colors?.find((c: { name: string }) => c.name === val);
                    upVariant(clrPick, "color", val);
                    upVariant(clrPick, "colorId", color?.id);
                }}
                onClose={() => setClrPick(null)} />
            <PM visible={!!szPick} title="Select Size" options={sizeOptions} selected={variants.find((v: Variant) => v.id === szPick)?.size || ""}
                onSelect={(val: string) => {
                    if (!szPick) return;
                    const size = catalog?.sizes?.find((s: { name: string; code: string }) => s.name === val || `${s.name} (${s.code})` === val || s.code === val);
                    upVariant(szPick, "size", size?.name ?? val);
                    upVariant(szPick, "sizeId", size?.id);
                }}
                onClose={() => setSzPick(null)} />
            {actionBar}
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP 3 — Images
// ─────────────────────────────────────────────────────────────
const StepImages = ({ data, onChange, errors, isDesktop = false, actionBar }: any) => {
    const hasErr = errors.some((e: string) => e.toLowerCase().includes("primary"));
    const [srcModal, setSrcModal] = useState(false);

    const pickPrimaryImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick photos."); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
        if (!result.cancelled && result.assets?.[0]?.uri) onChange("primaryImage", result.assets[0].uri);
    };

    const pickVideo = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to record a video."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
            if (!result.cancelled && result.assets?.[0]?.uri) onChange("video", result.assets[0].uri);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick a video."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
            if (!result.cancelled && result.assets?.[0]?.uri) onChange("video", result.assets[0].uri);
        }
    };

    const additionalImages: string[] = data.additionalImages ?? [];

    return (
        <ScrollView showsVerticalScrollIndicator={isDesktop} style={isDesktop ? ds.stepScroll : undefined} contentContainerStyle={getStepScrollContent(isDesktop)}>
            <Card>
                <SecHead icon="image-multiple-outline" title="Product Images" accent={C.accent2} />
                <Divider />
                <Lbl text="Primary Image" required />
                <Hint text="First image shown to buyers. JPG, PNG or WebP · max 5 MB." />
                {data.primaryImage ? (
                    <View style={ig.previewWrap}>
                        <Image source={{ uri: data.primaryImage }} style={ig.previewImg} resizeMode="cover" />
                        <View style={ig.previewOverlay}>
                            <TouchableOpacity style={ig.changeBtn} onPress={pickPrimaryImage}>
                                <MaterialCommunityIcons name="image-edit-outline" size={14} color={C.white} />
                                <AppText style={ig.changeTxt}>Change</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity style={ig.removeBtn} onPress={() => onChange("primaryImage", null)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                                <AppText style={ig.removeTxt}>Remove</AppText>
                            </TouchableOpacity>
                        </View>
                        <View style={ig.checkBadge}><MaterialCommunityIcons name="check-circle" size={20} color={C.green} /></View>
                    </View>
                ) : (
                    <TouchableOpacity style={[ig.box, hasErr && { borderColor: C.red, backgroundColor: "#FFF8F8" }]} onPress={pickPrimaryImage} activeOpacity={0.75}>
                        <View style={ig.iconWrap}><MaterialCommunityIcons name="image-plus" size={32} color={hasErr ? C.red : C.navyLight} /></View>
                        <AppText style={[ig.title, hasErr && { color: C.red }]}>{hasErr ? "Primary image is required" : "Tap to upload primary image"}</AppText>
                        <AppText style={ig.sub}>JPG · PNG · WebP · Max 5 MB</AppText>
                    </TouchableOpacity>
                )}
                <View style={{ height: 20 }} />
                <Lbl text="Additional Images" />
                <Hint text="Add more images to showcase different angles. Up to 4 additional images." />
                <ImagePickerGrid images={additionalImages} onAdd={(uris: string[]) => onChange("additionalImages", [...additionalImages, ...uris].slice(0, 4))} onRemove={(index: number) => onChange("additionalImages", additionalImages.filter((_: string, i: number) => i !== index))} maxCount={4} hasError={false} label="Add More" />
                <View style={{ height: 20 }} />
                <Lbl text="Product Video (Optional)" />
                <Hint text="Upload a video to show your product in action. Max 20 MB." />
                {data.video ? (
                    <View style={ig.videoPreviewWrap}>
                        <View style={ig.videoIconWrap}><MaterialCommunityIcons name="video" size={26} color={C.navy} /></View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <AppText style={ig.videoTitle} numberOfLines={1}>{data.video.split("/").pop() || "product_video.mp4"}</AppText>
                            <AppText style={ig.videoSub}>Video ready for upload</AppText>
                        </View>
                        <TouchableOpacity style={ig.videoChangeBtn} onPress={() => setSrcModal(true)}>
                            <MaterialCommunityIcons name="pencil" size={15} color={C.navy} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ig.videoRemoveBtn} onPress={() => onChange("video", null)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={ig.videoBox} onPress={() => setSrcModal(true)} activeOpacity={0.75}>
                        <View style={ig.videoIconWrapLarge}><MaterialCommunityIcons name="video-plus-outline" size={28} color={C.navyLight} /></View>
                        <AppText style={ig.videoBoxTitle}>Tap to upload product video</AppText>
                        <AppText style={ig.videoBoxSub}>MP4 · MOV · WebM · Max 20 MB</AppText>
                    </TouchableOpacity>
                )}
                <ImageSourcePickerModal visible={srcModal} onClose={() => setSrcModal(false)} title="Add Video" onCamera={() => pickVideo("camera")} onGallery={() => pickVideo("gallery")} galleryHint="Pick a video from your library" />
            </Card>
            {actionBar}
        </ScrollView>
    );
};

const ig = StyleSheet.create({
    box: { marginTop: 12, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: C.inputBg },
    iconWrap: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    title: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid },
    sub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight },
    previewWrap: { marginTop: 12, borderRadius: 14, overflow: "hidden", height: 200, position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    slot: { width: 100, height: 100, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
    slotTxt: { fontFamily: fontFamilies.medium, fontSize: 11, color: C.navyLight },
    videoBox: { marginTop: 12, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 24, gap: 6, backgroundColor: C.inputBg },
    videoIconWrapLarge: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    videoBoxTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid, textAlign: "center" },
    videoBoxSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "center" },
    videoPreviewWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, backgroundColor: C.navyGhost, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: C.navyBorder },
    videoIconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    videoTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textDark },
    videoSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2 },
    videoChangeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    videoRemoveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.redPale, alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────────────────────
// STEP 4 — Details
// ─────────────────────────────────────────────────────────────
const StepDetails = ({ data, onChange, errors, validationTrigger = 0, isDesktop = false, actionBar }: any) => {
    const scrollRef = useRef<ScrollView>(null);
    const fieldRefs = useRef<Record<string, any>>({});

    useEffect(() => {
        if (validationTrigger > 0 && errors && errors.length > 0) {
            const getFieldKeyFromError = (error: string): string | null => {
                const err = error.toLowerCase();
                if (err.includes("return policy")) return "returnPolicy";
                if (err.includes("delivery option")) return "deliveryOption";
                return null;
            };
            const firstErr = errors[0];
            const fieldKey = getFieldKeyFromError(firstErr);
            if (fieldKey) {
                const targetRef = fieldRefs.current[fieldKey];
                if (Platform.OS === 'web' && targetRef && typeof targetRef.scrollIntoView === 'function') {
                    try { targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } catch (e) { }
                }
                if (targetRef && scrollRef.current) {
                    try {
                        targetRef.measureLayout(scrollRef.current as any, (x: number, y: number) => {
                            scrollRef.current?.scrollTo({ y: Math.max(0, y - 15), animated: true });
                        }, () => { });
                    } catch (e) { }
                }
            }
        }
    }, [errors, validationTrigger]);

    const [sizePick, setSizePick] = useState(false);
    const [retPick, setRetPick] = useState(false);
    const [delPick, setDelPick] = useState(false);
    const [createSizeOpen, setCreateSizeOpen] = useState(false);
    const [customPolicyOpen, setCustomPolicyOpen] = useState(false);
    const [sizeChartOptions, setSizeChartOptions] = useState<string[]>(DEFAULT_SIZE_CHART_OPTIONS);
    const [newChartName, setNewChartName] = useState("");
    const [chartCategory, setChartCategory] = useState(CHART_CATEGORY_ALL);
    const [chartSubcategory, setChartSubcategory] = useState(CHART_SUB_ALL);
    const [chartImageUri, setChartImageUri] = useState<string | null>(null);
    const [chartRows, setChartRows] = useState<SizeChartRow[]>([]);
    const [chartUnit, setChartUnit] = useState<string>(DEFAULT_CHART_UNIT);
    const [chartNotes, setChartNotes] = useState("");
    const [chartCatPick, setChartCatPick] = useState(false);
    const [chartSubPick, setChartSubPick] = useState(false);
    const [chartUnitPick, setChartUnitPick] = useState(false);
    const [customPolicyDraft, setCustomPolicyDraft] = useState(data.returnPolicyText || "");
    const [features, setFeatures] = useState<string[]>(PREFILL_WITH_DUMMY ? ["Breathable cotton fabric", "Pre-shrunk & colour-fast", "Reinforced shoulder stitching"] : [""]);
    const [specs, setSpecs] = useState<{ name: string; value: string }[]>(PREFILL_WITH_DUMMY ? [{ name: "Fabric", value: "100% Cotton" }, { name: "Fit", value: "Regular" }, { name: "Neck", value: "Round neck" }] : [{ name: "", value: "" }]);

    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    const chartCategoryOptions = [CHART_CATEGORY_ALL, ...CATEGORIES];
    const chartSubOptions = chartCategory === CHART_CATEGORY_ALL ? [CHART_SUB_ALL, ...ALL_CHART_SUBCATEGORIES] : [CHART_SUB_ALL, ...(SUBCATEGORIES[chartCategory] || [])];

    const openCreateSizeChart = () => {
        setNewChartName(""); setChartCategory(CHART_CATEGORY_ALL); setChartSubcategory(CHART_SUB_ALL);
        setChartImageUri(null); setChartUnit(DEFAULT_CHART_UNIT); setChartNotes("");
        setChartRows([emptySizeRow()]); setChartCatPick(false); setChartSubPick(false); setChartUnitPick(false);
        setCreateSizeOpen(true);
    };

    const openCustomPolicy = () => { setCustomPolicyDraft(data.returnPolicyText || ""); setCustomPolicyOpen(true); };

    const saveSizeChart = () => {
        const name = newChartName.trim();
        if (!name) { Alert.alert("Chart name required", "Please enter a name for your size chart."); return; }
        const validRows = chartRows.filter((r) => r.size.trim());
        if (validRows.length === 0) { Alert.alert("Sizes required", "Add at least one size row to the chart."); return; }
        setSizeChartOptions((prev) => prev.includes(name) ? prev : [...prev, name]);
        onChange("sizeChart", name);
        setCreateSizeOpen(false);
    };

    const saveCustomPolicy = () => {
        const text = customPolicyDraft.trim();
        if (!text) { Alert.alert("Policy required", "Please write your custom return policy."); return; }
        onChange("returnPolicy", "Custom Policy");
        onChange("returnPolicyText", text);
        setCustomPolicyOpen(false);
    };

    const twoCol = isDesktop ? at.row2 : dt.responsiveCol;
    const fieldFlex = isDesktop ? { flex: 1 } : dt.responsiveField;

    return (
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={isDesktop} style={isDesktop ? ds.stepScroll : undefined} contentContainerStyle={getStepScrollContent(isDesktop)}>
            <Card zIndex={100}>
                <SecHead icon="ruler-square" title="Size Chart" accent={C.accent1} />
                <Divider />
                <Lbl text="Select Size Chart" />
                <View style={[twoCol, Platform.OS === 'web' && { zIndex: 20 }, isDesktop && { alignItems: "flex-end" }]}>
                    <View style={fieldFlex}>
                        <Drop placeholder="No size chart" value={data.sizeChart} onPress={() => setSizePick(true)} options={sizeChartOptions} onSelect={(v: string) => onChange("sizeChart", v)} />
                    </View>
                    <TouchableOpacity style={[dt.outBtn, !isDesktop && dt.outBtnFull]} onPress={openCreateSizeChart} activeOpacity={0.85}>
                        <Ionicons name="add" size={15} color={C.navy} />
                        <AppText style={dt.outBtnTxt}>Create New</AppText>
                    </TouchableOpacity>
                </View>
            </Card>

            <Card zIndex={90} style={{ marginTop: 12 }}>
                <SecHead icon="refresh" title="Return Policy" accent={C.accent3} />
                <Divider />
                <View style={[twoCol, Platform.OS === 'web' && { zIndex: 20 }]}>
                    <View style={fieldFlex} ref={el => { fieldRefs.current['returnPolicy'] = el; }}>
                        <Lbl text="Policy Template" required />
                        <Drop placeholder="Select template" value={data.returnPolicy} onPress={() => setRetPick(true)} hasError={hasErr("return policy")} options={RETURN_POLICIES} onSelect={(v: string) => applyReturnPolicySelection(v, onChange)} />
                    </View>
                    <View style={fieldFlex}>
                        <Lbl text="Custom Policy" />
                        <TouchableOpacity style={[dt.outBtn, !isDesktop && dt.outBtnFull]} onPress={openCustomPolicy} activeOpacity={0.85}>
                            <Feather name="edit-2" size={13} color={C.navy} />
                            <AppText style={dt.outBtnTxt}>Write Custom</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
                <Lbl text="Policy Details" />
                <Field placeholder="Describe your return policy…" value={data.returnPolicyText} onChangeText={(v: string) => onChange("returnPolicyText", v)} multiline lines={4} maxLength={1000} />
                <CC cur={(data.returnPolicyText || "").length} max={1000} />
            </Card>

            <Card zIndex={80} style={{ marginTop: 12 }}>
                <SecHead icon="truck-fast-outline" title="Delivery" accent={C.accent4} />
                <Divider />
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }, { alignItems: "flex-end", marginBottom: 12 }]}>
                    <View style={{ flex: 2 }} ref={el => { fieldRefs.current['deliveryOption'] = el; }}>
                        <Lbl text="Delivery Option" required />
                        <Drop placeholder="Select option" value={data.deliveryOption} onPress={() => setDelPick(true)} hasError={hasErr("delivery option")} options={DELIVERY_OPTIONS} onSelect={(v: string) => applyDeliverySelection(v, onChange)} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Min Days" />
                        <Field placeholder="3" value={data.minDays} onChangeText={(v: string) => onChange("minDays", v)} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Max Days" />
                        <Field placeholder="7" value={data.maxDays} onChangeText={(v: string) => onChange("maxDays", v)} keyboardType="numeric" />
                    </View>
                </View>
                <Field placeholder="Extra delivery notes…" value={data.deliveryInfo} onChangeText={(v: string) => onChange("deliveryInfo", v)} multiline lines={3} maxLength={1000} />
            </Card>

            <Card zIndex={70} style={{ marginTop: 12 }}>
                <SecHead icon="credit-card-outline" title="Payment Options" accent={C.accent5} />
                <Divider />
                <Hint text="Select all payment methods available for this product." />
                {([["codEnabled", "Cash on Delivery (COD)"], ["onlinePayEnabled", "Online Payment — Razorpay"]] as [string, string][]).map(([key, label]) => (
                    <View key={key} style={dt.togRow}>
                        <Switch value={(data as any)[key]} onValueChange={(v: boolean) => onChange(key, v)} trackColor={{ false: C.border, true: C.navy }} thumbColor={C.white} />
                        <AppText style={dt.togLbl}>{label}</AppText>
                    </View>
                ))}
            </Card>

            <Card zIndex={60} style={{ marginTop: 12 }}>
                <SecHead icon="shield-check-outline" title="Warranty & Care" accent={C.accent2} />
                <Divider />
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Warranty" />
                        <Field placeholder="e.g. 1 year warranty" value={data.warranty} onChangeText={(v: string) => onChange("warranty", v)} multiline lines={3} maxLength={500} />
                        <CC cur={(data.warranty || "").length} max={500} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Care Instructions" />
                        <Field placeholder="Care & maintenance" value={data.careInstructions} onChangeText={(v: string) => onChange("careInstructions", v)} multiline lines={3} maxLength={500} />
                        <CC cur={(data.careInstructions || "").length} max={500} />
                    </View>
                </View>
            </Card>

            <Card zIndex={50} style={{ marginTop: 12 }}>
                <SecHead icon="format-list-bulleted" title="Features & Specs" accent={C.accent1} />
                <Divider />
                <Lbl text="Product Features" />
                {features.map((f, i) => (
                    <View key={i} style={{ marginBottom: 10 }}>
                        <Field placeholder="Enter feature" value={f} onChangeText={(v: string) => { const arr = [...features]; arr[i] = v; setFeatures(arr); }} />
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => setFeatures(p => [...p, ""])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <AppText style={dt.addBtnTxt}>Add Feature</AppText>
                </TouchableOpacity>
                <Divider />
                <Lbl text="Specifications" />
                {specs.map((sp, i) => (
                    <View key={i} style={dt.specRow}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Name" value={sp.name} onChangeText={(v: string) => { const arr = [...specs]; if (arr[i]) { arr[i].name = v; } setSpecs(arr); }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Value" value={sp.value} onChangeText={(v: string) => { const arr = [...specs]; if (arr[i]) { arr[i].value = v; } setSpecs(arr); }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => setSpecs(p => p.filter((_, idx) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => setSpecs(p => [...p, { name: "", value: "" }])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <AppText style={dt.addBtnTxt}>Add Specification</AppText>
                </TouchableOpacity>
            </Card>

            <PM visible={sizePick} title="Size Chart" options={sizeChartOptions} selected={data.sizeChart} onSelect={(v: string) => onChange("sizeChart", v)} onClose={() => setSizePick(false)} />
            <PM visible={retPick} title="Return Policy" options={RETURN_POLICIES} selected={data.returnPolicy} onSelect={(v: string) => applyReturnPolicySelection(v, onChange)} onClose={() => setRetPick(false)} />
            <PM visible={delPick} title="Delivery Option" options={DELIVERY_OPTIONS} selected={data.deliveryOption} onSelect={(v: string) => applyDeliverySelection(v, onChange)} onClose={() => setDelPick(false)} />

            <FormPopupModal
                visible={createSizeOpen}
                onClose={() => { setChartCatPick(false); setChartSubPick(false); setChartUnitPick(false); setCreateSizeOpen(false); }}
                title="Create Size Chart"
                wide accentHeader headerIcon="ruler"
                overlay={
                    <>
                        <InlinePicker visible={chartCatPick} title="Select Category" options={chartCategoryOptions} selected={chartCategory} onSelect={(v: string) => { setChartCategory(v); setChartSubcategory(CHART_SUB_ALL); }} onClose={() => setChartCatPick(false)} />
                        <InlinePicker visible={chartSubPick} title="Select Subcategory" options={chartSubOptions} selected={chartSubcategory} onSelect={setChartSubcategory} onClose={() => setChartSubPick(false)} />
                        <InlinePicker visible={chartUnitPick} title="Measurement Unit" options={[...MEASUREMENT_UNIT_OPTIONS]} selected={chartUnit} onSelect={setChartUnit} onClose={() => setChartUnitPick(false)} />
                    </>
                }
            >
                <Lbl text="Chart Name" required />
                <Field placeholder="e.g. Men's Clothing Size Chart" value={newChartName} onChangeText={setNewChartName} />
                <View style={[twoCol, { marginTop: 0 }]}>
                    <View style={fieldFlex}>
                        <Lbl text="Category (Optional)" />
                        <Drop placeholder={CHART_CATEGORY_ALL} value={chartCategory} onPress={() => { setChartSubPick(false); setChartUnitPick(false); setChartCatPick(true); }} />
                    </View>
                    <View style={fieldFlex}>
                        <Lbl text="Subcategory (Optional)" />
                        <Drop placeholder={CHART_SUB_ALL} value={chartSubcategory} onPress={() => { setChartCatPick(false); setChartUnitPick(false); setChartSubPick(true); }} />
                    </View>
                </View>
                <Lbl text="Size Chart Image (Optional)" />
                <Hint text="Upload an image of your size chart (JPG, PNG, GIF, WebP)" />
                <CustImagePicker uri={chartImageUri} onPick={setChartImageUri} onRemove={() => setChartImageUri(null)} />
                <View style={dt.sizeDataHead}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Size Chart Data" required />
                        <Hint text="Enter measurements for each size." />
                    </View>
                    <TouchableOpacity style={dt.addSizeOrangeBtn} onPress={() => setChartRows(prev => [...prev, emptySizeRow()])} activeOpacity={0.85}>
                        <Ionicons name="add" size={16} color={C.white} />
                        <AppText style={dt.addSizeOrangeBtnTxt}>Add Size</AppText>
                    </TouchableOpacity>
                </View>
                {chartRows.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={isDesktop} style={dt.sizeTableScroll}>
                        <View style={dt.sizeTableWrap}>
                            <View style={dt.sizeTableHeader}>
                                {SIZE_TABLE_COLS.map((col) => (
                                    <View key={col.key} style={[dt.sizeTableTh, { width: col.width, minWidth: col.width }]}>
                                        <AppText style={dt.sizeTableThTxt} numberOfLines={2}>{col.label}</AppText>
                                    </View>
                                ))}
                                <View style={dt.sizeTableThAction}><AppText style={dt.sizeTableThTxt}>Action</AppText></View>
                            </View>
                            {chartRows.map((row, idx) => (
                                <View key={row.id} style={[dt.sizeTableRow, idx % 2 === 1 && dt.sizeTableRowAlt]}>
                                    {SIZE_TABLE_COLS.map((col) => (
                                        <View key={col.key} style={[dt.sizeTableTd, { width: col.width, minWidth: col.width }]}>
                                            <TextInput style={dt.sizeTableInput} placeholder={col.placeholder} placeholderTextColor={C.textPlaceholder} value={row[col.key]}
                                                onChangeText={(v: string) => setChartRows(prev => prev.map(r => r.id === row.id ? { ...r, [col.key]: v } : r))} />
                                        </View>
                                    ))}
                                    <View style={dt.sizeTableTdAction}>
                                        <TouchableOpacity style={dt.sizeTableDelBtn} onPress={() => setChartRows(prev => prev.filter(r => r.id !== row.id))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.red} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={dt.sizeEmptyHint}>
                        <AppText style={dt.sizeEmptyHintTxt}>Use Add Size to add rows and enter measurements for each size.</AppText>
                    </View>
                )}
                <Lbl text="Measurement Unit" />
                <Drop placeholder="Select unit" value={chartUnit} onPress={() => { setChartCatPick(false); setChartSubPick(false); setChartUnitPick(true); }} />
                <Lbl text="Additional Notes" />
                <Field placeholder="e.g. All measurements are approximate." value={chartNotes} onChangeText={setChartNotes} multiline lines={3} maxLength={500} />
                <CC cur={chartNotes.length} max={500} />
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnSecondary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setCreateSizeOpen(false)}>
                        <AppText style={fp.footerBtnTxtSecondary}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[fp.footerBtnPrimary, fp.footerBtnAccent, !isDesktop && fp.footerBtnPrimaryFull]} onPress={saveSizeChart}>
                        <AppText style={fp.footerBtnTxtPrimary}>Save Chart</AppText>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>

            <FormPopupModal visible={customPolicyOpen} onClose={() => setCustomPolicyOpen(false)} title="Write Custom Return Policy">
                <Hint text="Describe your return rules clearly. This will appear to buyers on the product page." />
                <Lbl text="Custom Policy Details" required />
                <Field placeholder="e.g. Returns accepted within 7 days in original packaging…" value={customPolicyDraft} onChangeText={setCustomPolicyDraft} multiline lines={8} maxLength={1000} />
                <CC cur={customPolicyDraft.length} max={1000} />
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnSecondary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setCustomPolicyOpen(false)}>
                        <AppText style={fp.footerBtnTxtSecondary}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[fp.footerBtnPrimary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={saveCustomPolicy}>
                        <AppText style={fp.footerBtnTxtPrimary}>Save Policy</AppText>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>
            {actionBar}
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP PROGRESS BAR
// ─────────────────────────────────────────────────────────────
const ICON_D = 38;
const ICON_R = ICON_D / 2;
const LINE_H = 3;
const N_STEPS = STEPS.length;

const StepProgressBar = ({
    step, maxUnlocked, onTabPress, isDesktop = false,
}: {
    step: number; maxUnlocked: number; onTabPress: (i: number) => void; isDesktop?: boolean;
}) => {
    const [barW, setBarW] = useState(SW);
    const colW = barW / N_STEPS;

    return (
        <View style={[sp.wrapper, isDesktop && ds.hStepBar]} onLayout={(e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width)}>
            {STEPS.map((_, i) => {
                if (i === 0) return null;
                const cx_prev = colW * (i - 1) + colW / 2;
                const cx_curr = colW * i + colW / 2;
                const lx = cx_prev + ICON_R;
                const lw = cx_curr - ICON_R - lx;
                const ly = 10 + ICON_R - LINE_H / 2;
                if (lw <= 0) return null;
                const filled = i <= maxUnlocked;
                return <View key={`seg-${i}`} pointerEvents="none" style={[sp.seg, { left: lx, top: ly, width: lw, backgroundColor: filled ? STEPS[i - 1]!.color : C.border }]} />;
            })}
            {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < maxUnlocked;
                const isReachable = i <= maxUnlocked;
                const iconBg = (isActive || isDone) ? s.color : s.color + "60";
                return (
                    <TouchableOpacity key={s.key} style={sp.col} onPress={() => isReachable && onTabPress(i)} activeOpacity={isReachable ? 0.75 : 1}>
                        <View style={[sp.circle, { backgroundColor: iconBg }, isActive && { shadowColor: s.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 7 }]}>
                            <MaterialCommunityIcons name={s.icon as any} size={18} color={C.white} />
                        </View>
                        <AppText style={[sp.lbl, isDesktop && sp.lblDesktop, isActive && { color: s.color, fontFamily: fontFamilies.bold }, isDone && { color: s.color, fontFamily: fontFamilies.semiBold }]}>
                            {s.label}
                        </AppText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const sp = StyleSheet.create({
    wrapper: { flexDirection: "row", backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 10, paddingBottom: 12, position: "relative" },
    seg: { position: "absolute", height: LINE_H, borderRadius: LINE_H / 2, zIndex: 0 },
    col: { flex: 1, alignItems: "center", gap: 6, zIndex: 1 },
    circle: { width: ICON_D, height: ICON_D, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    lbl: { fontFamily: fontFamilies.medium, fontSize: 10, color: C.textLight, textAlign: "center" },
    lblDesktop: { fontSize: 12 },
});

// ─────────────────────────────────────────────────────────────
// INITIAL STATE FACTORIES
// ─────────────────────────────────────────────────────────────
const initBasicData = () => {
    if (!PREFILL_WITH_DUMMY) {
        return {
            name: "", category: "", categorySubName: "", subcategory: "",
            categoryId: undefined as string | number | null | undefined,
            categorySubId: undefined as string | number | null | undefined,
            subcategoryId: undefined as string | number | null | undefined,
            materialType: "", hsnCode: "", gstPercentage: "",
            shortDesc: "", fullDesc: "", length: "", width: "", height: "",
            weight: "", weightSlab: "", intraCityCharge: "", metroMetroCharge: "",
            fragile: "No", customized: false,
            custTitle: "", custInstructions: "", custLeadDays: "", custCharge: "",
            custAllowPhoto: false, custImageLabel: "", custPickedImage: null as string | null,
            custAllowText: false, custTextLabel: "",
        };
    }
    return {
        name: "Premium Cotton Crew Neck T-Shirt", category: "", categorySubName: "", subcategory: "",
        categoryId: undefined as string | number | null | undefined,
        categorySubId: undefined as string | number | null | undefined,
        subcategoryId: undefined as string | number | null | undefined,
        materialType: "Cotton", hsnCode: "61091000", gstPercentage: "",
        shortDesc: "Soft, breathable cotton tee with a relaxed fit — ideal for everyday wear and easy styling.",
        fullDesc: "Crafted from 100% combed cotton with reinforced stitching at stress points. Pre-shrunk fabric, colour-fast dye, and comfortable round neck.",
        length: "30", width: "25", height: "5", weight: "0.35", weightSlab: "0–1 kg",
        intraCityCharge: "", metroMetroCharge: "",
        fragile: "No", customized: true,
        custTitle: "Personalized print",
        custInstructions: "Share the exact text or design reference. We begin production after you approve the preview.",
        custLeadDays: "3", custCharge: "149",
        custAllowPhoto: true, custImageLabel: "Upload reference image", custPickedImage: null as string | null,
        custAllowText: true, custTextLabel: "Name or message",
    };
};

const initVariants = (): Variant[] => {
    if (!PREFILL_WITH_DUMMY) {
        return [{ id: "1", color: "", size: "", sku: "", stock: "", mrp: "", sellingPrice: "", discount: "0", images: [], videoUrl: "" }];
    }
    return [
        { id: "1", color: "Blue", colorId: 14, size: "Medium", sizeId: 4, sku: "FNT-TEE-BLU-M-001", stock: "120", mrp: "1299", sellingPrice: "899", discount: "31", images: [], videoUrl: "" },
        { id: "2", color: "Black", colorId: 11, size: "Large", sizeId: 5, sku: "FNT-TEE-BLK-L-002", stock: "85", mrp: "1299", sellingPrice: "949", discount: "27", images: [], videoUrl: "" },
    ];
};

const initDetailsData = () => {
    if (!PREFILL_WITH_DUMMY) {
        return {
            sizeChart: "", returnPolicy: "", returnPolicyText: "",
            deliveryOption: "", minDays: "3", maxDays: "7", deliveryInfo: "",
            codEnabled: true, onlinePayEnabled: true, warranty: "", careInstructions: "",
        };
    }
    return {
        sizeChart: "Standard Apparel", returnPolicy: "7 Days Return",
        returnPolicyText: "Items may be returned within 7 days if unused, with tags attached.",
        deliveryOption: "Standard Delivery", minDays: "3", maxDays: "7",
        deliveryInfo: "Ships within 3–7 business days. Free shipping on orders above ₹999.",
        codEnabled: true, onlinePayEnabled: true,
        warranty: "6-month manufacturing defect warranty",
        careInstructions: "Machine wash cold with similar colours. Do not bleach. Iron on low heat.",
    };
};

const initImagesData = () => ({
    primaryImage: PREFILL_WITH_DUMMY ? DUMMY_PRIMARY_IMAGE_URI : null,
    additionalImages: PREFILL_WITH_DUMMY
        ? ["https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80", "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80"]
        : ([] as string[]),
    video: null as string | null,
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
const AddNewProduct: React.FC = () => {
    const router = useRouter();
    const { isDesktop } = useResponsive();
    const [step, setStep] = useState(0);
    const [maxUnlocked, setMaxUnlocked] = useState(0);
    const [basicErrors, setBasicErrors] = useState<string[]>([]);
    const [variantErrors, setVariantErrors] = useState<string[]>([]);
    const [imageErrors, setImageErrors] = useState<string[]>([]);
    const [detailErrors, setDetailErrors] = useState<string[]>([]);
    const [basicData, setBasicData] = useState(initBasicData);
    const [variants, setVariants] = useState<Variant[]>(initVariants);
    const [imagesData, setImagesData] = useState(initImagesData);
    const [detailsData, setDetailsData] = useState(initDetailsData);

    const [sweetAlertVisible, setSweetAlertVisible] = useState(false);
    const [sweetAlertStage, setSweetAlertStage] = useState<SweetAlertStage>("confirm");
    const [isSaving, setIsSaving] = useState(false);
    const [savedProductId, setSavedProductId] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);
    const [validationTrigger, setValidationTrigger] = useState(0);
    const weightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { toasts, showErrors, showToast, removeToast } = useToast();

    useEffect(() => {
        let cancelled = false;
        fetchProductFormCatalog()
            .then((data) => {
                if (cancelled) return;
                setCatalog(data);
                if (!PREFILL_WITH_DUMMY) return;
                setBasicData((prev) => {
                    if (prev.categoryId) return prev;
                    const cat = data.categories?.find((c) => (c.subcategories?.length ?? 0) > 0) ?? data.categories?.[0];
                    const mid = cat?.subcategories?.[0];
                    if (!cat || !mid) return prev;
                    const children = mid.children ?? [];
                    const leaf = children.length === 0
                        ? resolveLeafSubcategory(data, cat.name, mid.name, mid.name)
                        : resolveLeafSubcategory(data, cat.name, mid.name, children[0].name);
                    return {
                        ...prev,
                        category: cat.name,
                        categoryId: cat.id,
                        categorySubName: mid.name,
                        categorySubId: mid.id,
                        subcategory: leaf.name,
                        subcategoryId: leaf.id,
                    };
                });
            })
            .catch((err: unknown) => {
                showToast(getApiErrorMessage(err, "Failed to load catalog."), "error");
            });
        return () => { cancelled = true; };
    }, [showToast]);

    const resetForm = useCallback(() => {
        setStep(0);
        setMaxUnlocked(PREFILL_WITH_DUMMY ? STEPS.length - 1 : 0);
        setBasicErrors([]);
        setVariantErrors([]);
        setImageErrors([]);
        setDetailErrors([]);
        setBasicData(initBasicData());
        setVariants(initVariants());
        setImagesData(initImagesData());
        setDetailsData(initDetailsData());
        router.push('/Products');
    }, [router]);

    const upBasic = (k: string, v: any) => {
        let cleanVal = v;
        if (["weight", "length", "width", "height"].includes(k)) {
            cleanVal = v.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
        }
        setBasicData(p => {
            const next = { ...p, [k]: cleanVal };
            if (k === "weight") {
                const slab = resolveWeightSlab(cleanVal, catalog?.deliverySlabs);
                next.weightSlab = slab.label;
                if (slab.custom) {
                    next.intraCityCharge = "";
                    next.metroMetroCharge = "";
                } else if (slab.label) {
                    next.intraCityCharge = String(slab.intraCityCharge);
                    next.metroMetroCharge = String(slab.metroMetroCharge);
                } else {
                    next.intraCityCharge = "";
                    next.metroMetroCharge = "";
                }
            }
            return next;
        });
        if (k === "weight") {
            if (weightDebounceRef.current) clearTimeout(weightDebounceRef.current);
            const weightKg = parseFloat(cleanVal);
            if (Number.isFinite(weightKg) && weightKg > 0) {
                weightDebounceRef.current = setTimeout(() => {
                    fetchDeliveryChargesForWeight(weightKg)
                        .then((slab) => {
                            if (!slab) return;
                            setBasicData((p) => ({
                                ...p,
                                weightSlab: slab.label,
                                intraCityCharge: slab.custom ? "" : String(slab.intraCityCharge),
                                metroMetroCharge: slab.custom ? "" : String(slab.metroMetroCharge),
                            }));
                        })
                        .catch(() => { /* keep client slab */ });
                }, 350);
            }
        }
        setBasicErrors(prev => prev.filter(e => !e.toLowerCase().includes(k.toLowerCase())));
    };
    const upDetails = (k: string, v: any) => {
        let cleanVal = v;
        if (["weight", "length", "width", "height"].includes(k)) {
            cleanVal = String(v).replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
        }
        setDetailsData(p => ({ ...p, [k]: cleanVal }));
    };
    const rmVariant = (id: string) => setVariants(p => p.filter(v => v.id !== id));

    const handleTabPress = (i: number) => { if (i <= maxUnlocked) setStep(i); };

    const handleContinue = () => {
        if (step === 0) {
            const errors = validateBasicInfo(basicData);
            setBasicErrors(errors);
            setValidationTrigger(prev => prev + 1);
            if (errors.length > 0) { showErrors(errors); return; }
            setBasicErrors([]);
        }
        if (step === 1) {
            const errors = validateVariants(variants);
            setVariantErrors(errors);
            if (errors.length > 0) { showErrors(errors); return; }
            setVariantErrors([]);
        }
        if (step === 2) {
            const errors = validateImages(imagesData);
            setImageErrors(errors);
            if (errors.length > 0) { showErrors(errors); return; }
            setImageErrors([]);
        }
        const next = step + 1;
        setMaxUnlocked(prev => Math.max(prev, next));
        setStep(next);
    };

    const handleSave = () => {
        const basicErrs = validateBasicInfo(basicData);
        const variantErrs = validateVariants(variants);
        const imageErrs = validateImages(imagesData);
        const detailErrs = validateDetails(detailsData);
        const allErrors = [...basicErrs, ...variantErrs, ...imageErrs, ...detailErrs];

        setBasicErrors(basicErrs);
        setVariantErrors(variantErrs);
        setImageErrors(imageErrs);
        setDetailErrors(detailErrs);

        if (allErrors.length > 0) {
            showErrors(allErrors);
            setValidationTrigger(prev => prev + 1);
            return;
        }

        setSavedProductId(null);
        setSweetAlertStage("confirm");
        setSweetAlertVisible(true);
    };

    const handleSweetConfirm = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const payload = await buildCreateProductPayload({
                basic: basicData,
                variants,
                images: imagesData,
                details: detailsData,
            });
            const result = await createProduct(payload);
            setSavedProductId(result.productId);
            setSweetAlertStage("success");
            showToast(`Product saved (ID ${result.productId})`, "success");
        } catch (err: unknown) {
            showToast(getApiErrorMessage(err, "Failed to save product."), "error");
            setSweetAlertVisible(false);
        } finally {
            setIsSaving(false);
        }
    };

    // On success "Done" — just close the alert and reset the form
    const handleSweetDone = () => {
        setSweetAlertVisible(false);
        setTimeout(resetForm, 180);
    };

    const handleSweetCancel = () => {
        setSweetAlertVisible(false);
    };

    const leftAction =
        step === 0 ? (
            <TouchableOpacity style={isDesktop ? ds.cancelBtn : sc.cancelBtn} onPress={resetForm}>
                <AppText style={isDesktop ? ds.cancelTxt : sc.cancelTxt}>Cancel</AppText>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={isDesktop ? ds.prevBtn : sc.prevBtn} onPress={() => setStep((s) => s - 1)}>
                <Ionicons name="chevron-back" size={16} color={C.navy} />
                <AppText style={isDesktop ? ds.prevTxt : sc.prevTxt}>Back</AppText>
            </TouchableOpacity>
        );

    const rightAction =
        step === 3 ? (
            <TouchableOpacity style={isDesktop ? ds.saveBtn : sc.saveBtn} onPress={handleSave}>
                <MaterialCommunityIcons name="content-save-check-outline" size={18} color={C.white} />
                <AppText style={isDesktop ? ds.saveTxt : sc.saveTxt}>Save Product</AppText>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={isDesktop ? ds.nextBtn : sc.nextBtn} onPress={handleContinue}>
                <AppText style={isDesktop ? ds.nextTxt : sc.nextTxt}>Continue</AppText>
                <Ionicons name="chevron-forward" size={16} color={C.white} />
            </TouchableOpacity>
        );

    const actionBar = (
        <View style={isDesktop ? ds.bar : sc.bar}>
            <View style={isDesktop ? ds.barLeft : sc.barLeft}>{leftAction}</View>
            <View style={isDesktop ? ds.barRight : sc.barRight}>{rightAction}</View>
        </View>
    );

    const stepContent = (
        <>
            {step === 0 && <StepBasicInfo data={basicData} onChange={upBasic} errors={basicErrors} validationTrigger={validationTrigger} catalog={catalog} isDesktop={isDesktop} actionBar={actionBar} />}
            {step === 1 && <StepVariants variants={variants} setVariants={setVariants} rmVariant={rmVariant} errors={variantErrors} catalog={catalog} isDesktop={isDesktop} actionBar={actionBar} />}
            {step === 2 && <StepImages data={imagesData} onChange={(k: string, v: any) => setImagesData((p) => ({ ...p, [k]: v }))} errors={imageErrors} isDesktop={isDesktop} actionBar={actionBar} />}
            {step === 3 && <StepDetails data={detailsData} onChange={upDetails} errors={detailErrors} validationTrigger={validationTrigger} isDesktop={isDesktop} actionBar={actionBar} />}
        </>
    );

    const sweetAlert = (
        <SweetAlert
            visible={sweetAlertVisible}
            stage={sweetAlertStage}
            productName={basicData.name ?? ""}
            savedProductId={savedProductId}
            isSaving={isSaving}
            onConfirm={handleSweetConfirm}
            onCancel={handleSweetCancel}
            onDone={handleSweetDone}
        />
    );

    if (isDesktop) {
        return (
            <AdminLayout>
                <View style={[ds.page, { display: 'flex' as any, flexDirection: 'column' }]}>
                    <StatusBar barStyle="dark-content" backgroundColor={C.white} />
                    <View style={ds.topBar}>
                        <TouchableOpacity onPress={resetForm} style={ds.topBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <View style={ds.topCenter}>
                            <AppText style={ds.topTitle}>Add New Product</AppText>
                            <AppText style={ds.topSub}>{STEPS[step]?.label} · Step {step + 1} of {STEPS.length}</AppText>
                        </View>
                        <View style={ds.topBtn} />
                    </View>
                    <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} isDesktop />
                    <View style={ds.mainColumn}>
                        <View style={ds.mainScroll}>{stepContent}</View>
                    </View>
                    <ToastContainer toasts={toasts} onRemove={removeToast} />
                    {sweetAlert}
                </View>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <SafeAreaView style={sc.root}>
                <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
                <View style={sc.header}>
                    <TouchableOpacity onPress={resetForm} style={sc.hBtn}>
                        <Ionicons name="chevron-back" size={22} color={C.white} />
                    </TouchableOpacity>
                    <View style={sc.hCenter}>
                        <AppText style={sc.hTitle}>Add New Product</AppText>
                        <AppText style={sc.hSub}>Step {step + 1} of {STEPS.length}</AppText>
                    </View>
                    <View style={sc.hBtn} />
                </View>
                <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} />
                <View style={{ flex: 1, backgroundColor: C.bg }}>{stepContent}</View>
                <ToastContainer toasts={toasts} onRemove={removeToast} />
                {sweetAlert}
            </SafeAreaView>
        </AdminLayout>
    );
};

// ─────────────────────────────────────────────────────────────
// SHARED ATOM STYLES
// ─────────────────────────────────────────────────────────────
const at = StyleSheet.create({
    card: { backgroundColor: C.cardBg, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, borderWidth: 1, borderColor: C.border, shadowColor: "#0F1A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, paddingLeft: 10, borderLeftWidth: 3, borderRadius: 2 },
    secHeadText: { fontFamily: fontFamilies.bold, fontSize: 15, letterSpacing: 0.1 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
    cardHint: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginBottom: 10, fontStyle: "italic" },
    lbl: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.textMid, marginBottom: 6, marginTop: 12 },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 4 },
    cc: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "right", marginTop: 3 },
    fieldWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    fieldFocused: { borderColor: C.navy, backgroundColor: C.white },
    fieldError: { borderColor: C.red, backgroundColor: "#FFF8F8" },
    fieldPfx: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid, marginRight: 6 },
    fieldInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10, ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) },
    drop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
    dropText: { fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, flex: 1 },
    dropPh: { color: C.textPlaceholder },
    hsnWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    hsnInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10, ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) },
    row2: { flexDirection: "row", gap: 10 },
    row3: { flexDirection: "row", gap: 8 },
    edCard: { borderWidth: 1.2, borderColor: C.border, borderRadius: 10, overflow: "hidden" },
    toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: "#F2F4FB", borderBottomWidth: 1, borderBottomColor: C.border },
    tbBtn: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, minWidth: 28, alignItems: "center", justifyContent: "center" },
    tbTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    tbSep: { width: 1, height: 16, backgroundColor: C.border, marginHorizontal: 4 },
    edInput: { paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, minHeight: 56, ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) },
    edFoot: { paddingHorizontal: 12, paddingBottom: 8, alignItems: "flex-end" },
    radioRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    radioPill: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
    radioPillOn: { borderColor: C.navy, backgroundColor: C.navyGhost },
    radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border },
    radioDotOn: { borderColor: C.navy, backgroundColor: C.navy },
    radioPillTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    radioPillTxtOn: { color: C.navy, fontFamily: fontFamilies.semiBold },
    customRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    tog: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.border, justifyContent: "center", paddingHorizontal: 2, marginTop: 2 },
    togOn: { backgroundColor: C.accent5 },
    togThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },
    togThumbOn: { transform: [{ translateX: 18 }] },
    customTitle: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    customSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 17 },
    custExpandWrap: { marginTop: 4 },
    custTogRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
    custTogTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textDark },
    custTogSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 16 },
    custNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, backgroundColor: "#EDFAF4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#A3E9C8" },
    custNoteTxt: { fontFamily: fontFamilies.regular, fontSize: 11.5, color: C.accent5, flex: 1, lineHeight: 17 },
    custSubField: { flexDirection: "row", gap: 10, marginTop: 10, marginLeft: 8, paddingLeft: 4 },
    custSubFieldBar: { width: 2, borderRadius: 2, backgroundColor: C.accent5, alignSelf: "stretch", opacity: 0.5 },
});

const vt = StyleSheet.create({
    hdr: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    badgeTxt: { fontFamily: fontFamilies.bold, fontSize: 12, color: C.navy },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, flex: 1 },
    rmBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    rmTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.red },
    lblRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
    auto: { backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    autoTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.greenText },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: C.navy, borderRadius: 14, paddingVertical: 13, marginBottom: 14 },
    addIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.navyGhost, borderRadius: 12, padding: 12 },
    infoTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, flex: 1, lineHeight: 18 },
});

const dt = StyleSheet.create({
    responsiveCol: { flexDirection: "column", gap: 10 },
    responsiveField: { width: "100%", minWidth: 0 },
    outBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.2, borderColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, backgroundColor: C.white },
    outBtnFull: { width: "100%", alignSelf: "stretch" },
    outBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.navy },
    sizeDataHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 4 },
    addSizeOrangeBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accent4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
    addSizeOrangeBtnTxt: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.white },
    sizeTableScroll: { marginTop: 8, marginBottom: 4 },
    sizeTableWrap: { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: "hidden", backgroundColor: C.white },
    sizeTableHeader: { flexDirection: "row", backgroundColor: C.navyGhost, borderBottomWidth: 1, borderBottomColor: C.border },
    sizeTableTh: { paddingVertical: 10, paddingHorizontal: 6, justifyContent: "center", borderRightWidth: 1, borderRightColor: C.border },
    sizeTableThAction: { width: 56, minWidth: 56, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
    sizeTableThTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.textMid, textAlign: "center" },
    sizeTableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
    sizeTableRowAlt: { backgroundColor: "#FAFBFE" },
    sizeTableTd: { padding: 5, borderRightWidth: 1, borderRightColor: C.border, justifyContent: "center" },
    sizeTableTdAction: { width: 56, minWidth: 56, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
    sizeTableInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 7, fontFamily: fontFamilies.regular, fontSize: 12, color: C.textDark, minHeight: 34, ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) },
    sizeTableDelBtn: { padding: 6, borderRadius: 8, backgroundColor: C.redPale },
    sizeEmptyHint: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: C.navyGhost, borderWidth: 1, borderColor: C.navyBorder },
    sizeEmptyHintTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, textAlign: "center", lineHeight: 18 },
    togRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    togLbl: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
    addBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.navy },
    specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    specDel: { width: 36, height: 36, backgroundColor: C.redPale, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});

const ds = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: C.bg,
        ...(Platform.OS === "web" ? ({ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" } as object) : {}),
    },
    topBar: { flexDirection: "row", alignItems: "center", backgroundColor: C.navyDeep, paddingHorizontal: 20, paddingVertical: 14, marginHorizontal: 16, marginTop: 12, marginBottom: 12, borderRadius: 22, shadowColor: C.navyDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    topBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    topCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
    topTitle: { fontFamily: fontFamilies.bold, fontSize: 20, color: C.white, letterSpacing: 0.2, fontWeight: "bold" },
    topSub: { fontFamily: fontFamilies.medium, fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
    hStepBar: { paddingTop: 12, paddingBottom: 14, maxWidth: CONTENT_MAX + 64, width: "100%", alignSelf: "center" },
    mainColumn: { flex: 1, minWidth: 0, width: "100%", backgroundColor: C.bg },
    mainScroll: { flex: 1 },
    stepScroll: { flex: 1 },
    barWrap: { width: "100%" },
    bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, shadowColor: "#0F1A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginTop: 24, marginBottom: 12, width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" },
    barLeft: { alignItems: "flex-start" },
    barRight: { alignItems: "flex-end" },
    cancelBtn: { minWidth: 120, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white },
    cancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    prevBtn: { minWidth: 120, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white },
    prevTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    nextBtn: { minWidth: 140, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 14, shadowColor: C.navyDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
    nextTxt: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.white },
    saveBtn: { minWidth: 160, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent5, borderRadius: 12, paddingVertical: 14, shadowColor: C.accent5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    saveTxt: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.white },
    card: { borderRadius: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 22, marginBottom: 20, shadowOpacity: 0.08, shadowRadius: 16 },
    fieldWrap: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14 },
    fieldFocused: { borderWidth: 2 },
});

const sc = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { marginHorizontal: 2, marginTop: 12, borderRadius: 22,  backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 8, paddingTop: 8 },
    hBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    hCenter: { flex: 1, alignItems: "center" },
    hTitle: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.white, fontWeight: "bold" },
    hSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
    bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, shadowColor: "#0F1A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginTop: 24, marginBottom: 12 },
    barLeft: { alignItems: "flex-start" },
    barRight: { alignItems: "flex-end" },
    cancelBtn: { minWidth: 120, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 13 },
    cancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    prevBtn: { minWidth: 120, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 13 },
    prevTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    nextBtn: { minWidth: 140, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    nextTxt: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
    saveBtn: { minWidth: 160, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    saveTxt: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
});

export default AddNewProduct;
