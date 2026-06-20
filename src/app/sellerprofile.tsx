/**
 * sellerprofile.tsx
 * Seller Profile screen – React Native (Web-first).
 * Bootstrap Icons loaded via CDN <link> on web; falls back to text on native.
 * Responsive: desktop (≥768px) two-column grid | mobile single-column cards.
 */

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

// ── Bootstrap Icons CDN injection (web only) ──────────────────────────────────
if (Platform.OS === 'web') {
    if (!document.getElementById('bi-cdn')) {
        const link = document.createElement('link');
        link.id = 'bi-cdn';
        link.rel = 'stylesheet';
        link.href =
            'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
        document.head.appendChild(link);
    }
}

// ── Icon helper ───────────────────────────────────────────────────────────────
// On web renders a real <i class="bi bi-*"> element; on native falls back to text.
interface BIProps {
    name: string;       // Bootstrap Icon name e.g. "person-circle"
    size?: number;
    color?: string;
    style?: object;
}
const BI = ({ name, size = 16, color = '#718096', style = {} }: BIProps) => {
    if (Platform.OS === 'web') {
        // @ts-ignore – React Native Web passes className through
        return (
            <i
                className={`bi bi-${name}`}
                style={{ fontSize: size, color, lineHeight: 1, ...style } as React.CSSProperties}
            />
        );
    }
    // Fallback for native (install @expo/vector-icons or similar separately)
    return <Text style={{ fontSize: size, color }}>{name}</Text>;
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProfileData {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    status: string;
    memberSince: string;
    profilePicture: string | null;
}
interface BusinessData {
    businessName: string;
    businessType: string;
    gstNumber: string;
    panNumber: string;
    aadhaarNumber: string;
    walletBalance: string;
}
interface AddressData {
    address: string;
    city: string;
    state: string;
    pincode: string;
    roadStreetNumber: string;
    landmark: string;
    country: string;
}
interface WarehouseData {
    address: string;
    area: string;
    city: string;
    state: string;
    country: string;
}
interface BankData {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
    orange: '#E87722',
    orangeLight: '#FFF3E8',
    brown: '#8B4513',
    navy: '#1E2D3D',
    green: '#2E7D32',
    greenLight: '#E8F5E9',
    white: '#FFFFFF',
    surface: '#F7F8FA',
    border: '#E2E8F0',
    text: '#1A202C',
    textMid: '#4A5568',
    textLight: '#718096',
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const INIT_PROFILE: ProfileData = {
    firstName: 'Nagaraja',
    lastName: 'Rao',
    mobile: '+919999342582',
    email: 'tejasfashion1912@gmail.com',
    status: 'Active',
    memberSince: '22 Dec, 2025',
    profilePicture: null,
};
const INIT_BUSINESS: BusinessData = {
    businessName: 'TEJAS FASHION WORLD',
    businessType: 'Sole Proprietorship',
    gstNumber: '09AJOPR3005M1ZR',
    panNumber: 'AJOPR3005M',
    aadhaarNumber: '****1068',
    walletBalance: '₹0.00',
};
const INIT_ADDRESS: AddressData = {
    address:
        '1ST FLOOR Building No./Flat No.: F-2, PLOT NO.70, STREET-3, GYANKHAND-2, INDIRAPURAM, Ghaziabad, Uttar Pradesh, 201014',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201014',
    roadStreetNumber: 'STREET-3, GYANKHAND-2',
    landmark: 'opp. St Thomas School , Shipra sun city',
    country: 'India',
};
const INIT_WAREHOUSE: WarehouseData = {
    address:
        '1ST FLOOR Building No./Flat No.: F-2, PLOT NO.70, STREET-3, GYANKHAND-2, INDIRAPURAM, Ghaziabad, Uttar Pradesh, 201014',
    area: 'Indirapuram(Shipra Sun City)',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    country: 'India',
};
const INIT_BANK: BankData = {
    bankName: 'Indusind Bank',
    accountNumber: '****5012',
    ifscCode: 'INDB0000383',
    accountHolderName: 'TEJAS FASHION WORLD',
};

// ── Image picker ──────────────────────────────────────────────────────────────
const pickImage = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/gif,image/webp';
            input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (!file) return resolve(null);
                if (file.size > 2 * 1024 * 1024) {
                    Alert.alert('File too large', 'Max file size is 2 MB.');
                    return resolve(null);
                }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }
    Alert.alert('Image Picker', 'Integrate expo-image-picker for native builds.');
    return null;
};

// ── Shared primitives ─────────────────────────────────────────────────────────
interface SectionHeaderProps {
    title: string;
    bg: string;
    icon: string;        // Bootstrap Icon name
}
const SectionHeader = ({ title, bg, icon }: SectionHeaderProps) => (
    <View style={[s.sectionHeader, { backgroundColor: bg }]}>
        <BI name={icon} size={17} color="#fff" style={{ marginRight: 8 }} />
        <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
);

const FieldLabel = ({ label }: { label: string }) => (
    <Text style={s.fieldLabel}>{label}</Text>
);
const FieldValue = ({ value }: { value: string }) => (
    <Text style={s.fieldValue}>{value}</Text>
);

