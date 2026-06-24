import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PaginationProps {
  currentPage: number; // 1-indexed for UI, but usually 0-indexed for API. We'll assume 1-indexed here.
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
  itemName = 'items',
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and a few around current
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>
        Showing {startItem}-{endItem} of {totalItems} {itemName}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
        >
          <Text style={[styles.arrowText, currentPage === 1 && styles.arrowTextDisabled]}>&lt;</Text>
        </TouchableOpacity>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <View key={`ellipsis-${index}`} style={styles.ellipsisContainer}>
                <Text style={styles.ellipsisText}>...</Text>
              </View>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <TouchableOpacity
              key={`page-${page}`}
              style={[styles.pageBtn, isCurrent && styles.pageBtnActive]}
              onPress={() => onPageChange(page as number)}
            >
              <Text style={[styles.pageBtnText, isCurrent && styles.pageBtnTextActive]}>
                {page}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
        >
          <Text style={[styles.arrowText, currentPage === totalPages && styles.arrowTextDisabled]}>&gt;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#151D4F',
    borderColor: '#151D4F',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  pageBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  arrowText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  arrowTextDisabled: {
    color: '#D1D5DB',
  },
  ellipsisContainer: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipsisText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
