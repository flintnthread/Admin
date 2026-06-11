import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Platform,
    Modal,
    StatusBar,
    Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";

// ─── THEME ───────────────────────────────────────────────────────────────────
const PRIMARY = "#ef7b1a";
const PRIMARY_LIGHT = "#fff4eb";
const NAVY = "#1e3a5f";
const ACCENT_TEAL = "#00b894";
const ACCENT_PURPLE = "#6c5ce7";
const ACCENT_SKY = "#0984e3";
const ACCENT_AMBER = "#e17055";
const ACCENT_PINK = "#e84393";
const ACCENT_RED = "#d63031";
const ACCENT_GREEN = "#00b359";
const ACCENT_VIOLET = "#8e44ad";

const BG_PAGE = "#f2f4f7";
const BG_CARD = "#ffffff";
const BORDER = "#e8ecf0";
const TEXT_HEAD = "#1a2b4a";
const TEXT_BODY = "#4a5568";
const TEXT_MUTED = "#a0aec0";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface FaqCategory {
    id: number;
    name: string;
    icon: string;
    color: string;
    slug: string;
}

interface FaqQuestion {
    id: number;
    categoryId: number;
    question: string;
    answer: string;
    status: "Active" | "Inactive";
    createdAt: string;
    order: number;
    isForSeller?: boolean;
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
const CATEGORIES: FaqCategory[] = [
    { id: 1, name: "About Flint & Thread", icon: "info", color: NAVY, slug: "about" },
    { id: 2, name: "Account & Profile", icon: "user", color: PRIMARY, slug: "account" },
    { id: 3, name: "Orders & Tracking", icon: "package", color: NAVY, slug: "orders" },
    { id: 4, name: "Shipping & Delivery", icon: "truck", color: PRIMARY, slug: "shipping" },
    { id: 5, name: "Payments & Wallet", icon: "credit-card", color: NAVY, slug: "payments" },
    { id: 6, name: "Returns & Refunds", icon: "refresh-cw", color: PRIMARY, slug: "returns" },
    { id: 7, name: "Seller Support", icon: "briefcase", color: NAVY, slug: "seller" },
    { id: 8, name: "Technical Issues", icon: "tool", color: PRIMARY, slug: "tech" },
];

// ─── QUESTIONS DATA ───────────────────────────────────────────────────────────
const initialQuestions: FaqQuestion[] = [
    // About Flint & Thread (cat 1)
    { id: 101, categoryId: 1, question: "What is Flint & Thread?", answer: "Flint & Thread is a premium online fashion marketplace connecting buyers with verified sellers across India. We curate quality clothing, accessories and lifestyle products from trusted brands and independent designers.", status: "Active", createdAt: "18 Nov, 2025", order: 1 },
    { id: 102, categoryId: 1, question: "When was Flint & Thread founded?", answer: "Flint & Thread was founded in 2023 with a mission to make authentic fashion accessible to every corner of India while empowering local sellers and artisans.", status: "Active", createdAt: "18 Nov, 2025", order: 2 },
    { id: 103, categoryId: 1, question: "Is Flint & Thread available across India?", answer: "Yes! We currently deliver to 500+ cities across India. We are continuously expanding our reach to serve more pin codes every month.", status: "Active", createdAt: "18 Nov, 2025", order: 3 },
    { id: 104, categoryId: 1, question: "How do I contact customer support?", answer: "You can reach our support team via the in-app chat, email at support@flintandthread.com, or call our helpline at 1800-XXX-XXXX (Mon–Sat, 9 AM – 7 PM).", status: "Active", createdAt: "18 Nov, 2025", order: 4 },
    { id: 105, categoryId: 1, question: "Does Flint & Thread have a mobile app?", answer: "Yes, the Flint & Thread app is available on both the Google Play Store (Android) and Apple App Store (iOS). Download it for a faster, personalized shopping experience.", status: "Active", createdAt: "18 Nov, 2025", order: 5 },
    { id: 106, categoryId: 1, question: "What makes Flint & Thread different from other platforms?", answer: "We focus on quality over quantity — every seller is verified, every product is reviewed, and our curation team ensures only authentic, high-quality items are listed.", status: "Active", createdAt: "18 Nov, 2025", order: 6 },
    { id: 107, categoryId: 1, question: "Are the products on Flint & Thread authentic?", answer: "Absolutely. We have a strict seller verification process and a quality check team that reviews products before they go live on the platform.", status: "Active", createdAt: "18 Nov, 2025", order: 7 },
    { id: 108, categoryId: 1, question: "Does Flint & Thread support sustainable fashion?", answer: "Yes, we actively promote eco-friendly and sustainable brands. Look for the 'Eco Badge' on product listings to identify sustainable choices.", status: "Inactive", createdAt: "18 Nov, 2025", order: 8 },

    // Account & Profile (cat 2)
    { id: 201, categoryId: 2, question: "How do I create an account?", answer: "Tap 'Sign Up' on the home screen, enter your mobile number or email, verify via OTP, and complete your profile. It takes less than 2 minutes!", status: "Active", createdAt: "18 Nov, 2025", order: 1 },
    { id: 202, categoryId: 2, question: "I forgot my password. How do I reset it?", answer: "Go to the login screen, tap 'Forgot Password', enter your registered email or mobile number, and follow the OTP verification steps to set a new password.", status: "Active", createdAt: "18 Nov, 2025", order: 2 },
    { id: 203, categoryId: 2, question: "Can I change my registered mobile number?", answer: "Yes. Go to Profile → Settings → Account Details → Edit Mobile Number. You will need to verify the new number via OTP.", status: "Active", createdAt: "18 Nov, 2025", order: 3 },
    { id: 204, categoryId: 2, question: "How do I update my delivery address?", answer: "Go to Profile → Saved Addresses → Add / Edit address. You can save multiple addresses and set a default for faster checkout.", status: "Active", createdAt: "18 Nov, 2025", order: 4 },
    { id: 205, categoryId: 2, question: "Can I have multiple accounts?", answer: "Each mobile number and email can be linked to only one Flint & Thread account. Multiple accounts violate our Terms of Service.", status: "Active", createdAt: "18 Nov, 2025", order: 5 },
    { id: 206, categoryId: 2, question: "How do I delete my account?", answer: "Go to Profile → Settings → Account → Delete Account. Please note this action is irreversible and all your data, orders and wallet balance will be permanently removed.", status: "Active", createdAt: "18 Nov, 2025", order: 6 },
    { id: 207, categoryId: 2, question: "Is my personal data safe?", answer: "Yes. We use industry-standard encryption and never share your personal data with third parties without your consent. Read our Privacy Policy for full details.", status: "Active", createdAt: "18 Nov, 2025", order: 7 },
    { id: 208, categoryId: 2, question: "How do I enable two-factor authentication?", answer: "Go to Profile → Settings → Security → Two-Factor Authentication and toggle it on. You will receive an OTP on your registered number at every login.", status: "Active", createdAt: "18 Nov, 2025", order: 8 },
    { id: 209, categoryId: 2, question: "Can I log in on multiple devices?", answer: "Yes, you can be logged in on up to 3 devices simultaneously. You can manage active sessions from Profile → Settings → Active Sessions.", status: "Active", createdAt: "18 Nov, 2025", order: 9 },
    { id: 210, categoryId: 2, question: "How do I change my profile photo?", answer: "Go to Profile, tap the camera icon on your avatar, and choose to take a photo or upload from your gallery.", status: "Inactive", createdAt: "18 Nov, 2025", order: 10 },

    // Orders & Tracking (cat 3)
    { id: 301, categoryId: 3, question: "How do I place an order?", answer: "Browse or search for a product, tap 'Add to Cart' or 'Buy Now', select your size/variant, choose a delivery address, pick a payment method, and confirm your order.", status: "Active", createdAt: "18 Nov, 2025", order: 1 },
    { id: 302, categoryId: 3, question: "How do I track my order?", answer: "Go to Orders → Select your order → Track Shipment. You will see real-time tracking updates. You also receive SMS/email notifications at every status change.", status: "Active", createdAt: "18 Nov, 2025", order: 2 },
    { id: 303, categoryId: 3, question: "Can I cancel an order?", answer: "Yes, you can cancel before the order is shipped. Go to Orders → Select order → Cancel Order. Once shipped, cancellation is not possible; you may initiate a return after delivery.", status: "Active", createdAt: "18 Nov, 2025", order: 3 },
    { id: 304, categoryId: 3, question: "What if I receive a wrong item?", answer: "We apologise for the inconvenience. Go to Orders → Select order → Report an Issue → Wrong Item Received. We will arrange a replacement or full refund within 48 hours.", status: "Active", createdAt: "18 Nov, 2025", order: 4 },
    { id: 305, categoryId: 3, question: "Can I modify my order after placing it?", answer: "Orders can be modified (address change or item removal) within 30 minutes of placement. Go to Orders → Select order → Modify Order.", status: "Active", createdAt: "18 Nov, 2025", order: 5 },
    { id: 306, categoryId: 3, question: "What is the estimated delivery time?", answer: "Standard delivery takes 3–7 business days. Express delivery (where available) delivers within 1–2 business days. Timelines may vary based on your location.", status: "Active", createdAt: "18 Nov, 2025", order: 6 },

    // Shipping & Delivery (cat 4)
    { id: 401, categoryId: 4, question: "Is delivery free?", answer: "Orders above ₹499 get free standard delivery. Orders below ₹499 attract a flat ₹49 delivery fee. Express delivery is charged separately based on weight and location.", status: "Active", createdAt: "18 Nov, 2025", order: 1 },
    { id: 402, categoryId: 4, question: "Do you deliver internationally?", answer: "Currently we deliver only within India. International shipping is on our roadmap and will be announced soon.", status: "Active", createdAt: "18 Nov, 2025", order: 2 },
    { id: 403, categoryId: 4, question: "What shipping partners do you use?", answer: "We work with Bluedart, Delhivery, Ekart, DTDC and India Post to ensure reliable and timely delivery across all serviceable pin codes.", status: "Active", createdAt: "18 Nov, 2025", order: 3 },
    { id: 404, categoryId: 4, question: "My order is delayed. What should I do?", answer: "First check the tracking page for latest updates. If the status hasn't changed in 48 hours, contact our support team with your Order ID and we will investigate immediately.", status: "Active", createdAt: "18 Nov, 2025", order: 4 },
    { id: 405, categoryId: 4, question: "Can I schedule a delivery time slot?", answer: "Yes! For select pin codes we offer preferred time slot delivery. You can choose your slot at checkout or from the order tracking page before dispatch.", status: "Active", createdAt: "18 Nov, 2025", order: 5 },

    // Payments & Wallet (cat 5)
    { id: 501, categoryId: 5, question: "What payment methods are accepted?", answer: "We accept UPI (GPay, PhonePe, Paytm, BHIM), debit/credit cards (Visa, Mastercard, Rupay, Amex), Net Banking, EMI, and Flint & Thread Wallet.", status: "Active", createdAt: "18 Nov, 2025", order: 1 },
    { id: 502, categoryId: 5, question: "Is Cash on Delivery available?", answer: "Yes, COD is available for orders up to ₹5,000 in eligible pin codes. A ₹25 handling fee applies for COD orders.", status: "Active", createdAt: "18 Nov, 2025", order: 2 },
    { id: 503, categoryId: 5, question: "How does the Flint & Thread Wallet work?", answer: "The Wallet stores your refunds, cashbacks and gift credits. Your wallet balance is automatically applied at checkout — you can also choose to pay the remainder via any other method.", status: "Active", createdAt: "18 Nov, 2025", order: 3 },
    { id: 504, categoryId: 5, question: "My payment failed but amount was deducted. What now?", answer: "Don't worry — failed payment deductions are automatically reversed within 5–7 business days. If not, raise a dispute from Orders → Payment Issue with your transaction reference.", status: "Active", createdAt: "18 Nov, 2025", order: 4 },
    { id: 505, categoryId: 5, question: "Is it safe to save my card details?", answer: "Yes. We are PCI-DSS compliant. Card details are stored as secure tokens with our payment gateway partners and are never accessible to Flint & Thread directly.", status: "Active", createdAt: "18 Nov, 2025", order: 5 },

    // Returns & Refunds (cat 6)
    { id: 601, categoryId: 6, question: "What is the return policy?", answer: "Most items can be returned within 7 days of delivery. The item must be unused, unwashed, with original tags and packaging intact. Some categories like innerwear and customised products are non-returnable.", status: "Active", createdAt: "18 Nov, 2025", order: 1 },
    { id: 602, categoryId: 6, question: "How do I initiate a return?", answer: "Go to Orders → Select order → Return Item → Choose reason → Schedule pickup. Our logistics partner will collect the item from your doorstep within 2–3 business days.", status: "Active", createdAt: "18 Nov, 2025", order: 2 },
    { id: 603, categoryId: 6, question: "How long does a refund take?", answer: "Once the returned item is quality-checked (1–2 days after pickup), the refund is processed within 5–7 business days to the original payment method or instantly to your Flint & Thread Wallet.", status: "Active", createdAt: "18 Nov, 2025", order: 3 },
    { id: 604, categoryId: 6, question: "Can I exchange instead of returning?", answer: "Yes! Select 'Exchange' during the return flow and choose a different size or colour of the same item. Exchanges are processed faster than returns.", status: "Active", createdAt: "18 Nov, 2025", order: 4 },
    { id: 605, categoryId: 6, question: "What if the return pickup fails?", answer: "If the pickup fails twice, you can drop the item at any of our nearest partner drop-off locations (listed in the app under Returns → Drop-off Points).", status: "Active", createdAt: "18 Nov, 2025", order: 5 },

    // Seller Support (cat 7)
    { id: 701, categoryId: 7, question: "How do I register as a seller?", answer: "Visit the Seller Hub at seller.flintandthread.com, click 'Register', fill in your business details, upload GST certificate and bank details, and submit for verification. Approval takes 2–3 business days.", status: "Active", createdAt: "20 Nov, 2025", order: 1 },
    { id: 702, categoryId: 7, question: "What documents are required for seller onboarding?", answer: "You need: PAN card, GST registration certificate, business bank account details, and a cancelled cheque. For individual sellers, Aadhar card is additionally required.", status: "Active", createdAt: "20 Nov, 2025", order: 2 },
    { id: 703, categoryId: 7, question: "When and how do sellers get paid?", answer: "Seller payouts are processed every 7 days after order delivery confirmation. Payments are transferred directly to your registered bank account via NEFT/IMPS.", status: "Active", createdAt: "20 Nov, 2025", order: 3 },
    { id: 704, categoryId: 7, question: "What commission does Flint & Thread charge?", answer: "Commission ranges from 8%–18% depending on the product category. Full commission details are available in the Seller Hub under Pricing & Commission.", status: "Active", createdAt: "20 Nov, 2025", order: 4 },
    { id: 705, categoryId: 7, question: "How do I list a new product?", answer: "In the Seller Hub, go to Products → Add New Product, fill in product details, upload images (minimum 3, white background recommended), set pricing, and publish.", status: "Inactive", createdAt: "20 Nov, 2025", order: 5 },

    // Technical Issues (cat 8)
    { id: 801, categoryId: 8, question: "The app is crashing. What should I do?", answer: "Try these steps: 1) Force close and reopen the app, 2) Clear app cache (Settings → Apps → Flint & Thread → Clear Cache), 3) Update to the latest version, 4) Uninstall and reinstall. If the issue persists, contact support with your device model.", status: "Active", createdAt: "22 Nov, 2025", order: 1 },
    { id: 802, categoryId: 8, question: "I am not receiving OTPs. What do I do?", answer: "Check if your mobile number is correct. Ensure you have network coverage. Check if SMS is blocked by your carrier. Try 'Resend OTP' after 60 seconds. If the problem continues, use email OTP or contact support.", status: "Active", createdAt: "22 Nov, 2025", order: 2 },
    { id: 803, categoryId: 8, question: "Images are not loading in the app.", answer: "This is usually a network issue. Check your internet connection, toggle Wi-Fi off and on, or switch to mobile data. Clearing the image cache from app settings can also help.", status: "Active", createdAt: "22 Nov, 2025", order: 3 },
    { id: 804, categoryId: 8, question: "The website is not loading. Is there an outage?", answer: "Check our status page at status.flintandthread.com for real-time system status. You can also check our social media handles for announcements during outages.", status: "Active", createdAt: "22 Nov, 2025", order: 4 },
    { id: 805, categoryId: 8, question: "How do I report a bug or technical issue?", answer: "Go to Profile → Help → Report a Bug. Fill in the issue description, attach screenshots if possible, and submit. Our tech team reviews all reports within 24 hours.", status: "Active", createdAt: "22 Nov, 2025", order: 5 },
    { id: 806, categoryId: 8, question: "The payment page is showing an error.", answer: "Try refreshing the page, clearing browser cookies (on web), or switching to a different payment method. If the issue persists, use a different browser or the mobile app.", status: "Inactive", createdAt: "22 Nov, 2025", order: 6 },
];

// ─── VIEW QUESTION MODAL ─────────────────────────────────────────────────────
const ViewModal: React.FC<{
    visible: boolean;
    question: FaqQuestion | null;
    category: FaqCategory | undefined;
    onClose: () => void;
    isWeb: boolean;
}> = ({ visible, question, category, onClose, isWeb }) => {
    if (!visible || !question) return null;
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && mSt.sheetWeb]}>
                    <View style={[mSt.headerBar, { borderBottomColor: category?.color ?? PRIMARY }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.iconSmall, { backgroundColor: (category?.color ?? PRIMARY) + "20" }]}>
                                <Feather name={(category?.icon ?? "help-circle") as any} size={16} color={category?.color ?? PRIMARY} />
                            </View>
                            <View>
                                <Text style={mSt.sheetTitle}>View Question</Text>
                                <Text style={mSt.sheetSub}>{category?.name}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 22 }}>
                        <View style={[mSt.qBox, { borderLeftColor: category?.color ?? PRIMARY }]}>
                            <Text style={mSt.qLabel}>QUESTION</Text>
                            <Text style={mSt.qText}>{question.question}</Text>
                        </View>
                        <View style={mSt.aBox}>
                            <Text style={mSt.qLabel}>ANSWER</Text>
                            <Text style={mSt.aText}>{question.answer}</Text>
                        </View>
                        <View style={mSt.metaGrid}>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>Status</Text>
                                <View style={[mSt.badge, { backgroundColor: question.status === "Active" ? ACCENT_TEAL + "20" : ACCENT_RED + "20" }]}>
                                    <View style={[mSt.dot, { backgroundColor: question.status === "Active" ? ACCENT_TEAL : ACCENT_RED }]} />
                                    <Text style={[mSt.badgeText, { color: question.status === "Active" ? ACCENT_TEAL : ACCENT_RED }]}>{question.status}</Text>
                                </View>
                            </View>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>Created</Text>
                                <Text style={mSt.metaVal}>{question.createdAt}</Text>
                            </View>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>For Seller</Text>
                                <Text style={mSt.metaVal}>{question.isForSeller ? "Yes" : "No"}</Text>
                            </View>
                            <View style={mSt.metaItem}>
                                <Text style={mSt.metaKey}>Order #</Text>
                                <Text style={mSt.metaVal}>{question.order}</Text>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.footerCloseBtn} onPress={onClose}>
                            <Text style={mSt.footerCloseTxt}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── ADD / EDIT QUESTION MODAL ────────────────────────────────────────────────