// ── Editable field ────────────────────────────────────────────────────────────
interface EFProps { label: string; value: string; onSave: (v: string) => void; }
const EditableField = ({ label, value, onSave }: EFProps) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const multiline = label === 'ADDRESS' || label === 'LANDMARK' || label === 'WAREHOUSE ADDRESS';

    const save = () => { onSave(draft); setEditing(false); };
    const cancel = () => { setDraft(value); setEditing(false); };

    return (
        <View style={s.efWrap}>
            <FieldLabel label={label} />
            {editing ? (
                <>
                    <TextInput
                        style={[s.textInput, multiline && { minHeight: 72 }]}
                        value={draft}
                        onChangeText={setDraft}
                        autoFocus
                        multiline={multiline}
                    />
                    <View style={s.editActions}>
                        <TouchableOpacity style={s.btnSave} onPress={save}>
                            <BI name="check-lg" size={13} color="#fff" style={{ marginRight: 5 }} />
                            <Text style={s.btnSaveText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnCancel} onPress={cancel}>
                            <BI name="x-lg" size={13} color={C.textMid} style={{ marginRight: 5 }} />
                            <Text style={s.btnCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={s.efRow}>
                    <Text style={[s.fieldValue, { flex: 1 }]}>{value}</Text>
                    <TouchableOpacity style={s.editBtn} onPress={() => { setDraft(value); setEditing(true); }}>
                        <BI name="pencil-square" size={13} color={C.textMid} style={{ marginRight: 4 }} />
                        <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

// ── IconRow helper ────────────────────────────────────────────────────────────
const IconRow = ({ icon, value }: { icon: string; value: string }) => (
    <View style={s.iconRow}>
        <BI name={icon} size={15} color={C.orange} style={{ marginRight: 6 }} />
        <Text style={s.fieldValue}>{value}</Text>
    </View>
);

const INIT_STATS = {
    totalProducts: 341,
    totalOrders: 1240,
    totalRevenue: '₹4,58,920.00',
};

const INIT_CATEGORIES = [
    { id: '1', name: 'Sarees', count: 150, icon: 'gender-female', color: '#8B5CF6' },
    { id: '2', name: 'Kurtas & Suits', count: 85, icon: 'briefcase-fill', color: '#3B82F6' },
    { id: '3', name: 'Lehengas', count: 42, icon: 'stars', color: '#EC4899' },
    { id: '4', name: 'Western Wear', count: 64, icon: 'handbag-fill', color: '#10B981' },
];

const CATEGORY_IMAGES: Record<string, string> = {
    'Sarees': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150&h=150&fit=crop',
    'Kurtas & Suits': 'https://images.unsplash.com/photo-1626019912061-041495c0245b?w=150&h=150&fit=crop',
    'Lehengas': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=150&h=150&fit=crop',
    'Western Wear': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&h=150&fit=crop',
};

const getProfileHTML = (
    profile: ProfileData,
    business: BusinessData,
    address: AddressData,
    warehouse: WarehouseData,
    bank: BankData,
    stats: typeof INIT_STATS,
    categories: typeof INIT_CATEGORIES,
    productsByCategory: any
) => {
    const formattedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const sellerName = business.businessName || `${profile.firstName} ${profile.lastName}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Seller Profile - ${sellerName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            color: #1A202C;
            background-color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            padding-bottom: 30px;
        }

        /* Header and Footer */
        header {
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-title {
            font-size: 18px;
            font-weight: 800;
            color: #1d324e;
        }
        
        .header-meta {
            text-align: right;
            color: #718096;
            font-size: 10px;
        }

        .footer {
            position: fixed;
            bottom: -10mm;
            left: 0;
            right: 0;
            height: 10mm;
            border-top: 1px solid #E2E8F0;
            padding-top: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #718096;
            background: #fff;
        }

        .page-number::after {
            counter-increment: page;
            content: "Page " counter(page);
        }

        /* Grid layouts */
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }
        
        /* Card styles */
        .card {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 16px;
            background: #ffffff;
            page-break-inside: avoid;
        }
        
        .card-header {
            color: #ffffff;
            padding: 8px 12px;
            font-weight: 700;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .card-body {
            padding: 12px;
        }
        
        /* Info Fields */
        .field {
            margin-bottom: 8px;
        }
        .field:last-child {
            margin-bottom: 0;
        }
        
        .field-label {
            font-size: 9px;
            font-weight: 700;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        
        .field-value {
            font-size: 11px;
            color: #2D3748;
            font-weight: 500;
        }

        .avatar-row {
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        
        .avatar {
            width: 50px;
            height: 50px;
            border-radius: 25px;
            border: 1.5px solid #E2E8F0;
            object-fit: cover;
        }
        
        .avatar-placeholder {
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background-color: #FFF3E8;
            border: 1.5px solid #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #E87722;
            font-size: 20px;
            font-weight: 700;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            background-color: #E8F5E9;
            color: #2E7D32;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
        }

        .wallet-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 700;
            color: #E87722;
        }

        /* Stats Section */
        .stats-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .stat-card {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 10px;
            background: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stat-icon {
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }
        
        .stat-info {
            display: flex;
            flex-direction: column;
        }
        
        .stat-label {
            font-size: 8px;
            font-weight: 700;
            color: #718096;
            letter-spacing: 0.3px;
        }
        
        .stat-value {
            font-size: 13px;
            font-weight: 800;
            color: #1A202C;
        }

        /* Category Listings */
        .category-item {
            margin-bottom: 10px;
        }
        .category-item:last-child {
            margin-bottom: 0;
        }
        
        .category-header {
            display: flex;
            justify-content: space-between;
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 10px;
        }
        
        .progress-bar-bg {
            height: 5px;
            background-color: #E2E8F0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-bar-fill {
            height: 100%;
            border-radius: 3px;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }
        
        th {
            background-color: #F8FAFC;
            border-bottom: 1.5px solid #E2E8F0;
            padding: 6px 10px;
            font-size: 9px;
            font-weight: 700;
            color: #718096;
            text-align: left;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #E2E8F0;
            font-size: 10px;
            color: #4A5568;
            vertical-align: middle;
        }

        .category-section-tr td {
            background-color: #F8FAFC;
            font-weight: 700;
            font-size: 9px;
            padding: 6px 10px;
            color: #1d324e;
        }
        
        .product-cell {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .product-image {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            object-fit: cover;
            border: 1px solid #E2E8F0;
        }

        .product-image-fallback {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            background-color: #EDF2F7;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #718096;
            border: 1px solid #E2E8F0;
        }
        
        .product-name {
            font-weight: 700;
            color: #1A202C;
            font-size: 10px;
        }
        
        .product-subtitle {
            font-size: 8px;
            color: #718096;
        }

        .size-badge {
            background-color: #F1F5F9;
            border: 1.5px solid #E2E8F0;
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 9px;
            font-weight: 600;
            display: inline-block;
        }

        /* Print adjustments */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                counter-reset: page;
            }
            .card {
                page-break-inside: avoid;
            }
            tr {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <header>
        <div>
            <div class="header-title">Seller Profile Summary</div>
            <div style="font-size: 11px; font-weight: 600; color: #4A5568; margin-top: 2px;">
                ${sellerName}
            </div>
        </div>
        <div class="header-meta">
            <div>Generated: ${formattedDate}</div>
            <div>Status: ${profile.status}</div>
        </div>
    </header>

    <!-- Grid 1: Personal & Business Info -->
    <div class="grid-2">
        <!-- Personal Section -->
        <div class="card">
            <div class="card-header" style="background-color: #E87722;">
                Personal Information
            </div>
            <div class="card-body">
                <div class="avatar-row">
                    ${profile.profilePicture ?
            `<img src="${profile.profilePicture}" class="avatar" />` :
            `<div class="avatar-placeholder">${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}</div>`
        }
                    <div>
                        <div style="font-size: 12px; font-weight: 700; color: #1A202C;">
                            ${profile.firstName} ${profile.lastName}
                        </div>
                        <div style="font-size: 9px; color: #718096; margin-top: 2px;">
                            ${profile.email}
                        </div>
                    </div>
                </div>
                
                <div class="grid-2" style="margin-bottom: 0;">
                    <div class="field">
                        <div class="field-label">Mobile</div>
                        <div class="field-value">${profile.mobile}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Member Since</div>
                        <div class="field-value">${profile.memberSince}</div>
                    </div>
                </div>
                <div class="field" style="margin-top: 8px;">
                    <div class="field-label">Status</div>
                    <span class="status-badge">${profile.status}</span>
                </div>
            </div>
        </div>

        <!-- Business Section -->
        <div class="card">
            <div class="card-header" style="background-color: #8B4513;">
                Business Information
            </div>
            <div class="card-body">
                <div class="field">
                    <div class="field-label">Business Name</div>
                    <div class="field-value" style="font-size: 12px; font-weight: 700; color: #1A202C;">
                        ${business.businessName}
                    </div>
                </div>
                
                <div class="grid-2" style="margin-top: 8px; margin-bottom: 0;">
                    <div class="field">
                        <div class="field-label">Business Type</div>
                        <div class="field-value">${business.businessType}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">GST Number</div>
                        <div class="field-value">${business.gstNumber}</div>
                    </div>
                </div>

                <div class="grid-2" style="margin-top: 8px; margin-bottom: 8px;">
                    <div class="field">
                        <div class="field-label">PAN Number</div>
                        <div class="field-value">${business.panNumber}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Aadhaar Number</div>
                        <div class="field-value">${business.aadhaarNumber}</div>
                    </div>
                </div>

                <div class="field">
                    <div class="field-label">Wallet Balance</div>
                    <div class="wallet-row">${business.walletBalance}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Grid 2: Address & Bank Info -->
    <div class="grid-2">
        <!-- Address Section -->
        <div class="card">
            <div class="card-header" style="background-color: #1E2D3D;">
                Address & Warehouse
            </div>
            <div class="card-body">
                <div class="field">
                    <div class="field-label">Billing Address</div>
                    <div class="field-value">${address.address}</div>
                </div>
                <div class="grid-2" style="margin-top: 8px; margin-bottom: 8px;">
                    <div class="field">
                        <div class="field-label">City / State</div>
                        <div class="field-value">${address.city}, ${address.state}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Pincode / Country</div>
                        <div class="field-value">${address.pincode}, ${address.country}</div>
                    </div>
                </div>
                <div class="field" style="border-top: 1px solid #E2E8F0; padding-top: 8px; margin-top: 8px;">
                    <div class="field-label">Warehouse Address</div>
                    <div class="field-value" style="font-weight: 600;">${warehouse.address}</div>
                </div>
                <div class="grid-2" style="margin-top: 6px; margin-bottom: 0;">
                    <div class="field">
                        <div class="field-label">Warehouse Area</div>
                        <div class="field-value">${warehouse.area}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">Warehouse City</div>
                        <div class="field-value">${warehouse.city}, ${warehouse.state}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bank Section -->
        <div class="card">
            <div class="card-header" style="background-color: #2E7D32;">
                Bank Information
            </div>
            <div class="card-body">
                <div class="field">
                    <div class="field-label">Bank Name</div>
                    <div class="field-value" style="font-size: 12px; font-weight: 700; color: #2E7D32;">${bank.bankName}</div>
                </div>
                <div class="grid-2" style="margin-top: 10px; margin-bottom: 10px;">
                    <div class="field">
                        <div class="field-label">Account Number</div>
                        <div class="field-value" style="font-family: monospace; font-size: 12px;">${bank.accountNumber}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">IFSC Code</div>
                        <div class="field-value" style="font-family: monospace; font-size: 12px;">${bank.ifscCode}</div>
                    </div>
                </div>
                <div class="field">
                    <div class="field-label">Account Holder Name</div>
                    <div class="field-value">${bank.accountHolderName}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Stats Section -->
    <div class="stats-row">
        <div class="stat-card">
            <div class="stat-icon" style="background-color: #FFF3E8; color: #E87722;">🛒</div>
            <div class="stat-info">
                <span class="stat-label">TOTAL PRODUCTS LISTED</span>
                <span class="stat-value">${stats.totalProducts}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background-color: #E8F5E9; color: #2E7D32;">📦</div>
            <div class="stat-info">
                <span class="stat-label">TOTAL ORDERS</span>
                <span class="stat-value">${stats.totalOrders}</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background-color: #E0F2FE; color: #0284C7;">💰</div>
            <div class="stat-info">
                <span class="stat-label">TOTAL REVENUE</span>
                <span class="stat-value">${stats.totalRevenue}</span>
            </div>
        </div>
    </div>

    <!-- Category Listings -->
    <div class="card">
        <div class="card-header" style="background-color: #7C3AED;">
            Category-wise Listings
        </div>
        <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                ${categories.map(cat => {
            const pct = Math.round((cat.count / stats.totalProducts) * 100);
            return `
                    <div class="category-item">
                        <div class="category-header">
                            <span>${cat.name}</span>
                            <span style="font-weight: 700;">${cat.count} (${pct}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${cat.color};"></div>
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        </div>
    </div>

    <!-- Product Table -->
    <div class="card">
        <div class="card-header" style="background-color: #0284C7;">
            Total Product Listings
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 50%;">PRODUCT</th>
                    <th style="width: 25%;">CATEGORY</th>
                    <th style="width: 10%; text-align: center;">SIZE</th>
                    <th style="width: 15%; text-align: right;">PRICE</th>
                </tr>
            </thead>
            <tbody>
                ${productsByCategory.map((group: any) => {
            const rows = group.items.map((item: any) => `
                        <tr>
                            <td>
                                <div class="product-cell">
                                    ${CATEGORY_IMAGES[group.category] ?
                    `<img src="${CATEGORY_IMAGES[group.category]}" class="product-image" />` :
                    `<div class="product-image-fallback">👗</div>`
                }
                                    <div>
                                        <div class="product-name">${item.name}</div>
                                        <div class="product-subtitle">${item.subtitle}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span style="font-weight: 600; color: #1d324e;">${group.category}</span>
                            </td>
                            <td style="text-align: center;">
                                <span class="size-badge">${item.size}</span>
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #1A202C;">
                                ${item.price}
                            </td>
                        </tr>
                    `).join('');

            return `
                        <tr class="category-section-tr">
                            <td colspan="4" style="border-left: 4px solid ${group.color};">
                                ${group.category.toUpperCase()} (${group.items.length} listed)
                            </td>
                        </tr>
                        ${rows}
                    `;
        }).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <span>Confidential - For Internal Use Only - ${sellerName}</span>
        <span class="page-number"></span>
    </div>
</body>
</html>
    `;
};

// ═════════════════════════════════════════════════════════════════════════════
// Main screen
// ═════════════════════════════════════════════════════════════════════════════
export default function SellerProfile() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const [profile, setProfile] = useState<ProfileData>(INIT_PROFILE);
    const [business] = useState<BusinessData>(INIT_BUSINESS);
    const [address, setAddress] = useState<AddressData>(INIT_ADDRESS);
    const [warehouse, setWarehouse] = useState<WarehouseData>(INIT_WAREHOUSE);
    const [bank] = useState<BankData>(INIT_BANK);
    const [uploading, setUploading] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    const handleDownloadPDF = async () => {
        setPdfGenerating(true);
        try {
            const productsByCategory = [
                {
                    category: 'Sarees',
                    color: '#8B5CF6',
                    items: [
                        { id: 's1', name: 'Traditional Kanjeevaram Silk Saree', subtitle: 'Updated 10 Apr, 2026', size: 'Free', price: '₹4,500.00' },
                        { id: 's2', name: 'Designer Georgette Partywear Saree', subtitle: 'Updated 08 Apr, 2026', size: 'Free', price: '₹1,850.00' },
                        { id: 's3', name: 'Classic Cotton Banarasi Saree', subtitle: 'Updated 05 Apr, 2026', size: 'Free', price: '₹3,200.00' },
                    ]
                },
                {
                    category: 'Kurtas & Suits',
                    color: '#3B82F6',
                    items: [
                        { id: 'k1', name: 'Embroidered Anarkali Kurti Suit', subtitle: 'Updated 12 Apr, 2026', size: 'M', price: '₹1,599.00' },
                        { id: 'k2', name: 'Formal Straight Cotton Kurta', subtitle: 'Updated 10 Apr, 2026', size: 'L', price: '₹899.00' },
                        { id: 'k3', name: 'Mens Cotton Kurta Pyjama Set', subtitle: 'Updated 02 Apr, 2026', size: 'XL', price: '₹2,100.00' },
                    ]
                },
                {
                    category: 'Lehengas',
                    color: '#EC4899',
                    items: [
                        { id: 'l1', name: 'Bridal Velvet Lehenga Choli', subtitle: 'Updated 11 Apr, 2026', size: 'XL', price: '₹12,500.00' },
                        { id: 'l2', name: 'Floral Printed Georgette Lehenga', subtitle: 'Updated 09 Apr, 2026', size: 'M', price: '₹4,200.00' },
                    ]
                },
                {
                    category: 'Western Wear',
                    color: '#10B981',
                    items: [
                        { id: 'w1', name: 'Floral A-Line Summer Dress', subtitle: 'Updated 14 Apr, 2026', size: 'S', price: '₹1,299.00' },
                        { id: 'w2', name: 'Casual Denim Jacket Indigo', subtitle: 'Updated 13 Apr, 2026', size: 'M', price: '₹2,499.00' },
                        { id: 'w3', name: 'Mens Sweatshirts Brown', subtitle: 'Updated 10 Apr, 2026', size: 'S', price: '₹628.95' },
                    ]
                }
            ];

            const html = getProfileHTML(
                profile,
                business,
                address,
                warehouse,
                bank,
                INIT_STATS,
                INIT_CATEGORIES,
                productsByCategory
            );

            if (Platform.OS === 'web') {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'absolute';
                iframe.style.width = '0px';
                iframe.style.height = '0px';
                iframe.style.border = 'none';
                document.body.appendChild(iframe);

                const doc = iframe.contentWindow?.document;
                if (doc) {
                    doc.open();
                    doc.write(html);
                    doc.close();

                    await new Promise((resolve) => {
                        iframe.onload = resolve;
                        setTimeout(resolve, 1500);
                    });

                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                }
                document.body.removeChild(iframe);
            } else {
                try {
                    const Print = require('expo-print');
                    const Sharing = require('expo-sharing');
                    const { uri } = await Print.printToFileAsync({ html });
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
                    } else {
                        Alert.alert('PDF Saved', `PDF generated successfully at: ${uri}`);
                    }
                } catch (e: any) {
                    Alert.alert('Error', 'To generate PDF on mobile, please make sure expo-print and expo-sharing are installed.');
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to generate PDF.');
        } finally {
            setPdfGenerating(false);
        }
    };

    const handlePhotoUpload = async () => {
        setUploading(true);
        const uri = await pickImage();
        setUploading(false);
        if (uri) setProfile((p) => ({ ...p, profilePicture: uri }));
    };

    // ── Personal card ──────────────────────────────────────────────────────────
    const PersonalSection = ({ style }: { style?: any }) => (
        <View style={[s.card, style]}>
            <SectionHeader title="Personal Information" bg={C.orange} icon="person-fill" />
            <View style={s.cardBody}>

                {/* Avatar row */}
                <View style={s.avatarRow}>
                    <View style={s.avatarWrap}>
                        {profile.profilePicture ? (
                            <Image source={{ uri: profile.profilePicture }} style={s.avatar} />
                        ) : (
                            <View style={[s.avatar, s.avatarPlaceholder]}>
                                <BI name="person-fill" size={36} color={C.orange} />
                            </View>
                        )}
                    </View>
                    <View style={s.avatarInfo}>
                        <Text style={s.fieldLabel}>PROFILE PICTURE</Text>
                        <Text style={[s.fieldValue, { fontSize: 12, color: C.textLight }]}>
                            JPG, PNG, GIF or WebP. Max 2 MB.
                        </Text>
                        <TouchableOpacity style={s.uploadBtn} onPress={handlePhotoUpload} disabled={uploading}>
                            {uploading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <BI name="cloud-arrow-up-fill" size={14} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={s.uploadBtnText}>Upload new photo</Text>
                                </>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Name row */}
                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="FIRST NAME" />
                        <IconRow icon="person" value={profile.firstName} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="LAST NAME" />
                        <IconRow icon="person" value={profile.lastName} />
                    </View>
                </View>

                {/* Contact row */}
                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="MOBILE" />
                        <IconRow icon="telephone-fill" value={profile.mobile} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="EMAIL" />
                        <IconRow icon="envelope-fill" value={profile.email} />
                    </View>
                </View>

                {/* Status / Since */}
                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="STATUS" />
                        <View style={s.statusBadge}>
                            <BI name="check-circle-fill" size={13} color={C.green} style={{ marginRight: 5 }} />
                            <Text style={s.statusText}>{profile.status}</Text>
                        </View>
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="MEMBER SINCE" />
                        <IconRow icon="calendar3" value={profile.memberSince} />
                    </View>
                </View>
            </View>
        </View>
    );

    // ── Business card ──────────────────────────────────────────────────────────
    const BusinessSection = ({ style }: { style?: any }) => (
        <View style={[s.card, style]}>
            <SectionHeader title="Business Information" bg={C.brown} icon="building-fill" />
            <View style={s.cardBody}>
                <FieldLabel label="BUSINESS NAME" />
                <IconRow icon="shop" value={business.businessName} />

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="BUSINESS TYPE" />
                        <IconRow icon="briefcase-fill" value={business.businessType} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="GST NUMBER" />
                        <IconRow icon="file-earmark-text-fill" value={business.gstNumber} />
                    </View>
                </View>

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="PAN NUMBER" />
                        <IconRow icon="credit-card-fill" value={business.panNumber} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="AADHAAR NUMBER" />
                        <IconRow icon="shield-lock-fill" value={business.aadhaarNumber} />
                    </View>
                </View>

                <FieldLabel label="WALLET BALANCE" />
                <View style={s.walletRow}>
                    <BI name="wallet2" size={20} color={C.orange} style={{ marginRight: 7 }} />
                    <Text style={s.walletValue}>{business.walletBalance}</Text>
                </View>
            </View>
        </View>
    );

    // ── Address card ───────────────────────────────────────────────────────────
    const AddressSection = ({ style }: { style?: any }) => (
        <View style={[s.card, style]}>
            <SectionHeader title="Address Information" bg={C.navy} icon="geo-alt-fill" />
            <View style={s.cardBody}>
                <EditableField label="ADDRESS" value={address.address}
                    onSave={(v) => setAddress((a) => ({ ...a, address: v }))} />

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="CITY" />
                        <IconRow icon="building" value={address.city} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="STATE" />
                        <IconRow icon="map" value={address.state} />
                    </View>
                </View>

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="PINCODE" />
                        <IconRow icon="mailbox" value={address.pincode} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <EditableField label="ROAD/STREET NUMBER" value={address.roadStreetNumber}
                            onSave={(v) => setAddress((a) => ({ ...a, roadStreetNumber: v }))} />
                    </View>
                </View>

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <EditableField label="LANDMARK" value={address.landmark}
                            onSave={(v) => setAddress((a) => ({ ...a, landmark: v }))} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="COUNTRY" />
                        <IconRow icon="globe2" value={address.country} />
                    </View>
                </View>

                {/* Warehouse sub-section */}
                <View style={s.warehouseHeader}>
                    <BI name="building-fill-gear" size={16} color={C.navy} style={{ marginRight: 7 }} />
                    <Text style={s.warehouseTitle}>Warehouse Address</Text>
                </View>

                <FieldLabel label="WAREHOUSE ADDRESS" />
                <IconRow icon="house-fill" value={warehouse.address} />

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="WAREHOUSE AREA" />
                        <IconRow icon="pin-map-fill" value={warehouse.area} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="WAREHOUSE CITY" />
                        <IconRow icon="building" value={warehouse.city} />
                    </View>
                </View>

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="WAREHOUSE STATE" />
                        <IconRow icon="map" value={warehouse.state} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="WAREHOUSE COUNTRY" />
                        <IconRow icon="globe2" value={warehouse.country} />
                    </View>
                </View>
            </View>
        </View>
    );

    // ── Bank card ──────────────────────────────────────────────────────────────
    const BankSection = ({ style }: { style?: any }) => (
        <View style={[s.card, style]}>
            <SectionHeader title="Bank Information" bg="#2E7D32" icon="bank2" />
            <View style={s.cardBody}>
                <FieldLabel label="BANK NAME" />
                <IconRow icon="bank" value={bank.bankName} />

                <View style={isDesktop ? s.row2 : undefined}>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="ACCOUNT NUMBER" />
                        <IconRow icon="credit-card-2-front-fill" value={bank.accountNumber} />
                    </View>
                    <View style={isDesktop ? s.col : undefined}>
                        <FieldLabel label="IFSC CODE" />
                        <IconRow icon="hash" value={bank.ifscCode} />
                    </View>
                </View>

                <FieldLabel label="ACCOUNT HOLDER NAME" />
                <IconRow icon="person-badge-fill" value={bank.accountHolderName} />
            </View>
        </View>
    );

    // ── Page header (breadcrumb) ───────────────────────────────────────────────
    const PageHeader = () => (
        <View style={{
            backgroundColor: "#1d324e",
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
        }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <BI name="person-fill" size={24} color="#fff" />
                <Text style={{ fontSize: isDesktop ? 24 : 20, fontWeight: "800", color: "#fff" }}>
                    My Profile
                </Text>
            </View>
            <TouchableOpacity
                style={{
                    backgroundColor: C.orange,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                }}
                onPress={handleDownloadPDF}
                disabled={pdfGenerating}
            >
                <BI name="file-pdf-fill" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                    Download PDF
                </Text>
            </TouchableOpacity>
        </View>
    );

    // ── Stats Summary Component ───────────────────────────────────────────────
    const StatsSummary = () => {
        const stats = [
            {
                label: 'TOTAL PRODUCTS LISTED',
                value: String(INIT_STATS.totalProducts),
                icon: 'box-seam-fill',
                bg: C.orangeLight,
                color: C.orange,
            },
            {
                label: 'TOTAL ORDERS',
                value: String(INIT_STATS.totalOrders),
                icon: 'bag-check-fill',
                bg: C.greenLight,
                color: C.green,
            },
            {
                label: 'TOTAL REVENUE',
                value: INIT_STATS.totalRevenue,
                icon: 'cash-stack',
                bg: '#E0F2FE',
                color: '#0284C7',
            },
        ];

        return (
            <View style={isDesktop ? s.statsRowDesktop : s.statsRowMobile}>
                {stats.map((item, idx) => (
                    <View key={idx} style={[s.statCard, isDesktop && { flex: 1 }]}>
                        <View style={[s.statIconWrap, { backgroundColor: item.bg }]}>
                            <BI name={item.icon} size={22} color={item.color} />
                        </View>
                        <View style={s.statInfo}>
                            <Text style={s.statLabel}>{item.label}</Text>
                            <Text style={s.statValue}>{item.value}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    // ── Category-wise Listings Component ────────────────────────────────────────
    const CategoryListings = () => {
        return (
            <View style={s.card}>
                <SectionHeader title="Category-wise Product Listings" bg="#7C3AED" icon="tags-fill" />
                <View style={s.cardBody}>
                    {INIT_CATEGORIES.map((cat) => {
                        const pct = Math.round((cat.count / INIT_STATS.totalProducts) * 100);
                        return (
                            <View key={cat.id} style={s.categoryItem}>
                                <View style={s.categoryHeaderRow}>
                                    <View style={s.categoryInfoCol}>
                                        <View style={[s.catIconWrap, { backgroundColor: cat.color + '15' }]}>
                                            <BI name={cat.icon} size={16} color={cat.color} />
                                        </View>
                                        <Text style={s.categoryName}>{cat.name}</Text>
                                    </View>
                                    <View style={s.categoryCountCol}>
                                        <Text style={s.categoryCount}>{cat.count} Products</Text>
                                        <Text style={s.categoryPct}>({pct}%)</Text>
                                    </View>
                                </View>
                                <View style={s.progressBarBg}>
                                    <View style={[s.progressBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // ── Recent Product Listings Component ───────────────────────────────────────
    const RecentProducts = () => {
        const productsByCategory = [
            {
                category: 'Sarees',
                color: '#8B5CF6',
                items: [
                    { id: 's1', name: 'Traditional Kanjeevaram Silk Saree', subtitle: 'Updated 10 Apr, 2026', size: 'Free', price: '₹4,500.00' },
                    { id: 's2', name: 'Designer Georgette Partywear Saree', subtitle: 'Updated 08 Apr, 2026', size: 'Free', price: '₹1,850.00' },
                    { id: 's3', name: 'Classic Cotton Banarasi Saree', subtitle: 'Updated 05 Apr, 2026', size: 'Free', price: '₹3,200.00' },
                ]
            },
            {
                category: 'Kurtas & Suits',
                color: '#3B82F6',
                items: [
                    { id: 'k1', name: 'Embroidered Anarkali Kurti Suit', subtitle: 'Updated 12 Apr, 2026', size: 'M', price: '₹1,599.00' },
                    { id: 'k2', name: 'Formal Straight Cotton Kurta', subtitle: 'Updated 10 Apr, 2026', size: 'L', price: '₹899.00' },
                    { id: 'k3', name: 'Mens Cotton Kurta Pyjama Set', subtitle: 'Updated 02 Apr, 2026', size: 'XL', price: '₹2,100.00' },
                ]
            },
            {
                category: 'Lehengas',
                color: '#EC4899',
                items: [
                    { id: 'l1', name: 'Bridal Velvet Lehenga Choli', subtitle: 'Updated 11 Apr, 2026', size: 'XL', price: '₹12,500.00' },
                    { id: 'l2', name: 'Floral Printed Georgette Lehenga', subtitle: 'Updated 09 Apr, 2026', size: 'M', price: '₹4,200.00' },
                ]
            },
            {
                category: 'Western Wear',
                color: '#10B981',
                items: [
                    { id: 'w1', name: 'Floral A-Line Summer Dress', subtitle: 'Updated 14 Apr, 2026', size: 'S', price: '₹1,299.00' },
                    { id: 'w2', name: 'Casual Denim Jacket Indigo', subtitle: 'Updated 13 Apr, 2026', size: 'M', price: '₹2,499.00' },
                    { id: 'w3', name: 'Mens Sweatshirts Brown', subtitle: 'Updated 10 Apr, 2026', size: 'S', price: '₹628.95' },
                ]
            }
        ];

        const TableContent = () => (
            <View style={s.table}>
                {/* Header Row */}
                <View style={s.tableHeader}>
                    <Text style={[s.th, { flex: 2.5 }]}>PRODUCT</Text>
                    <Text style={[s.th, { flex: 1.8 }]}>CATEGORY</Text>
                    <Text style={[s.th, { flex: 0.8, textAlign: 'center' }]}>SIZE</Text>
                    <Text style={[s.th, { flex: 1.2, textAlign: 'right' }]}>PRICE</Text>
                </View>

                {/* Rows Grouped By Category */}
                {productsByCategory.map((group) => (
                    <React.Fragment key={group.category}>
                        {/* Category Section Row */}
                        <View style={[s.categorySectionHeader, { borderLeftColor: group.color }]}>
                            <Text style={[s.categorySectionHeaderText, { color: group.color }]}>
                                {group.category.toUpperCase()} ({group.items.length} listed)
                            </Text>
                        </View>

                        {/* Category Items */}
                        {group.items.map((item, idx) => (
                            <View key={item.id} style={[s.tableRow, idx === group.items.length - 1 && { borderBottomWidth: 0 }]}>
                                {/* Product Column */}
                                <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center' }}>
                                    <Image
                                        source={{ uri: CATEGORY_IMAGES[group.category] }}
                                        style={s.productImage}
                                        resizeMode="cover"
                                    />
                                    <View style={{ flex: 1, paddingRight: 6 }}>
                                        <Text style={s.productNameText} numberOfLines={1}>{item.name}</Text>
                                        <Text style={s.productSubtitleText}>{item.subtitle}</Text>
                                    </View>
                                </View>

                                {/* Category Column */}
                                <View style={{ flex: 1.8, justifyContent: 'center' }}>
                                    <Text style={s.productCategoryText}>{group.category}</Text>
                                </View>

                                {/* Size Column */}
                                <View style={{ flex: 0.8, alignItems: 'center', justifyContent: 'center' }}>
                                    <View style={s.sizeBadge}>
                                        <Text style={s.sizeBadgeText}>{item.size}</Text>
                                    </View>
                                </View>

                                {/* Price Column */}
                                <Text style={[s.td, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: C.text }]}>
                                    {item.price}
                                </Text>
                            </View>
                        ))}
                    </React.Fragment>
                ))}
            </View>
        );

        return (
            <View style={s.card}>
                <SectionHeader title="Total Product Listings" bg="#0284C7" icon="bag-fill" />
                <View style={s.cardBody}>
                    {!isDesktop ? (
                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                            <View style={{ minWidth: 600 }}>
                                <TableContent />
                            </View>
                        </ScrollView>
                    ) : (
                        <TableContent />
                    )}
                </View>
            </View>
        );
    };

    // ── Desktop layout ─────────────────────────────────────────────────────────
    if (isDesktop) {
        return (
            <View style={s.pageDesktop}>
                <ScrollView contentContainerStyle={s.desktopContent} showsVerticalScrollIndicator={false}>
                    <PageHeader />
                    <View style={s.desktopRow}>
                        <View style={[s.half, { marginRight: 12 }]}><PersonalSection style={{ flex: 1 }} /></View>
                        <View style={[s.half, { marginLeft: 12 }]}><BusinessSection style={{ flex: 1 }} /></View>
                    </View>
                    <View style={s.desktopRow}>
                        <View style={[s.half, { marginRight: 12 }]}><AddressSection style={{ flex: 1 }} /></View>
                        <View style={[s.half, { marginLeft: 12 }]}><BankSection style={{ flex: 1 }} /></View>
                    </View>
                    <StatsSummary />
                    <CategoryListings />
                    <RecentProducts />
                </ScrollView>
                {pdfGenerating && (
                    <View style={s.pdfLoadingOverlay}>
                        <ActivityIndicator size="large" color={C.orange} />
                        <Text style={s.pdfLoadingText}>Generating PDF Document...</Text>
                    </View>
                )}
            </View>
        );
    }

    // ── Mobile layout ──────────────────────────────────────────────────────────
    return (
        <View style={s.pageMobile}>
            <ScrollView contentContainerStyle={s.mobileContent} showsVerticalScrollIndicator={false}>
                <PageHeader />
                <PersonalSection />
                <BusinessSection />
                <AddressSection />
                <BankSection />
                <StatsSummary />
                <CategoryListings />
                <RecentProducts />
            </ScrollView>
            {pdfGenerating && (
                <View style={s.pdfLoadingOverlay}>
                    <ActivityIndicator size="large" color={C.orange} />
                    <Text style={s.pdfLoadingText}>Generating PDF Document...</Text>
                </View>
            )}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    pdfLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        gap: 12,
    },
    pdfLoadingText: {
        fontSize: 15,
        fontWeight: '700',
        color: C.navy,
    },
    // Page shells
    pageDesktop: { flex: 1, backgroundColor: C.surface },
    desktopContent: { padding: 32, maxWidth: 1280, alignSelf: 'center', width: '100%' },
    pageMobile: { flex: 1, backgroundColor: C.surface },
    mobileContent: { padding: 16, paddingBottom: 48 },

    // Page title
    pageTitle: { marginBottom: 24 },
    pageTitleRow: { flexDirection: 'row', alignItems: 'center' },
    pageTitleText: { fontSize: 26, fontWeight: '700', color: C.text },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    breadcrumb: { fontSize: 13, color: C.textLight },

    // Desktop grid
    desktopRow: { flexDirection: 'row', marginBottom: 24 },
    half: { flex: 1 },

    // Card
    card: {
        backgroundColor: C.white,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardBody: { padding: 20 },

    // Section header
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    sectionHeaderText: { fontSize: 15, fontWeight: '700', color: C.white, letterSpacing: 0.3 },

    // Avatar
    avatarRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        marginBottom: 20, paddingBottom: 20,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatarWrap: { marginRight: 16 },
    avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.border },
    avatarPlaceholder: { backgroundColor: C.orangeLight, justifyContent: 'center', alignItems: 'center' },
    avatarInfo: { flex: 1 },
    uploadBtn: {
        backgroundColor: C.orange, borderRadius: 8,
        paddingVertical: 8, paddingHorizontal: 14,
        marginTop: 10, alignSelf: 'flex-start',
        flexDirection: 'row', alignItems: 'center',
    },
    uploadBtnText: { color: C.white, fontWeight: '600', fontSize: 13 },

    // Fields
    fieldLabel: {
        fontSize: 11, fontWeight: '700', color: C.textLight,
        letterSpacing: 0.8, marginTop: 14, marginBottom: 3,
        textTransform: 'uppercase',
    },
    fieldValue: { fontSize: 14, color: C.textMid, lineHeight: 20 },
    iconRow: { flexDirection: 'row', alignItems: 'center' },

    // 2-col grid inside card
    row2: { flexDirection: 'row' },
    col: { flex: 1, paddingRight: 10 },

    // Status badge
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.greenLight, borderRadius: 20,
        paddingVertical: 4, paddingHorizontal: 12,
        alignSelf: 'flex-start', marginTop: 4,
    },
    statusText: { fontSize: 13, fontWeight: '600', color: C.green },

    // Wallet
    walletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    walletValue: { fontSize: 18, fontWeight: '700', color: C.orange },

    // Editable field
    efWrap: { marginBottom: 2 },
    efRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    editBtn: {
        borderWidth: 1, borderColor: C.border, borderRadius: 6,
        paddingVertical: 4, paddingHorizontal: 10,
        marginLeft: 8, flexShrink: 0,
        flexDirection: 'row', alignItems: 'center',
    },
    editBtnText: { fontSize: 12, color: C.textMid, fontWeight: '500' },
    textInput: {
        borderWidth: 1, borderColor: C.orange, borderRadius: 8,
        padding: 10, fontSize: 14, color: C.text,
        backgroundColor: C.orangeLight, marginTop: 4, minHeight: 40,
    },
    editActions: { flexDirection: 'row', marginTop: 8, gap: 8 },
    btnSave: {
        backgroundColor: C.orange, borderRadius: 8,
        paddingVertical: 7, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center',
    },
    btnSaveText: { color: C.white, fontWeight: '700', fontSize: 13 },
    btnCancel: {
        borderWidth: 1, borderColor: C.border, borderRadius: 8,
        paddingVertical: 7, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center',
    },
    btnCancelText: { color: C.textMid, fontWeight: '600', fontSize: 13 },

    // Warehouse sub-header
    warehouseHeader: {
        flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: C.border,
        marginTop: 20, paddingTop: 16, marginBottom: 4,
    },
    warehouseTitle: { fontSize: 14, fontWeight: '700', color: C.text },

    // Stats Summary
    statsRowDesktop: { flexDirection: 'row', gap: 24, marginBottom: 24 },
    statsRowMobile: { flexDirection: 'column', gap: 16, marginBottom: 24 },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 3,
    },
    statIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    statInfo: { flex: 1 },
    statLabel: { fontSize: 11, fontWeight: '700', color: C.textLight, letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 2 },

    // Category Listings
    categoryItem: { marginBottom: 18 },
    categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    categoryInfoCol: { flexDirection: 'row', alignItems: 'center' },
    catIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    categoryName: { fontSize: 14, fontWeight: '600', color: C.text },
    categoryCountCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    categoryCount: { fontSize: 13, fontWeight: '700', color: C.textMid },
    categoryPct: { fontSize: 11, color: C.textLight },
    progressBarBg: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: 6, borderRadius: 3 },

    // Recent Products Table Styles
    table: { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12, paddingHorizontal: 16 },
    th: { fontSize: 11, fontWeight: '700', color: C.textLight, letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: C.white },
    td: { fontSize: 13, color: C.textMid },
    productImageMock: { width: 36, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    productImage: { width: 36, height: 36, borderRadius: 6, marginRight: 10 },
    productNameText: { fontSize: 13, fontWeight: '700', color: C.text },
    productSubtitleText: { fontSize: 11, color: C.textLight, marginTop: 2 },
    productCategoryText: { fontSize: 13, fontWeight: '600', color: '#1d324e' },
    productSubcategoryText: { fontSize: 11, color: C.textLight, marginTop: 1 },
    sizeBadge: { backgroundColor: '#F1F5F9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    sizeBadgeText: { fontSize: 12, fontWeight: '600', color: C.textMid },

    // Category Section Header Table Styles
    categorySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderLeftWidth: 4,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    categorySectionHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});