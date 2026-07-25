import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

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

  // Build page number list: always show first, last, current +/- 1, with ellipsis
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
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      addPage(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    addPage(totalPages);
    return pages;
  };

  const pages = getPages();
  const safePage = Math.min(currentPage, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(safePage * itemsPerPage, totalItems);

  return (
    <View style={[s.pgWrap, isMobile && s.pgWrapMobile]}>
      {/* "Showing X-Y of Z items" — hidden on mobile */}
      {!isMobile && (
        <Text style={s.pgInfo}>
          Showing {rangeStart}-{rangeEnd} of {totalItems} {itemName}
        </Text>
      )}

      {/* Page buttons */}
      <View style={[s.pgControls, isMobile && s.pgControlsMobile]}>
        {/* Prev button */}
        <TouchableOpacity
          style={[s.pgBtn, safePage === 1 && s.pgBtnDisabled]}
          onPress={() => safePage > 1 && onPageChange(safePage - 1)}
          activeOpacity={0.7}
          disabled={safePage === 1}
        >
          <Text style={[s.arrowTxt, safePage === 1 && s.arrowDisabled]}>{"<"}</Text>
        </TouchableOpacity>

        {/* Page number pills */}
        {pages.map((p, i) =>
          p === "..." ? (
            <View key={`ellipsis-${i}`} style={s.ellipsis}>
              <Text style={s.ellipsisTxt}>...</Text>
            </View>
          ) : (
            <TouchableOpacity
              key={p}
              style={[s.pgBtn, safePage === p && s.pgBtnActive]}
              onPress={() => onPageChange(p as number)}
              activeOpacity={0.7}
            >
              <Text style={[s.pgBtnTxt, safePage === p && s.pgBtnTxtActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          )
        )}

        {/* Next button */}
        <TouchableOpacity
          style={[s.pgBtn, safePage === totalPages && s.pgBtnDisabled]}
          onPress={() => safePage < totalPages && onPageChange(safePage + 1)}
          activeOpacity={0.7}
          disabled={safePage === totalPages}
        >
          <Text style={[s.arrowTxt, safePage === totalPages && s.arrowDisabled]}>
            {">"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles matching customerManagement.tsx pagination exactly
const s = StyleSheet.create({
  pgWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E2D9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  pgWrapMobile: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  pgInfo: {
    fontSize: 13,
    color: "#6B7280",
  },
  pgControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pgControlsMobile: {
    alignSelf: "center",
    width: "100%",
    justifyContent: "center",
  },
  pgBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E8E2D9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  pgBtnActive: {
    backgroundColor: "#151D4F",
    borderColor: "#151D4F",
  },
  pgBtnDisabled: {
    opacity: 0.35,
  },
  pgBtnTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  pgBtnTxtActive: {
    color: "#fff",
  },
  arrowTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  arrowDisabled: {
    color: "#E8E2D9",
  },
  ellipsis: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsisTxt: {
    fontSize: 14,
    color: "#6B7280",
  },
});
