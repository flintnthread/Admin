// locations-theme.ts — matches the Customer Management dark navy/orange design system
export const LocationColors = {
  // Page background
  pageBg: '#F0F4F8',

  // Hero / header card (dark navy gradient)
  heroStart: '#1E2A4A',
  heroEnd: '#16213E',
  heroText: '#FFFFFF',
  heroSubtext: 'rgba(255,255,255,0.65)',

  // Stat pill cards (inside the hero)
  pillBg: 'rgba(255,255,255,0.12)',
  pillBorder: 'rgba(255,255,255,0.18)',

  // Cards / surfaces
  cardBg: '#FFFFFF',
  cardBorder: '#E8EDF2',
  cardShadow: 'rgba(30,42,74,0.08)',

  // Accent — orange (matches customer screen's orange icon/stat accent)
  accentStrong: '#EA580C',
  accentMid: '#FB923C',
  accentLight: '#FFF7ED',
  accentBorder: '#FED7AA',

  // Active / green
  activeText: '#15803D',
  activeBg: '#DCFCE7',
  activeBorder: '#86EFAC',
  activeDot: '#22C55E',

  // Inactive / red
  inactiveText: '#DC2626',
  inactiveBg: '#FEF2F2',
  inactiveBorder: '#FECACA',

  // Text scale
  text: '#1E2A4A',
  textSecondary: '#4B5A6E',
  textMuted: '#8896A4',
  textLight: '#B0BECA',

  // Borders / dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Table header (dark navy)
  tableHead: '#1E2A4A',

  // View toggle active
  viewActive: '#1E2A4A',

  // Modal header
  modalHeader: '#1E2A4A',

  // Tab active underline
  tabActive: '#EA580C',

  // Stat icon backgrounds
  statBlue: { bg: '#EFF6FF', color: '#2563EB' },
  statPurple: { bg: '#F3E8FF', color: '#9333EA' },
  statOrange: { bg: '#FFF7ED', color: '#EA580C' },
  statGreen: { bg: '#DCFCE7', color: '#16A34A' },
  statAmber: { bg: '#FFFBEB', color: '#D97706' },
} as const;

// Icon colour cycling for list rows (matches the card avatar colours)
export const ROW_THEMES = [
  { bg: '#FFF7ED', color: '#EA580C' },
  { bg: '#F3E8FF', color: '#9333EA' },
  { bg: '#EFF6FF', color: '#2563EB' },
  { bg: '#FEF9C3', color: '#CA8A04' },
  { bg: '#DCFCE7', color: '#16A34A' },
] as const;