const QuestionModal: React.FC<{
    visible: boolean;
    editing: FaqQuestion | null;
    categoryId: number;
    categories: FaqCategory[];
    onClose: () => void;
    onSave: (q: Partial<FaqQuestion> & { categoryId: number }) => void;
    isWeb: boolean;
}> = ({ visible, editing, categoryId, categories, onClose, onSave, isWeb }) => {
    const [question, setQuestion] = useState(editing?.question ?? "");
    const [answer, setAnswer] = useState(editing?.answer ?? "");
    const [status, setStatus] = useState<"Active" | "Inactive">(editing?.status ?? "Active");
    const [catId, setCatId] = useState(editing?.categoryId ?? categoryId);
    const [isForSeller, setIsForSeller] = useState(editing?.isForSeller ?? false);

    React.useEffect(() => {
        setQuestion(editing?.question ?? "");
        setAnswer(editing?.answer ?? "");
        setStatus(editing?.status ?? "Active");
        setCatId(editing?.categoryId ?? categoryId);
        setIsForSeller(editing?.isForSeller ?? false);
    }, [editing, visible, categoryId]);

    if (!visible) return null;
    const cat = categories.find(c => c.id === catId);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && mSt.sheetWeb]}>
                    <View style={[mSt.headerBar, { borderBottomColor: cat?.color ?? PRIMARY }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.headerDot, { backgroundColor: cat?.color ?? PRIMARY }]} />
                            <Text style={mSt.sheetTitle}>{editing ? "Edit Question" : "Add New Question"}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 22 }}>
                        <Text style={mSt.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {categories.map(c => (
                                    <TouchableOpacity key={c.id}
                                        style={[mSt.catChip, catId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                                        onPress={() => setCatId(c.id)}>
                                        <Feather name={c.icon as any} size={11} color={catId === c.id ? "#fff" : c.color} />
                                        <Text style={[mSt.catChipText, catId === c.id && { color: "#fff" }]}>{c.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Text style={mSt.label}>Question</Text>
                        <TextInput style={[mSt.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                            value={question} onChangeText={setQuestion}
                            placeholder="Enter the FAQ question..." placeholderTextColor={TEXT_MUTED} multiline />

                        <Text style={mSt.label}>Answer</Text>
                        <TextInput style={[mSt.input, { height: 120, textAlignVertical: "top", paddingTop: 12 }]}
                            value={answer} onChangeText={setAnswer}
                            placeholder="Enter the detailed answer..." placeholderTextColor={TEXT_MUTED} multiline />

                        <Text style={mSt.label}>Status</Text>
                        <View style={mSt.statusToggle}>
                            {(["Active", "Inactive"] as const).map(s => (
                                <TouchableOpacity key={s}
                                    style={[mSt.statusOption, status === s && {
                                        backgroundColor: s === "Active" ? ACCENT_TEAL : ACCENT_RED,
                                        borderColor: s === "Active" ? ACCENT_TEAL : ACCENT_RED,
                                    }]}
                                    onPress={() => setStatus(s)}>
                                    <Text style={[mSt.statusOptionTxt, status === s && { color: "#fff" }]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={mSt.label}>For Seller?</Text>
                        <View style={mSt.statusToggle}>
                            {(["On", "Off"] as const).map(s => {
                                const isSelected = (s === "On") === isForSeller;
                                return (
                                    <TouchableOpacity key={s}
                                        style={[mSt.statusOption, isSelected && {
                                            backgroundColor: s === "On" ? ACCENT_TEAL : TEXT_MUTED,
                                            borderColor: s === "On" ? ACCENT_TEAL : TEXT_MUTED,
                                        }]}
                                        onPress={() => setIsForSeller(s === "On")}>
                                        <Text style={[mSt.statusOptionTxt, isSelected && { color: "#fff" }]}>{s}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.cancelBtn} onPress={onClose}>
                            <Text style={mSt.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[mSt.saveBtn, { backgroundColor: cat?.color ?? PRIMARY }]}
                            onPress={() => { onSave({ question, answer, status, categoryId: catId, isForSeller }); onClose(); }}>
                            <Feather name={editing ? "check" : "plus"} size={14} color="#fff" />
                            <Text style={mSt.saveTxt}>{editing ? "Save Changes" : "Add Question"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────
const DeleteModal: React.FC<{
    visible: boolean;
    question: FaqQuestion | null;
    onClose: () => void;
    onConfirm: () => void;
    isWeb: boolean;
}> = ({ visible, question, onClose, onConfirm, isWeb }) => {
    if (!visible || !question) return null;
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mSt.overlay}>
                <View style={[mSt.sheet, isWeb && { width: 400 }, { maxHeight: 300 }]}>
                    <View style={[mSt.headerBar, { borderBottomColor: ACCENT_RED }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[mSt.headerDot, { backgroundColor: ACCENT_RED }]} />
                            <Text style={[mSt.sheetTitle, { color: ACCENT_RED }]}>Delete Question</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mSt.closeBtn}>
                            <Feather name="x" size={16} color={TEXT_BODY} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ padding: 22, flex: 1 }}>
                        <Text style={[TEXT_BODY && { color: TEXT_BODY }, { fontSize: 14, lineHeight: 22 }]}>
                            Are you sure you want to delete this question?{"\n\n"}
                            <Text style={{ fontWeight: "700", color: TEXT_HEAD }}>"{question.question}"</Text>
                            {"\n\n"}This action cannot be undone.
                        </Text>
                    </View>
                    <View style={mSt.footer}>
                        <TouchableOpacity style={mSt.cancelBtn} onPress={onClose}>
                            <Text style={mSt.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[mSt.saveBtn, { backgroundColor: ACCENT_RED }]} onPress={onConfirm}>
                            <Feather name="trash-2" size={14} color="#fff" />
                            <Text style={mSt.saveTxt}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── QUESTION TABLE ROW ──────────────────────────────────────────────────────
const QuestionRow: React.FC<{
    q: FaqQuestion;
    cat: FaqCategory | undefined;
    index: number;
    onToggleSeller: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ q, cat, index, onToggleSeller, onView, onEdit, onDelete }) => {
    const isActive = q.status === "Active";
    const accentColor = cat?.color ?? PRIMARY;
    return (
        <View style={[qSt.row, index % 2 === 0 && qSt.rowAlt]}>
            {/* ID */}
            <View style={qSt.cellId}>
                <Text style={qSt.idText}>{q.id}</Text>
            </View>
            {/* Category */}
            <View style={qSt.cellCat}>
                <Text style={[qSt.catText, { color: accentColor }]} numberOfLines={2}>{cat?.name ?? "—"}</Text>
            </View>
            {/* Question */}
            <View style={qSt.cellQuestion}>
                <Text style={qSt.questionText} numberOfLines={2}>{q.question}</Text>
            </View>
            {/* Sort Order */}
            <View style={qSt.cellOrder}>
                <Text style={qSt.orderText}>{q.order}</Text>
            </View>
            {/* Status */}
            <View style={qSt.cellStatus}>
                <View style={[qSt.statusBadge, { backgroundColor: isActive ? "#e6faf5" : "#fde8e8", borderColor: isActive ? ACCENT_TEAL : ACCENT_RED }]}>
                    <Text style={[qSt.statusBadgeTxt, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>{q.status}</Text>
                </View>
            </View>
            {/* Seller Toggle */}
            <View style={qSt.cellSeller}>
                <TouchableOpacity
                    style={[qSt.toggle, q.isForSeller && { backgroundColor: ACCENT_TEAL }]}
                    onPress={onToggleSeller}
                    activeOpacity={0.8}>
                    <View style={[qSt.toggleThumb, q.isForSeller && qSt.toggleThumbOn]} />
                </TouchableOpacity>
            </View>
            {/* Created Date */}
            <View style={qSt.cellDate}>
                <Text style={qSt.dateText}>{q.createdAt}</Text>
            </View>
            {/* Actions */}
            <View style={qSt.cellAction}>
                <TouchableOpacity style={[qSt.actionBtn, { backgroundColor: "#1e293b" }]} onPress={onView}>
                    <Feather name="eye" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[qSt.actionBtn, { backgroundColor: "#1e293b" }]} onPress={onEdit}>
                    <Feather name="edit-2" size={13} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[qSt.actionBtn, { backgroundColor: ACCENT_RED }]} onPress={onDelete}>
                    <Feather name="trash-2" size={13} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── QUESTION GRID CARD ──────────────────────────────────────────────────────
const QuestionGridCard: React.FC<{
    q: FaqQuestion;
    cat: FaqCategory | undefined;
    index: number;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ q, cat, index, onView, onEdit, onDelete }) => {
    const isActive = q.status === "Active";
    const accentColor = cat?.color ?? PRIMARY;
    return (
        <View style={[gSt.card, { borderTopColor: accentColor }]}>
            <View style={gSt.cardHeader}>
                <View style={[gSt.indexBadge, { backgroundColor: accentColor + "18" }]}>
                    <Text style={[gSt.indexText, { color: accentColor }]}>Q{index}</Text>
                </View>
                <View style={[gSt.statusPill, { backgroundColor: isActive ? ACCENT_TEAL + "18" : ACCENT_RED + "18" }]}>
                    <View style={[gSt.statusDot, { backgroundColor: isActive ? ACCENT_TEAL : ACCENT_RED }]} />
                    <Text style={[gSt.statusTxt, { color: isActive ? ACCENT_TEAL : ACCENT_RED }]}>{q.status}</Text>
                </View>
            </View>
            <Text style={gSt.questionText} numberOfLines={3}>{q.question}</Text>
            <Text style={gSt.answerText} numberOfLines={2}>{q.answer}</Text>
            {q.isForSeller && (
                <View style={gSt.sellerBadge}>
                    <Feather name="briefcase" size={10} color={PRIMARY} />
                    <Text style={gSt.sellerBadgeTxt}>Seller</Text>
                </View>
            )}
            <View style={gSt.divider} />
            <View style={gSt.cardFooter}>
                <Text style={gSt.dateText}>{q.createdAt}</Text>
                <View style={gSt.actions}>
                    <TouchableOpacity style={[gSt.actionBtn, { backgroundColor: ACCENT_SKY + "15", borderColor: ACCENT_SKY + "40" }]} onPress={onView}>
                        <Feather name="eye" size={13} color={ACCENT_SKY} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[gSt.actionBtn, { backgroundColor: PRIMARY + "15", borderColor: PRIMARY + "40" }]} onPress={onEdit}>
                        <Feather name="edit-2" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[gSt.actionBtn, { backgroundColor: ACCENT_RED + "15", borderColor: ACCENT_RED + "40" }]} onPress={onDelete}>
                        <Feather name="trash-2" size={13} color={ACCENT_RED} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const FaqQuestionsScreen: React.FC = () => {
    const isWeb = Platform.OS === "web";

    const [questions, setQuestions] = useState<FaqQuestion[]>(initialQuestions);
    const [selectedCatId, setSelectedCatId] = useState<number>(1);
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

    const [viewModal, setViewModal] = useState<FaqQuestion | null>(null);
    const [editModal, setEditModal] = useState<FaqQuestion | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<FaqQuestion | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const selectedCat = CATEGORIES.find(c => c.id === selectedCatId);

    const filtered = questions.filter(q => {
        const inCat = q.categoryId === selectedCatId;
        const inSearch = q.question.toLowerCase().includes(search.toLowerCase()) ||
            q.answer.toLowerCase().includes(search.toLowerCase());
        const inStatus = statusFilter === "All" || q.status === statusFilter;
        return inCat && inSearch && inStatus;
    });

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = (data: Partial<FaqQuestion> & { categoryId: number }) => {
        if (editModal) {
            setQuestions(prev => prev.map(q => q.id === editModal.id ? { ...q, ...data } : q));
        } else {
            const newQ: FaqQuestion = {
                id: Date.now(),
                categoryId: data.categoryId,
                question: data.question ?? "",
                answer: data.answer ?? "",
                status: data.status ?? "Active",
                createdAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                order: questions.filter(q => q.categoryId === data.categoryId).length + 1,
                isForSeller: data.isForSeller ?? false,
            };
            setQuestions(prev => [newQ, ...prev]);
        }
        setEditModal(null);
    };

    const handleDelete = () => {
        if (deleteModal) {
            setQuestions(prev => prev.filter(q => q.id !== deleteModal.id));
            setDeleteModal(null);
        }
    };

    // Stats for selected category
    const catQuestions = questions.filter(q => q.categoryId === selectedCatId);
    const activeCount = catQuestions.filter(q => q.status === "Active").length;

    return (
        <AdminLayout>
            <View style={st.root}>
                <StatusBar barStyle="dark-content" backgroundColor={BG_PAGE} />

                {/* ── PAGE HEADER ── */}
                <View style={[st.header, isWeb && st.headerWeb]}>
                    <View style={st.headerLeft}>
                        <View style={[st.headerIcon, { backgroundColor: selectedCat?.color ?? PRIMARY }]}>
                            <Feather name="help-circle" size={22} color="#fff" />
                        </View>
                        <View>
                            <Text style={st.headerTitle}>FAQ Questions</Text>
                            <Text style={st.headerBreadcrumb}>
                                <Text style={{ color: PRIMARY }}>Dashboard</Text>{"  ›  FAQ Questions"}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={[st.addBtn, { backgroundColor: selectedCat?.color ?? PRIMARY }]}
                        onPress={() => { setEditModal(null); setAddModal(true); }}>
                        <Feather name="plus" size={14} color="#fff" />
                        <Text style={st.addBtnText}>Add Question</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={st.scroll}
                    contentContainerStyle={[st.scrollContent, !isWeb && { paddingBottom: 120 }]}
                    showsVerticalScrollIndicator={false}>

                    {/* ── CATEGORY TABS (pill buttons) ── */}
                    <View style={st.catSection}>
                        <Text style={st.sectionLabel}>SELECT CATEGORY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={st.catScrollContent}>
                            {CATEGORIES.map(cat => {
                                const catQCount = questions.filter(q => q.categoryId === cat.id).length;
                                const isSelected = cat.id === selectedCatId;
                                return (
                                    <TouchableOpacity key={cat.id}
                                        style={[st.catBtn,
                                        { borderColor: cat.color },
                                        isSelected && { backgroundColor: cat.color }]}
                                        onPress={() => { setSelectedCatId(cat.id); setSearch(""); setStatusFilter("All"); setExpandedIds(new Set()); }}>
                                        <View style={[st.catBtnIcon, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : cat.color + "18" }]}>
                                            <Feather name={cat.icon as any} size={14} color={isSelected ? "#fff" : cat.color} />
                                        </View>
                                        <Text style={[st.catBtnText, isSelected && { color: "#fff" }]} numberOfLines={1}>{cat.name}</Text>
                                        <View style={[st.catBtnCount, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : cat.color + "20" }]}>
                                            <Text style={[st.catBtnCountText, { color: isSelected ? "#fff" : cat.color }]}>{catQCount}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* ── SELECTED CATEGORY HERO ── */}
                    <View style={[st.heroCard, { borderLeftColor: selectedCat?.color ?? PRIMARY }]}>
                        <View style={st.heroLeft}>
                            <View style={[st.heroIcon, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "18" }]}>
                                <Feather name={(selectedCat?.icon ?? "help-circle") as any} size={28} color={selectedCat?.color ?? PRIMARY} />
                            </View>
                            <View>
                                <Text style={st.heroTitle}>{selectedCat?.name}</Text>
                                <Text style={st.heroSub}>{catQuestions.length} questions  ·  {activeCount} active</Text>
                            </View>
                        </View>
                        <View style={[st.heroBadge, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "18" }]}>
                            <Text style={[st.heroBadgeText, { color: selectedCat?.color ?? PRIMARY }]}>{catQuestions.length} FAQs</Text>
                        </View>
                    </View>

                    {/* ── SEARCH + FILTER TOOLBAR ── */}
                    <View style={[st.toolbar, !isWeb && { flexWrap: "wrap" as any }]}>
                        <View style={[st.searchWrap, !isWeb && { minWidth: "100%" as any }]}>
                            <Feather name="search" size={14} color={selectedCat?.color ?? PRIMARY} />
                            <TextInput style={st.searchInput}
                                placeholder="Search questions..."
                                placeholderTextColor={TEXT_MUTED}
                                value={search}
                                onChangeText={setSearch} />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch("")}>
                                    <Feather name="x-circle" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={st.chips}>
                            {(["All", "Active", "Inactive"] as const).map(f => (
                                <TouchableOpacity key={f}
                                    style={[st.chip,
                                    statusFilter === f && { backgroundColor: selectedCat?.color ?? PRIMARY, borderColor: selectedCat?.color ?? PRIMARY }]}
                                    onPress={() => setStatusFilter(f)}>
                                    <Text style={[st.chipText, statusFilter === f && { color: "#fff" }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={st.expandAllBtn}
                            onPress={() => {
                                if (expandedIds.size === filtered.length) setExpandedIds(new Set());
                                else setExpandedIds(new Set(filtered.map(q => q.id)));
                            }}>
                            <Feather name={expandedIds.size === filtered.length ? "minimize-2" : "maximize-2"} size={13} color={TEXT_BODY} />
                            <Text style={st.expandAllTxt}>{expandedIds.size === filtered.length ? "Collapse" : "Expand"} All</Text>
                        </TouchableOpacity>

                        {/* View mode toggle */}
                        <View style={st.viewToggle}>
                            <TouchableOpacity
                                style={[st.viewToggleBtn, viewMode === "list" && st.viewToggleBtnActive]}
                                onPress={() => setViewMode("list")}>
                                <Feather name="list" size={15} color={viewMode === "list" ? "#fff" : TEXT_BODY} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.viewToggleBtn, viewMode === "grid" && st.viewToggleBtnActive]}
                                onPress={() => setViewMode("grid")}>
                                <Feather name="grid" size={15} color={viewMode === "grid" ? "#fff" : TEXT_BODY} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── RESULT COUNT ── */}
                    <Text style={st.resultCount}>
                        Showing <Text style={{ color: selectedCat?.color ?? PRIMARY, fontWeight: "700" }}>{filtered.length}</Text> questions
                    </Text>

                    {/* ── QUESTIONS LIST / GRID ── */}
                    {filtered.length === 0 ? (
                        <View style={st.empty}>
                            <View style={[st.emptyIconWrap, { backgroundColor: (selectedCat?.color ?? PRIMARY) + "15" }]}>
                                <Feather name="inbox" size={36} color={selectedCat?.color ?? TEXT_MUTED} />
                            </View>
                            <Text style={st.emptyTitle}>No questions found</Text>
                            <Text style={st.emptySubtitle}>Try adjusting your search or add a new question</Text>
                            <TouchableOpacity style={[st.emptyAddBtn, { backgroundColor: selectedCat?.color ?? PRIMARY }]}
                                onPress={() => { setEditModal(null); setAddModal(true); }}>
                                <Feather name="plus" size={14} color="#fff" />
                                <Text style={st.emptyAddTxt}>Add Question</Text>
                            </TouchableOpacity>
                        </View>
                    ) : viewMode === "grid" ? (
                        <View style={st.gridContainer}>
                            {filtered.map((q, idx) => (
                                <View key={q.id} style={[st.gridItem, !isWeb && { width: "100%" as any }]}>
                                    <QuestionGridCard
                                        q={q}
                                        cat={selectedCat}
                                        index={idx + 1}
                                        onView={() => setViewModal(q)}
                                        onEdit={() => { setEditModal(q); setAddModal(true); }}
                                        onDelete={() => setDeleteModal(q)}
                                    />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={st.tableWrap}>
                            {isWeb ? (
                                <View style={{ width: "100%" }}>
                                    {/* Table header */}
                                    <View style={qSt.headerRow}>
                                        <Text style={[qSt.headerCell, { width: 60 }]}>ID</Text>
                                        <Text style={[qSt.headerCell, { width: 200 }]}>Category</Text>
                                        <Text style={[qSt.headerCell, { flex: 1 }]}>Question</Text>
                                        <Text style={[qSt.headerCell, { width: 80 }]}>Sort Order</Text>
                                        <Text style={[qSt.headerCell, { width: 100 }]}>Status</Text>
                                        <Text style={[qSt.headerCell, { width: 70 }]}>Seller</Text>
                                        <Text style={[qSt.headerCell, { width: 110 }]}>Created Date</Text>
                                        <Text style={[qSt.headerCell, { width: 110 }]}>Action</Text>
                                    </View>
                                    {filtered.map((q, idx) => (
                                        <QuestionRow
                                            key={q.id}
                                            q={q}
                                            cat={selectedCat}
                                            index={idx}
                                            onToggleSeller={() => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, isForSeller: !x.isForSeller } : x))}
                                            onView={() => setViewModal(q)}
                                            onEdit={() => { setEditModal(q); setAddModal(true); }}
                                            onDelete={() => setDeleteModal(q)}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ minWidth: 900 }}>
                                        {/* Table header */}
                                        <View style={qSt.headerRow}>
                                            <Text style={[qSt.headerCell, { width: 60 }]}>ID</Text>
                                            <Text style={[qSt.headerCell, { width: 200 }]}>Category</Text>
                                            <Text style={[qSt.headerCell, { flex: 1 }]}>Question</Text>
                                            <Text style={[qSt.headerCell, { width: 80 }]}>Sort Order</Text>
                                            <Text style={[qSt.headerCell, { width: 100 }]}>Status</Text>
                                            <Text style={[qSt.headerCell, { width: 70 }]}>Seller</Text>
                                            <Text style={[qSt.headerCell, { width: 110 }]}>Created Date</Text>
                                            <Text style={[qSt.headerCell, { width: 110 }]}>Action</Text>
                                        </View>
                                        {filtered.map((q, idx) => (
                                            <QuestionRow
                                                key={q.id}
                                                q={q}
                                                cat={selectedCat}
                                                index={idx}
                                                onToggleSeller={() => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, isForSeller: !x.isForSeller } : x))}
                                                onView={() => setViewModal(q)}
                                                onEdit={() => { setEditModal(q); setAddModal(true); }}
                                                onDelete={() => setDeleteModal(q)}
                                            />
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* ── MODALS ── */}
                <ViewModal
                    visible={!!viewModal}
                    question={viewModal}
                    category={CATEGORIES.find(c => c.id === viewModal?.categoryId)}
                    onClose={() => setViewModal(null)}
                    isWeb={isWeb}
                />
                <QuestionModal
                    visible={addModal}
                    editing={editModal}
                    categoryId={selectedCatId}
                    categories={CATEGORIES}
                    onClose={() => { setAddModal(false); setEditModal(null); }}
                    onSave={handleSave}
                    isWeb={isWeb}
                />
                <DeleteModal
                    visible={!!deleteModal}
                    question={deleteModal}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={handleDelete}
                    isWeb={isWeb}
                />
            </View>
        </AdminLayout>
    );
};

export default FaqQuestionsScreen;

// ─── MAIN STYLES ─────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    root: { flex: 1, height: "100%", backgroundColor: BG_PAGE },

    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: BG_CARD, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
    headerWeb: { paddingHorizontal: 28, paddingVertical: 20 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    headerIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.3 },
    headerBreadcrumb: { fontSize: 12, color: TEXT_BODY, marginTop: 2 },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 14 },

    // Category tabs
    catSection: { backgroundColor: BG_CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.8, marginBottom: 12 },
    catScrollContent: { gap: 8, paddingRight: 4 },
    catBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24, borderWidth: 1.5, backgroundColor: BG_PAGE, maxWidth: 220 },
    catBtnIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    catBtnText: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD, flexShrink: 1 },
    catBtnCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    catBtnCountText: { fontSize: 11, fontWeight: "800" },

    // Hero card
    heroCard: { backgroundColor: BG_CARD, borderRadius: 14, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BORDER, borderLeftWidth: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    heroLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    heroTitle: { fontSize: 17, fontWeight: "800", color: TEXT_HEAD, marginBottom: 4 },
    heroSub: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },
    heroBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    heroBadgeText: { fontSize: 13, fontWeight: "800" },

    // Toolbar
    toolbar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG_CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
    searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: BG_PAGE },
    searchInput: { flex: 1, fontSize: 13, color: TEXT_HEAD, outlineStyle: "none" } as any,
    chips: { flexDirection: "row", gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_PAGE },
    chipText: { fontSize: 12, fontWeight: "600", color: TEXT_BODY },
    expandAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG_PAGE },
    expandAllTxt: { fontSize: 12, fontWeight: "600", color: TEXT_BODY },

    resultCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },

    // Questions list
    questionsList: { gap: 10 },
    tableWrap: { backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },

    // Grid container
    gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    gridItem: { width: "48%" as any, minWidth: 260 },

    // View toggle
    viewToggle: { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
    viewToggleBtn: { padding: 8, backgroundColor: BG_PAGE },
    viewToggleBtnActive: { backgroundColor: PRIMARY },

    // Empty
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT_HEAD },
    emptySubtitle: { fontSize: 13, color: TEXT_MUTED },
    emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, marginTop: 4 },
    emptyAddTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

// ─── QUESTION GRID CARD STYLES ───────────────────────────────────────────────
const gSt = StyleSheet.create({
    card: { backgroundColor: BG_CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderTopWidth: 3, padding: 14, flex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 8 },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    indexBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    indexText: { fontSize: 11, fontWeight: "800" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusTxt: { fontSize: 11, fontWeight: "700" },
    questionText: { fontSize: 13, fontWeight: "700", color: TEXT_HEAD, lineHeight: 18 },
    answerText: { fontSize: 12, color: TEXT_BODY, lineHeight: 17 },
    sellerBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: PRIMARY + "18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" as any },
    sellerBadgeTxt: { fontSize: 11, fontWeight: "700", color: PRIMARY },
    divider: { height: 1, backgroundColor: BORDER },
    cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dateText: { fontSize: 11, color: TEXT_MUTED },
    actions: { flexDirection: "row", gap: 6 },
    actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

// ─── QUESTION ROW STYLES ──────────────────────────────────────────────────────
const qSt = StyleSheet.create({
    // Table header
    headerRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3e7", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    headerCell: { fontSize: 11, fontWeight: "800", color: TEXT_BODY, textTransform: "uppercase", letterSpacing: 0.4 },

    // Table rows
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    rowAlt: { backgroundColor: "#fafbfc" },

    // Cells
    cellId: { width: 60, paddingRight: 24 },
    cellCat: { width: 200, paddingRight: 24 },
    cellQuestion: { flex: 1, paddingRight: 28 },
    cellOrder: { width: 80, alignItems: "center", paddingRight: 24 },
    cellStatus: { width: 100, paddingRight: 24 },
    cellSeller: { width: 70, alignItems: "center", paddingRight: 24 },
    cellDate: { width: 110, paddingRight: 24 },
    cellAction: { width: 110, flexDirection: "row", gap: 6 },

    // Cell text
    idText: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED },
    catText: { fontSize: 13, fontWeight: "700" },
    questionText: { fontSize: 13, color: TEXT_BODY, lineHeight: 18 },
    orderText: { fontSize: 13, color: TEXT_HEAD, fontWeight: "600" },
    dateText: { fontSize: 12, color: TEXT_MUTED },

    // Status badge
    statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" as any },
    statusBadgeTxt: { fontSize: 12, fontWeight: "700" },

    // Seller toggle
    toggle: { width: 38, height: 22, borderRadius: 11, backgroundColor: "#cbd5e1", justifyContent: "center", paddingHorizontal: 2 },
    toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
    toggleThumbOn: { alignSelf: "flex-end" as any },

    // Action buttons
    actionBtn: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
});

// ─── MODAL STYLES ────────────────────────────────────────────────────────────
const mSt = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
    sheet: { backgroundColor: BG_CARD, borderRadius: 20, overflow: "hidden", width: "92%", maxWidth: 520, maxHeight: "90%" as any, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    sheetWeb: { width: 540 },
    headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 2, borderBottomColor: BORDER },
    iconSmall: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    headerDot: { width: 10, height: 10, borderRadius: 5 },
    sheetTitle: { fontSize: 16, fontWeight: "800", color: TEXT_HEAD },
    sheetSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: BG_PAGE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },

    qBox: { borderLeftWidth: 4, backgroundColor: BG_PAGE, borderRadius: 10, padding: 14, marginBottom: 16 },
    qLabel: { fontSize: 10, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.6, marginBottom: 8 },
    qText: { fontSize: 15, fontWeight: "700", color: TEXT_HEAD, lineHeight: 22 },
    aBox: { backgroundColor: BG_PAGE, borderRadius: 10, padding: 14, marginBottom: 16 },
    aText: { fontSize: 13, color: TEXT_BODY, lineHeight: 21 },
    metaGrid: { flexDirection: "row", gap: 16 },
    metaItem: { gap: 6 },
    metaKey: { fontSize: 10, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 0.5 },
    metaVal: { fontSize: 13, fontWeight: "600", color: TEXT_HEAD },
    badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: "700" },

    label: { fontSize: 11, fontWeight: "700", color: TEXT_BODY, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
    input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: TEXT_HEAD, backgroundColor: BG_PAGE, marginBottom: 18 },
    catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_PAGE },
    catChipText: { fontSize: 12, fontWeight: "600", color: TEXT_BODY },
    statusToggle: { flexDirection: "row", gap: 10, marginBottom: 18 },
    statusOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: "center" },
    statusOptionTxt: { fontSize: 13, fontWeight: "700", color: TEXT_BODY },

    footer: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 18, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG_PAGE },
    footerCloseBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_CARD, alignItems: "center" },
    footerCloseTxt: { color: TEXT_BODY, fontWeight: "700", fontSize: 13 },
    cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG_CARD },
    cancelTxt: { color: TEXT_BODY, fontWeight: "700", fontSize: 13 },
    saveBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
    saveTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});