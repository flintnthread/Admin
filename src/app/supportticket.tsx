/**
 * RecentlyUploadedSellersTable.tsx
 *
 * Drop-in replacement for the "Recently Uploaded Profile Completed Sellers"
 * section in SellerShiprocket.tsx.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   import RecentlyUploadedSellersTable from "./RecentlyUploadedSellersTable";
 *
 *   // Inside your SellerShiprocket component, replace the old table with:
 *   <RecentlyUploadedSellersTable sellers={recentlyUploadedSellers} />
 *
 * ── PROPS ────────────────────────────────────────────────────────────────────
 *
 *   sellers: UploadedSeller[]   — keep your existing API data shape
 *
 * ── RESPONSIVE BREAKPOINTS ───────────────────────────────────────────────────
 *
 *   ≥ 900px  (desktop/tablet-landscape)
 *            All 6 columns: Business Name | Contact Person | City |
 *                            State | Uploaded At | Status
 *
 *   600–899px (tablet-portrait)
 *            5 columns: Business Name | Contact Person | City | Uploaded At | Status
 *            (State hidden)
 *
 *   < 600px  (mobile)
 *            3 columns: Business Name | Uploaded At | Status
 *            (Contact Person, City, State hidden)
 *            Business Name wraps to 2 lines if needed
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AdminLayout from "@/components/admin-layout";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

// ─── Theme ────────────────────────────────────────────────────────────────────
const GREEN = "#16a34a";  // Uploaded badge background
const GREEN_LIGHT = "#dcfce7";  // Section header tint bg
const GREEN_DARK = "#15803d";  // Uploaded badge text
const HEADER_BG = "#F7F9F7";  // Column header row background (very light warm grey)
const BORDER = "#E5E7EB";
const ROW_EVEN = "#ffffff";
const ROW_ODD = "#f9fafb";
const TEXT_STRONG = "#111827";
const TEXT_MID = "#374151";
const TEXT_LIGHT = "#6B7280";

// ─── Types ────────────────────────────────────────────────────────────────────
// Match whatever shape your API/mapper already produces.
// All fields are optional so the component degrades gracefully.
export interface UploadedSeller {
  id?: string | number;
  businessName?: string;
  contactPerson?: string;
  city?: string;
  state?: string;
  uploadedAt?: string;   // Already-formatted string, e.g. "11 Jun, 2026 11:15 AM"
  status?: string;   // e.g. "Uploaded", "Pending", …
}

// ─── Column descriptor ───────────────────────────────────────────────────────
interface ColDef {
  key: keyof UploadedSeller | "__status__";
  label: string;
  flex?: number;      // flex weight
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  hideBelow?: number;      // hide column when screenWidth < this value
}

const COLUMNS: ColDef[] = [
  { key: "businessName", label: "Business Name", flex: 2.2, minWidth: 120, align: "left" },
  { key: "contactPerson", label: "Contact Person", flex: 1.8, minWidth: 110, align: "left", hideBelow: 600 },
  { key: "city", label: "City", flex: 1.2, minWidth: 80, align: "left", hideBelow: 600 },
  { key: "state", label: "State", flex: 1.2, minWidth: 90, align: "left", hideBelow: 900 },
  { key: "uploadedAt", label: "Uploaded At", flex: 1.8, minWidth: 140, align: "left" },
  { key: "__status__", label: "Status", flex: 1, minWidth: 90, align: "center" },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
function UploadedBadge({ status }: { status?: string }) {
  const label = status ?? "Uploaded";
  const isGood = label.toLowerCase() === "uploaded";

  return (
    <View style={[
      styles.badge,
      { backgroundColor: isGood ? GREEN : "#F59E0B" },
    ]}>
      {isGood && (
        <MaterialCommunityIcons
          name="check"
          size={11}
          color="#fff"
          style={{ marginRight: 3 }}
        />
      )}
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface Props {
  sellers: UploadedSeller[];
}

export default function RecentlyUploadedSellersTable({ sellers }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const safeSellers = sellers ?? [];

  // Only columns whose hideBelow threshold is met
  const visibleCols = COLUMNS.filter(
    (col) => !col.hideBelow || screenWidth >= col.hideBelow
  );

  // ── Section header ─────────────────────────────────────────────────────────
  const SectionHeader = () => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons
        name="information-outline"
        size={16}
        color={GREEN}
        style={{ marginRight: 8 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>
          Recently Uploaded Profile Completed Sellers
        </Text>
        <Text style={styles.sectionSubtitle}>
          These profile completed sellers have already been uploaded to Shiprocket
        </Text>
      </View>
    </View>
  );

  // ── Column header row ──────────────────────────────────────────────────────
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      {visibleCols.map((col) => (
        <View
          key={col.key}
          style={[
            styles.headerCell,
            { flex: col.flex ?? 1, minWidth: col.minWidth },
            col.align === "center" && { alignItems: "center" },
            col.align === "right" && { alignItems: "flex-end" },
          ]}
        >
          <Text style={styles.headerCellText}>{col.label}</Text>
        </View>
      ))}
    </View>
  );

  // ── Data row ───────────────────────────────────────────────────────────────
  const DataRow = ({ seller, index }: { seller: UploadedSeller; index: number }) => (
    <View style={[
      styles.dataRow,
      index % 2 === 0 ? styles.rowEven : styles.rowOdd,
    ]}>
      {visibleCols.map((col) => {
        // Status column — render badge
        if (col.key === "__status__") {
          return (
            <View
              key={col.key}
              style={[
                styles.dataCell,
                { flex: col.flex ?? 1, minWidth: col.minWidth, alignItems: "center" },
              ]}
            >
              <UploadedBadge status={seller.status} />
            </View>
          );
        }

        const value = seller[col.key as keyof UploadedSeller];

        return (
          <View
            key={col.key}
            style={[
              styles.dataCell,
              { flex: col.flex ?? 1, minWidth: col.minWidth },
              col.align === "center" && { alignItems: "center" },
              col.align === "right" && { alignItems: "flex-end" },
            ]}
          >
            <Text
              style={[
                styles.dataCellText,
                col.key === "businessName" && styles.dataCellBold,
                col.key === "uploadedAt" && styles.dataCellMono,
                (!value) && styles.dataCellEmpty,
              ]}
              numberOfLines={col.key === "businessName" ? 2 : 1}
              ellipsizeMode="tail"
            >
              {value ?? "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="store-off-outline" size={36} color="#D1D5DB" />
      <Text style={styles.emptyText}>No recently uploaded sellers</Text>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <View style={styles.wrapper}>
        <SectionHeader />

        {/* Horizontal scroll only kicks in when content is wider than screen */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          scrollEnabled={false}  // We rely on flex layout; enable if columns overflow
        >
          <View style={styles.tableContainer}>
            <TableHeader />

            {safeSellers.length === 0 ? (
              <EmptyState />
            ) : (
              safeSellers.map((seller, index) => (
                <DataRow
                  key={seller.id ?? index}
                  seller={seller}
                  index={index}
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </AdminLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Outer wrapper ──
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 20,

    // Shadow matching other cards in the admin UI
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Section header (green tinted info bar) ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#f0fdf4",   // very light green matching screenshot
    borderBottomWidth: 2,
    borderBottomColor: "#bbf7d0", // green-200
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_STRONG,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: TEXT_LIGHT,
    lineHeight: 17,
  },

  // ── Table container ──
  tableContainer: {
    flex: 1,
    width: "100%",
  },

  // ── Header row ──
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: HEADER_BG,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: BORDER,
  },
  headerCell: {
    justifyContent: "center",
    paddingRight: 12,
  },
  headerCellText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MID,
    letterSpacing: 0.2,
    textTransform: "none",
  },

  // ── Data rows ──
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowEven: { backgroundColor: ROW_EVEN },
  rowOdd: { backgroundColor: ROW_ODD },

  dataCell: {
    justifyContent: "center",
    paddingRight: 12,
  },
  dataCellText: {
    fontSize: 13,
    color: TEXT_MID,
    lineHeight: 19,
  },
  dataCellBold: {
    fontWeight: "700",
    color: TEXT_STRONG,
    fontSize: 13,
  },
  dataCellMono: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: TEXT_LIGHT,
  },
  dataCellEmpty: {
    color: "#D1D5DB",
  },

  // ── Uploaded badge ──
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});