import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const NAVY = "#1d324e";
const MUTED = "#69798c";
const BORDER = "#e5e7eb";

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
  if (totalPages <= 1 && totalItems === 0) return null;

  const start = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const end = Math.min(currentPage * itemsPerPage, totalItems);

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

const styles = StyleSheet.create({
  // Outer wrapper — matches the grey page background
  wrapper: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },

  // White pill/card
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

  // "Showing X–Y of Z items" text
  label: {
    fontSize: 13,
    color: MUTED,
  },

  // Page button row
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Individual page button — default (white + border)
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

  // Active page button — dark navy fill, no border
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