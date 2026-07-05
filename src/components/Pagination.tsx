import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const NAVY = "#1d324e";
const MUTED = "#69798c";
const BORDER = "#e5e7eb";

// Breakpoint below which the mobile pagination layout is used.
// Adjust to taste, or swap for Platform.OS === "web" if you'd rather
// key off platform instead of screen width.
const MOBILE_BREAKPOINT = 480;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemName?: string;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemName = "items",
  onPageChange,
}: PaginationProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  if (totalPages <= 1 && totalItems === 0) return null;

  // Build page number list: always show first, last, current ± 1, with ellipsis
  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    const addPage = (n: number) => {
      if (!pages.includes(n)) pages.push(n);
    };
    addPage(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      addPage(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    addPage(totalPages);
    return pages;
  };

  const pages = getPages();

  if (isMobile) {
    return (
      <MobilePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pages={pages}
        onPageChange={onPageChange}
      />
    );
  }

  // ── Existing web / desktop layout (unchanged) ──────────────────────────
  const start = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <View style={styles.wrapper}>
      {/* White card container */}
      <View style={styles.container}>
        {/* Left: showing label */}
        <Text style={styles.label}>
          Showing {start}–{end} of {totalItems} {itemName}
        </Text>

        {/* Right: page buttons */}
        <View style={styles.controls}>
          {/* Previous arrow — only show when not on first page */}
          {currentPage > 1 && (
            <TouchableOpacity
              style={styles.pageBtn}
              onPress={() => onPageChange(currentPage - 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.arrowText}>{"<"}</Text>
            </TouchableOpacity>
          )}

          {pages.map((p, i) =>
            p === "..." ? (
              <View key={`ellipsis-${i}`} style={styles.ellipsis}>
                <Text style={styles.ellipsisText}>…</Text>
              </View>
            ) : (
              <TouchableOpacity
                key={p}
                style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                onPress={() => onPageChange(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          {/* Next arrow */}
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            activeOpacity={currentPage === totalPages ? 1 : 0.7}
            disabled={currentPage === totalPages}
          >
            <Text style={[styles.arrowText, currentPage === totalPages && styles.arrowDisabled]}>
              {">"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Mobile layout ──────────────────────────────────────────────────────────
// Row 1: prev arrow, compact page pills (active page filled navy), next arrow.
// Row 2: "Select page:  13 ⌄" — tap opens a dropdown list to jump to any page.

interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  pages: (number | "...")[];
  onPageChange: (page: number) => void;
}

function MobilePagination({ currentPage, totalPages, pages, onPageChange }: MobilePaginationProps) {
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <View style={mobileStyles.wrapper}>
      <View style={mobileStyles.card}>
        {/* Row 1: arrows + page pills */}
        <View style={mobileStyles.row}>
          <TouchableOpacity
            style={[mobileStyles.arrowBtn, currentPage === 1 && mobileStyles.arrowBtnDisabled]}
            onPress={() => currentPage > 1 && onPageChange(currentPage - 1)}
            activeOpacity={currentPage === 1 ? 1 : 0.7}
            disabled={currentPage === 1}
          >
            <Text style={[mobileStyles.arrowText, currentPage === 1 && mobileStyles.arrowTextDisabled]}>
              {"<"}
            </Text>
          </TouchableOpacity>

          {pages.map((p, i) =>
            p === "..." ? (
              <View key={`m-ellipsis-${i}`} style={mobileStyles.ellipsis}>
                <Text style={mobileStyles.ellipsisText}>…</Text>
              </View>
            ) : (
              <TouchableOpacity
                key={p}
                style={[mobileStyles.pageBtn, currentPage === p && mobileStyles.pageBtnActive]}
                onPress={() => onPageChange(p)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    mobileStyles.pageBtnText,
                    currentPage === p && mobileStyles.pageBtnTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[mobileStyles.arrowBtn, currentPage === totalPages && mobileStyles.arrowBtnDisabled]}
            onPress={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            activeOpacity={currentPage === totalPages ? 1 : 0.7}
            disabled={currentPage === totalPages}
          >
            <Text
              style={[mobileStyles.arrowText, currentPage === totalPages && mobileStyles.arrowTextDisabled]}
            >
              {">"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Web / desktop styles (unchanged) ────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    color: MUTED,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: NAVY,
  },
  pageBtnTextActive: {
    color: "#ffffff",
  },
  arrowText: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },
  arrowDisabled: {
    color: "#c5cdd6",
  },
  ellipsis: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsisText: {
    fontSize: 14,
    color: MUTED,
  },
});

// ── Mobile styles (new) ──────────────────────────────────────────────────────
const mobileStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  arrowText: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },
  arrowTextDisabled: {
    color: "#c5cdd6",
  },
  pageBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: {
    backgroundColor: NAVY,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3a4a5e",
  },
  pageBtnTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  ellipsis: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsisText: {
    fontSize: 13,
    color: MUTED,
  },
});